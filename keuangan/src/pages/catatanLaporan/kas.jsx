import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Kas() {
  const [data, setData] = useState([]);

  const [startDate, setStartDate] = useState(getStartMonth());
  const [endDate, setEndDate] = useState(getEndMonth());

  const [pemasukan, setPemasukan] = useState([]);
  const [pengeluaran, setPengeluaran] = useState([]);

  const [checkedKategori, setCheckedKategori] = useState({});

  const [saldoAwal, setSaldoAwal] = useState(0);
  const [saldoAkhir, setSaldoAkhir] = useState(0);
  const [selisih, setSelisih] = useState(0);

  const [mode, setMode] = useState("pilihan"); // pilihan | harian | custom
  const [kategoriPilihan, setKategoriPilihan] = useState(null);
  const [loadingPilihan, setLoadingPilihan] = useState(false);
  const [listTanggal, setListTanggal] = useState([]);
  const [indexTanggal, setIndexTanggal] = useState(0);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showKategori, setKategori] = useState(false);
  const [showSaldoAwal, setShowSaldoAwal] = useState(false);
  const [showSaldoAkhir, setShowSaldoAkhir] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchData();
    fetchSaldoAwal();
  }, [startDate, endDate]);

  useEffect(() => {
    setSelisih((saldoAkhir || 0) - (saldoAwal || 0));
  }, [saldoAwal, saldoAkhir]);
  
  useEffect(() => {
    const filtered = data.filter((t) => {
      const id = t.tbl_kategori?.id_kategori;
      return checkedKategori[id];
    });
  
    processData(filtered);
  }, [checkedKategori, data]);

  useEffect(() => {
    const totalRange = data.reduce((acc, t) => {
      if (!checkedKategori[t.tbl_kategori?.id_kategori]) return acc;
  
      return t.tipe === "Pemasukan"
        ? acc + t.nominal
        : acc - t.nominal;
    }, 0);
  
    setSaldoAkhir(saldoAwal + totalRange);
  }, [data, checkedKategori, saldoAwal]);

  useEffect(() => {
    initProfile();
  }, []);

  useEffect(() => {
    if (mode === "pilihan" && kategoriPilihan) {
      setTanggalDariKategori(kategoriPilihan);
    }
  }, [mode, kategoriPilihan]);
  
  async function initProfile() {
    const user = (await supabase.auth.getUser()).data.user;
  
    const { data } = await supabase
      .from("tbl_profil")
      .select("pemasukan_pilihan")
      .eq("id", user.id)
      .single();
  
    if (data?.pemasukan_pilihan) {
      setKategoriPilihan(data.pemasukan_pilihan);
    } else {
      setMode("custom");
    }
  }

  async function setTanggalDariKategori(idKategori) {
    setLoadingPilihan(true);
  
    const { data, error } = await supabase
      .from("tbl_buku_transaksi")
      .select("tanggal")
      .eq("id_kategori", Number(idKategori))
      .eq("is_hidden", false)
      .order("tanggal", { ascending: false });
  
    if (error) {
      console.error(error);
      return;
    }
  
    if (!data?.length) {
      setStartDate(getStartMonth());
      setEndDate(getEndMonth());
      return;
    }
  
    const list = data.map(d =>
      new Date(d.tanggal).toISOString().slice(0, 10)
    );
  
    setListTanggal(list);
    setIndexTanggal(0); // default paling baru
  
    applyTanggal(list, 0);
  
    setLoadingPilihan(false);
  }

  function applyTanggal(list, index) {
    const start = list[index];
  
    let end;
  
    if (index === 0) {
      end = new Date().toISOString().slice(0, 10);
    } else {
      const prev = new Date(list[index - 1]);
      prev.setDate(prev.getDate() - 1);
      end = prev.toISOString().slice(0, 10);
    }
  
    setStartDate(start);
    setEndDate(end);
  }

  function changeMode(val) {
    setMode(val);
  
    if (val === "harian") {
      const t = new Date().toISOString().slice(0, 10);
      setStartDate(t);
      setEndDate(t);
    }
  
    if (val === "custom") {
      setStartDate(getStartMonth());
      setEndDate(getEndMonth());
    }
  
    if (val === "pilihan") {
      if (kategoriPilihan) {
        setTanggalDariKategori(kategoriPilihan);
      } else {
        console.warn("kategoriPilihan belum ada");
      }
    }
  }

  function prev() {
    if (mode === "pilihan") {
      const nextIndex = indexTanggal + 1;
  
      if (nextIndex >= listTanggal.length) return;
  
      setIndexTanggal(nextIndex);
      applyTanggal(listTanggal, nextIndex);
    }
  
    // tetap jalanin mode lain
    if (mode === "harian") {
      const d = new Date(startDate);
      d.setDate(d.getDate() - 1);
      const t = d.toISOString().slice(0, 10);
      setStartDate(t);
      setEndDate(t);
    }
  
    if (mode === "custom") {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() - 1);
      setStartDate(getStartMonth(d));
      setEndDate(getEndMonth(d));
    }
  }
  
  function next() {
    if (mode === "pilihan") {
      const nextIndex = indexTanggal - 1;
  
      if (nextIndex < 0) return;
  
      setIndexTanggal(nextIndex);
      applyTanggal(listTanggal, nextIndex);
    }
  
    if (mode === "harian") {
      const d = new Date(startDate);
      d.setDate(d.getDate() + 1);
      const t = d.toISOString().slice(0, 10);
      setStartDate(t);
      setEndDate(t);
    }
  
    if (mode === "custom") {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + 1);
      setStartDate(getStartMonth(d));
      setEndDate(getEndMonth(d));
    }
  }

  async function fetchSaldoAwal() {
    // 🔥 saldo awal dari buku
    const { data: buku } = await supabase
      .from("tbl_buku")
      .select("saldo_awal");
  
    let saldoBuku = 0;
    (buku || []).forEach((b) => {
      saldoBuku += b.saldo_awal || 0;
    });
  
    // 🔥 transaksi sebelum periode
    const { data: dataAwal, error } = await supabase
      .from("tbl_buku_transaksi")
      .select("nominal, tipe")
      .lt("tanggal", startDate + "T00:00:00")
      .eq("is_hidden", false);
  
    if (error) {
      console.error(error);
      return;
    }
  
    let transaksi = 0;
  
    (dataAwal || []).forEach((t) => {
      if (t.tipe === "Pemasukan") transaksi += t.nominal;
      else transaksi -= t.nominal;
    });
  
    // 🔥 FINAL
    setSaldoAwal(saldoBuku + transaksi);
  }

  async function fetchData() {
    const { data: data2, error } = await supabase
      .from("tbl_buku_transaksi")
      .select(`
        nominal,
        tipe,
        tanggal,
        tbl_kategori!inner(nama_kategori, id_kategori, id_tipe_transaksi)
      `)
      .gte("tanggal", startDate + "T00:00:00")
      .lte("tanggal", endDate + "T23:59:59")
      .eq("is_hidden", false);
  
    if (error) {
      console.error(error);
      return;
    }
  
    const list = data2 || [];
  
    setData(list);
  
    // 🔥 INIT CHECKBOX (dari data baru, bukan state lama)
    const kategoriMap = {};
    list.forEach((t) => {
      const k = t.tbl_kategori;
      if (k) kategoriMap[k.id_kategori] = true;
    });
  
    setCheckedKategori(kategoriMap);
  
    // 🔥 langsung proses awal (biar ga kosong)
    processData(list);
  }
  
  function toggleKategori(id) {
    setCheckedKategori((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }
  // =========================
  // 🔥 GROUPING DATA
  // =========================
  function processData(list) {
    const pemasukanMap = {};
    const pengeluaranMap = {};

    list.forEach((t) => {
      
      const kategori = t.tbl_kategori.nama_kategori;

      if (t.tipe === "Pemasukan") {
        if (!pemasukanMap[kategori]) pemasukanMap[kategori] = 0;
        pemasukanMap[kategori] += t.nominal;
      } else {
        if (!pengeluaranMap[kategori]) pengeluaranMap[kategori] = 0;
        pengeluaranMap[kategori] += t.nominal;
      }
    });

    setPemasukan(mapToArray(pemasukanMap));
    setPengeluaran(mapToArray(pengeluaranMap));
  }

  function mapToArray(obj) {
    return Object.keys(obj)
      .map((k) => ({
        kategori: k,
        total: obj[k],
      }))
      .sort((a, b) => b.total - a.total); // 🔥 terbesar dulu
  }

  function format(val) {
    return "Rp " + Number(val || 0).toLocaleString();
  }

  function formatTanggal(tgl) {
    if (!tgl) return "-";
    const d = new Date(tgl);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div style={{ padding: 20 }}>

    <div style={styles.filter}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}
      >
        {/* 🔹 KIRI */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: isMobile ? "1 1 100%" : "unset",
          }}
        >
          <select
            value={mode}
            onChange={(e) => changeMode(e.target.value)}
            style={{
              ...styles.input,
              flex: 1,
              minWidth: 0,
            }}
          >
            <option value="custom">Custom</option>
            <option value="harian">Harian</option>
            <option value="pilihan">Pemasukan Pilihan</option>
          </select>

          <button style={styles.btnNav} onClick={prev}>◀</button>
        </div>

        {/* 🔹 KANAN */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: isMobile ? "1 1 100%" : "unset",
            width: isMobile ? "100%" : "auto",
          }}
        >
          {/* DATE RANGE */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flex: 1,
            }}
          >
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ ...styles.input, flex: 1 }}
            />

            <span style={{ whiteSpace: "nowrap" }}>s/d</span>

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ ...styles.input, flex: 1 }}
            />
          </div>

          <button style={styles.btnNav} onClick={next}>▶</button>
        </div>
      </div>

      {/* Loading */}
      {loadingPilihan && (
        <div style={{ fontSize: 13, color: "#888", width: "100%" }}>
          Loading filter...
        </div>
      )}
    </div>

      {/* 🔥 FILTER KATEGORI */}
      <div style={{ marginBottom: 15 }}>
        <strong>Filter Kategori: 
          <b onClick={() => setKategori(!showKategori)} style={{ color: showKategori ? "red" : "green" }}> {showKategori ? "Hide" : "Show"}</b>
        </strong>

        
        {showKategori ? (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 8 }}>

          {/* PEMASUKAN */}
          <div>
            <strong>Pemasukan</strong>
            {data
              .filter((d, i, arr) =>
                d.tbl_kategori &&
                d.tbl_kategori.id_tipe_transaksi === 1 &&
                arr.findIndex(x => x.tbl_kategori.id_kategori === d.tbl_kategori.id_kategori) === i
              )
              .map((d) => {
                const id = d.tbl_kategori.id_kategori;

                return (
                  <label key={id} style={{ display: "flex", gap: 5 }}>
                    <input
                      type="checkbox"
                      checked={checkedKategori[id] ?? true}
                      onChange={() => toggleKategori(id)}
                    />
                    {d.tbl_kategori.nama_kategori}
                  </label>
                );
              })}
          </div>

          {/* PENGELUARAN */}
          <div>
            <strong>Pengeluaran</strong>
            {data
              .filter((d, i, arr) =>
                d.tbl_kategori &&
                d.tbl_kategori.id_tipe_transaksi === 2 &&
                arr.findIndex(x => x.tbl_kategori.id_kategori === d.tbl_kategori.id_kategori) === i
              )
              .map((d) => {
                const id = d.tbl_kategori.id_kategori;

                return (
                  <label key={id} style={{ display: "flex", gap: 5 }}>
                    <input
                      type="checkbox"
                      checked={checkedKategori[id] ?? true}
                      onChange={() => toggleKategori(id)}
                    />
                    {d.tbl_kategori.nama_kategori}
                  </label>
                );
              })}
          </div>

        </div>
        
        ) : ( 
        ""  
        )}
      </div>

      <div style={styles.saldoBox}>
        <div onClick={() => setShowSaldoAwal(!showSaldoAwal)}>Saldo Awal: 
          <b style={{ color: showSaldoAwal ? "black" : "red" }}> {showSaldoAwal ? format(saldoAwal) : "•••"}</b>
        </div>
        <div>
          <strong>Selisih:</strong>{" "}
          <span style={{ color: selisih >= 0 ? "green" : "red" }}>
            {format(selisih)}
          </span>
        </div>
        <div onClick={() => setShowSaldoAkhir(!showSaldoAkhir)}>Saldo Akhir: 
          <b style={{ color: showSaldoAkhir ? "black" : "red" }}> {showSaldoAkhir ? format(saldoAkhir) : "•••"}</b>
        </div>
      </div>

      {/* 📖 LAPORAN */}
      <div style={styles.book}>

        <h2 style={styles.title}>Laporan Kas</h2>
        <div style={styles.dateInfo}>
          {formatTanggal(startDate)} - {formatTanggal(endDate)}
        </div>

        {/* PEMASUKAN */}
        <Section title="Pemasukan" data={pemasukan} />

        {/* PENGELUARAN */}
        <Section title="Pengeluaran" data={pengeluaran} />

      </div>
    </div>
  );
}

