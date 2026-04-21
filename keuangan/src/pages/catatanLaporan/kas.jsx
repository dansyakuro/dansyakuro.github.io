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
        tbl_kategori!inner(nama_kategori, id_kategori)
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

  return (
    <div style={{ padding: 20 }}>

      {/* 🔥 FILTER */}
      <div style={styles.filter}>
        <input
          type="date"
          style={styles.input}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <span>s/d</span>

        <input
          type="date"
          style={styles.input}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {/* 🔥 FILTER KATEGORI */}
      <div style={{ marginBottom: 15 }}>
        <strong>Filter Kategori:</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
          {Object.keys(checkedKategori).map((id) => {
            const nama = data.find(
              (d) => d.tbl_kategori.id_kategori == id
            )?.tbl_kategori.nama_kategori;

            return (
              <label key={id} style={{ display: "flex", gap: 5 }}>
                <input
                  type="checkbox"
                  checked={checkedKategori[id]}
                  onChange={() => toggleKategori(id)}
                />
                {nama}
              </label>
            );
          })}
        </div>
      </div>

      <div style={styles.saldoBox}>
        <div>Saldo Awal: <b>{format(saldoAwal)}</b></div>
        <div>
          <strong>Selisih:</strong>{" "}
          <span style={{ color: selisih >= 0 ? "green" : "red" }}>
            {format(selisih)}
          </span>
        </div>
        <div>Saldo Akhir: <b>{format(saldoAkhir)}</b></div>
      </div>

      {/* 📖 LAPORAN */}
      <div style={styles.book}>

        <h2 style={styles.title}>Laporan Kas</h2>

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
function getStartMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function getEndMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0))
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
};