import { useParams } from "react-router-dom"; 
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";

export default function DetailPiutang() {
  const { id } = useParams();

  const [data, setData] = useState([]);
  const [header, setHeader] = useState(null);

  const [bukuList, setBukuList] = useState([]);
  const [kategori, setKategori] = useState([]);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    nama: "",
    nominal: "",
    tanggal_tempo: null,
  });
  const [editId, setEditId] = useState(null);

  const [useTempo, setUseTempo] = useState(false);

  // ✅ LOAD DATA AWAL
    useEffect(() => {
        fetchData();
    }, []);
  
  // ✅ HANDLE KATEGORI EDIT
  useEffect(() => {
    if (!modal) return;
  
    if (modal === "Edit" && form.catatKas) {
      const ex = data.find(x => x.id === editId);
      if (!ex) return;
  
      const tipe = ex.nominal < 0 ? 2 : 1;
      fetchKategori(tipe);
    }
  }, [modal, editId, form.catatKas]);

  function formatDate(val) {
    const d = new Date(val);
  
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = String(d.getUTCFullYear()).slice(2);
    const hour = String(d.getUTCHours()).padStart(2, "0");
    const minute = String(d.getUTCMinutes()).padStart(2, "0");
  
    return `${day}/${month}/${year}, ${hour}:${minute}`;
  }

  async function fetchData() {
    const user = (await supabase.auth.getUser()).data.user;

    const { data: head } = await supabase
      .from("tbl_utang_piutang")
      .select("*")
      .eq("id_utang_piutang", id)
      .single();

    setHeader(head);

    const { data: trx } = await supabase
      .from("tbl_transaksi_utang_piutang")
      .select("*")
      .eq("id_utang_piutang", id)
      .order("tanggal", { ascending: true });

    setData(trx || []);

    const { data: buku } = await supabase
      .from("tbl_buku")
      .select("*")
      .eq("id_user", user.id);

    setBukuList(buku || []);
  }
  
  async function updateStatus() {
    const { data: trx } = await supabase
      .from("tbl_transaksi_utang_piutang")
      .select("nominal")
      .eq("id_utang_piutang", id);
  
    const saldo = (trx || []).reduce((a, b) => a + (b.nominal * -1), 0);
  
    let status = "Belum Lunas";
    let tanggal_tempo = header?.tanggal_tempo || null;
  
    if (saldo === 0) {
      status = "Lunas";
      tanggal_tempo = null; // 🔥 hapus jatuh tempo kalau sudah lunas
    }
  
    await supabase
      .from("tbl_utang_piutang")
      .update({
        status,
        tanggal_tempo
      })
      .eq("id_utang_piutang", id);
  }

  async function fetchKategori(tipe) {
    if (tipe !== 1 && tipe !== 2) {
      console.error("❌ tipe INVALID:", tipe);
      setKategori([]);
      return;
    }
  
    const { data, error } = await supabase
      .from("tbl_kategori")
      .select("*")
      .eq("id_tipe_transaksi", tipe);
  
    if (error) {
      console.error("Kategori error:", error);
      setKategori([]);
      return;
    }
  
    setKategori(data || []);
  }

  const withSaldo = useMemo(() => {
    let saldo = 0;
    return (data || []).map((t) => {
      saldo += t.nominal * -1;
      return { ...t, saldo };
    });
  }, [data]);

  function openModal(type) {
    setModal(type);
    setForm({});
    setEditId(null);
    setUseTempo(false);

    if (type === "Tambah") fetchKategori(2);
    if (type === "Bayar") fetchKategori(1);
  }

  async function openEdit(t) {
    setEditId(t.id);
  
    let formData = {
      tanggal: t.tanggal?.slice(0, 16),
      nominal: Math.abs(t.nominal),
      deskripsi: t.deskripsi,
      catatKas: false,
    };
  
    if (t.id_buku_transaksi) {
      const { data: kas } = await supabase
        .from("tbl_buku_transaksi")
        .select("*")
        .eq("id", t.id_buku_transaksi)
        .single();
  
      if (kas) {
        formData.catatKas = true;
        formData.id_buku = kas.id_buku;
  
        formData.id_kategori = kas.id_kategori;

        // JANGAN fetch manual di sini
        // biarin useEffect yang handle
      }
    }
  
    setForm(formData);
    setModal("Edit");
  }

  async function save() {
    const user = (await supabase.auth.getUser()).data.user;
    let nominal = parseInt(form.nominal || 0);

    let id_tipe_transaksi = 2;
    let tipe = "Pengeluaran";

    if (modal === "Tambah") {
      nominal = -Math.abs(nominal);
      id_tipe_transaksi = 2;
      tipe = "Pengeluaran";
    }

    if (modal === "Bayar") {
      nominal = Math.abs(nominal);
      id_tipe_transaksi = 1;
      tipe = "Pemasukan";
    }

    if (modal === "Edit") {
      const existing = data.find(x => x.id === editId);
      if (existing) {
        id_tipe_transaksi = existing.nominal < 0 ? 2 : 1;
        nominal = existing.nominal < 0
          ? -Math.abs(nominal)
          : Math.abs(nominal);
      }
    }

    if (form.catatKas) {
        const id_buku = parseInt(form.id_buku);
        const id_kategori = parseInt(form.id_kategori);
      
        if (!id_buku || !id_kategori) {
          alert("Buku & Kategori wajib dipilih");
          return;
        }
      
        form.id_buku = id_buku;
        form.id_kategori = id_kategori;
      }

    const existing = data.find(x => x.id === editId);
    let id_buku_transaksi = existing?.id_buku_transaksi || null;

    // 🔥 HANDLE TANGGAL TEMPO (FIX DI SINI)
    let tanggal_tempo = header?.tanggal_tempo || null;

    if (modal === "Tambah") {
      tanggal_tempo = useTempo ? form.tanggal_tempo : null;
    }
    

    // 🔥 HANDLE KAS
    if (form.catatKas) {

      if (modal === "Edit" && existing?.id_buku_transaksi) {

        const { error } = await supabase
          .from("tbl_buku_transaksi")
          .update({
            id_buku: form.id_buku,
            id_kategori: form.id_kategori,
            tipe: tipe,
            nominal: parseInt(Math.abs(nominal)),
            deskripsi: form.deskripsi,
            tanggal: form.tanggal,
          })
          .eq("id", existing.id_buku_transaksi);

          if (error) {
            console.error("❌ UPDATE KAS ERROR:", error);
            alert(error.message);
            return;
          }

        id_buku_transaksi = existing.id_buku_transaksi;

      } else {

        const { data: trxKas, error } = await supabase
          .from("tbl_buku_transaksi")
          .insert([{
            id_buku: form.id_buku,
            id_kategori: form.id_kategori,
            tipe: tipe,
            nominal: parseInt(Math.abs(nominal)),
            deskripsi: form.deskripsi,
            tanggal: form.tanggal,
          }])
          .select()
          .single();

          if (error) {
            console.error("❌ INSERT KAS ERROR:", error);
            alert(error.message);
            return;
          }

        id_buku_transaksi = trxKas?.id || null;
      }

    } else {
      if (modal === "Edit" && existing?.id_buku_transaksi) {
        await supabase
          .from("tbl_buku_transaksi")
          .update({ is_hidden: true })
          .eq("id", existing.id_buku_transaksi);
      }
    }

    // 🔥 SIMPAN UTAMA
    if (modal === "Edit") {
        await supabase
        .from("tbl_transaksi_utang_piutang")
        .update({
          tanggal: form.tanggal,
          nominal,
          deskripsi: form.deskripsi,
          id_tipe_transaksi,
          id_buku_transaksi, // 🔥 WAJIB ADA
        })
        .eq("id", editId);
    } else {
      await supabase.from("tbl_transaksi_utang_piutang").insert([{
        id_utang_piutang: id,
        id_buku_transaksi,
        tanggal: form.tanggal,
        nominal,
        deskripsi: form.deskripsi,
        id_tipe_transaksi,
      }]);
    }

    // 🔥 UPDATE HEADER TEMPO
    if (modal === "Tambah") {
      await supabase
        .from("tbl_utang_piutang")
        .update({
          tanggal_tempo: tanggal_tempo
        })
        .eq("id_utang_piutang", id);
    }

    setModal(null);
    setForm({});
    setEditId(null);
    await updateStatus();
    fetchData();
    setUseTempo(false);
  }

  async function handleDelete(item) {
    if (!confirm("Yakin hapus?")) return;

    await supabase
      .from("tbl_transaksi_utang_piutang")
      .delete()
      .eq("id", item.id);

    if (item.id_buku_transaksi) {
      await supabase
        .from("tbl_buku_transaksi")
        .update({ is_hidden: true })
        .eq("id", item.id_buku_transaksi);
    }
    await updateStatus();
    fetchData();
  }

  return (
    <div>

      <div style={styles.summaryGrid}>
        <Card title="Klien" plain value={header?.klien || "-"} />
        <Card title="Saldo Awal" value={withSaldo[0]?.saldo || 0} />
        <Card title="Saldo Akhir" value={withSaldo.at(-1)?.saldo || 0} />
        {header?.tanggal_tempo && (
          <Card title="Jatuh Tempo" plain value={formatDate(header.tanggal_tempo)} />
        )}
      </div>

      <div style={styles.filterRow}>
        <button style={styles.btnSuccess} onClick={() => openModal("Bayar")}>
          Piutang Dibayar
        </button>

        <button style={styles.btnPrimary} onClick={() => openModal("Tambah")}>
          Tambah Piutang
        </button>
      </div>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tipe</th>
              <th style={styles.th}>Tanggal</th>
              <th style={styles.th}>Nominal</th>
              <th style={styles.th}>Deskripsi</th>
              <th style={styles.th}>Saldo</th>
              <th style={styles.th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {withSaldo.map((t, i) => (
              <tr key={t.id}>
                <td style={styles.td}>
                  {i === 0 ? "Awal" : t.nominal < 0 ? "Tambah" : "Dibayar"}
                </td>

                <td style={styles.td}>{formatDate(t.tanggal)}</td>

                <td style={styles.td}>
                  Rp {t.nominal.toLocaleString()}
                </td>

                <td style={styles.td}>{t.deskripsi || "-"}</td>

                <td style={styles.td}>
                  Rp {t.saldo.toLocaleString()}
                </td>

                <td style={styles.td}>
                  
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <button style={styles.btnPrimary} onClick={() => openEdit(t)}>
                      Edit
                    </button>

                    {i !== 0 && (
                      <button style={styles.btnDanger} onClick={() => handleDelete(t)}>
                        Hapus
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h3>{modal}</h3>

            <input style={styles.input} type="datetime-local"
              value={form.tanggal || ""}
              onChange={e => setForm({ ...form, tanggal: e.target.value })}
            />

            {modal === "Tambah" && (
              <>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={useTempo}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseTempo(checked);

                      if (!checked) {
                        setForm({ ...form, tanggal_tempo: null });
                      }
                    }}
                  />
                  Pakai Tanggal Tempo
                </label>

                {useTempo && (
                  <input
                    style={styles.input}
                    type="date"
                    value={form.tanggal_tempo || ""}
                    onChange={(e) =>
                      setForm({ ...form, tanggal_tempo: e.target.value })
                    }
                  />
                )}
              </>
            )}

            <input style={styles.input} type="number"
              placeholder="Nominal"
              value={form.nominal || ""}
              onChange={e => setForm({ ...form, nominal: e.target.value })}
            />

            <textarea style={styles.input}
              placeholder="Deskripsi"
              value={form.deskripsi || ""}
              onChange={e => setForm({ ...form, deskripsi: e.target.value })}
            />

            <label>
            <input type="checkbox"
                checked={form.catatKas || false}
                onChange={async e => {
                    const checked = e.target.checked;

                    setForm({ ...form, catatKas: checked });

                    if (checked) {
                    let tipe = 2;

                    if (modal === "Bayar") tipe = 1;

                    if (modal === "Edit") {
                        const ex = data.find(x => x.id === editId);
                      
                        if (!ex) {
                          console.error("❌ editId belum siap:", editId);
                          return;
                        }
                      
                        tipe = ex.nominal < 0 ? 2 : 1;
                      }
                      
                      if (!tipe) {
                        console.error("❌ tipe gagal ditentukan");
                        return;
                      }

                      if (checked) {
                        fetchKategori(tipe);
                      }
                    }
                }}
                />
               Catat ke Buku Kas
            </label>

            {form.catatKas && (
              <>
                <select style={styles.input}
                  value={form.id_buku || ""}
                  onChange={e => setForm({ ...form, id_buku: e.target.value })}
                >
                  <option value="">Pilih Buku</option>
                  {bukuList.map(b => (
                    <option key={b.id_buku} value={b.id_buku}>{b.nama}</option>
                  ))}
                </select>

                <select
                style={styles.input}
                value={form.id_kategori || ""}
                onChange={e =>
                    setForm({ ...form, id_kategori: parseInt(e.target.value) })
                }
                >
                  <option value="">Pilih Kategori</option>
                  {kategori.map(k => (
                    <option key={k.id_kategori} value={k.id_kategori}>
                      {k.nama_kategori}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button style={styles.btnPrimary} onClick={save}>Simpan</button>
              <button style={styles.btnDanger} onClick={() => setModal(null)}>Batal</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function Card({ title, value, plain }) {
  return (
    <div style={styles.card}>
      <h4 style={{ fontSize: 12, marginBottom: 4 }}>{title}</h4>
      {plain
        ? <h3 style={{ fontSize: 16 }}>{value}</h3>
        : <h3 style={{ fontSize: 16 }}>Rp {Number(value || 0).toLocaleString()}</h3>
      }
    </div>
  );
}

const styles = {
  th: { textAlign: "center", padding: 8, fontSize: 12 },
  td: { textAlign: "center", padding: 8, fontSize: 12 },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    marginBottom: 20,
  },

  card: {
    background: "#fff",
    padding: 14,
    borderRadius: 12,
  },

  filterRow: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },

  tableCard: {
    background: "#fff",
    padding: 12,
    borderRadius: 12,
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  input: {
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#222",
    color: "#fff",
  },

  btnPrimary: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    fontSize: 12,
  },
  
  btnDanger: {
    background: "#d32f2f",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    fontSize: 12,
  },

  btnSuccess: {
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    fontSize: 12,
  },

  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.3)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    width: "90%",
    maxWidth: 400,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
};