// =========================
// 🔥 COMPONENT SECTION
// =========================
function Section({ title, data }) {
  const total = data.reduce((a, b) => a + b.total, 0);

  return (
    <div style={styles.section}>
      <h3>{title}</h3>

      <div style={styles.list}>
        {data.map((d, i) => (
          <div key={i} style={styles.row}>
            <span>{d.kategori}</span>
            <span>{format(d.total)}</span>
          </div>
        ))}
      </div>

      <div style={styles.total}>
        Total {title}: {format(total)}
      </div>
    </div>
  );
}

// =========================
// 🔥 UTIL
// =========================
function getStartMonth(baseDate = new Date()) {
  return new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function getEndMonth(baseDate = new Date()) {
  return new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
}

function format(val) {
  return "Rp " + Number(val || 0).toLocaleString();
}

// =========================
// 🎨 STYLE (BIAR KAYA BUKU)
// =========================
const styles = {
  filter: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    alignItems: "center",
    flexWrap: "wrap", // 🔥 ini cukup
  },
  book: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  title: {
    textAlign: "center",
    marginBottom: 20,
  },

  section: {
    marginBottom: 30,
  },

  list: {
    borderTop: "1px dashed #ccc",
    marginTop: 10,
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    borderBottom: "1px dotted #ddd",
    fontSize: 14,
  },

  total: {
    marginTop: 10,
    fontWeight: "bold",
    textAlign: "right",
  },
  
  input: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    fontSize: 13,
    cursor: "pointer",
    color: "#000"
  },
  saldoBox: {
    marginBottom: 15,
    padding: 10,
    background: "#f8f8f8",
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
  },
  btnNav: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
  dateInfo: {
    textAlign: "center",
    fontSize: 13,
    color: "#666",
    marginBottom: 15,
  },
};