import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Kategori() {
  const [pemasukan, setPemasukan] = useState([]);
  const [pengeluaran, setPengeluaran] = useState([]);

  const [modal, setModal] = useState(null); // {tipe:1/2, data:null}
  const [nama, setNama] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data } = await supabase
      .from("tbl_kategori")
      .select("*")
      .order("id_kategori", { ascending: true });

    setPemasukan(data?.filter(d => d.id_tipe_transaksi === 1) || []);
    setPengeluaran(data?.filter(d => d.id_tipe_transaksi === 2) || []);
  }

  async function save() {
    const user = (await supabase.auth.getUser()).data.user;

    if (!nama) return alert("Nama kategori wajib diisi");

    if (modal.data) {
      // UPDATE
      const { error } = await supabase
        .from("tbl_kategori")
        .update({ nama_kategori: nama })
        .eq("id_kategori", modal.data.id_kategori);

      if (error) return alert(error.message);
    } else {
      // INSERT
      const { error } = await supabase.from("tbl_kategori").insert([
        {
          id_user: user.id,
          nama_kategori: nama,
          id_tipe_transaksi: modal.tipe,
        },
      ]);

      if (error) return alert(error.message);
    }

    setModal(null);
    setNama("");
    fetchData();
  }

  async function hapus(id) {
    if (!confirm("Yakin hapus?")) return;

    const { error } = await supabase
      .from("tbl_kategori")
      .delete()
      .eq("id_kategori", id);

    if (error) return alert(error.message);

    fetchData();
  }

  function openModal(tipe, data = null) {
    setModal({ tipe, data });
    setNama(data?.nama_kategori || "");
  }

  return (
    <div style={styles.container}>
      <h2>Manajemen Kategori</h2>

      <div style={styles.grid}>
        {/* ===== PEMASUKAN ===== */}
        <div style={styles.card}>
          <div style={styles.header}>
            <h3>Pemasukan</h3>
            <button
              style={styles.btnSuccess}
              onClick={() => openModal(1)}
            >
              + Tambah
            </button>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nama</th>
                <th style={styles.th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pemasukan.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan="2">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                pemasukan.map(k => (
                  <tr key={k.id_kategori}>
                    <td style={styles.td}>{k.nama_kategori}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.btnPrimary}
                        onClick={() => openModal(1, k)}
                      >
                        Edit
                      </button>
                      <button
                        style={styles.btnDanger}
                        onClick={() => hapus(k.id_kategori)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ===== PENGELUARAN ===== */}
        <div style={styles.card}>
          <div style={styles.header}>
            <h3>Pengeluaran</h3>
            <button
              style={styles.btnSuccess} // ✅ sekarang hijau juga
              onClick={() => openModal(2)}
            >
              + Tambah
            </button>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nama</th>
                <th style={styles.th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pengeluaran.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan="2">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                pengeluaran.map(k => (
                  <tr key={k.id_kategori}>
                    <td style={styles.td}>{k.nama_kategori}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.btnPrimary}
                        onClick={() => openModal(2, k)}
                      >
                        Edit
                      </button>
                      <button
                        style={styles.btnDanger}
                        onClick={() => hapus(k.id_kategori)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {modal && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h3>
              {modal.data ? "Edit" : "Tambah"}{" "}
              {modal.tipe === 1 ? "Pemasukan" : "Pengeluaran"}
            </h3>

            <input
              style={styles.input}
              placeholder="Nama Kategori"
              value={nama}
              onChange={e => setNama(e.target.value)}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button style={styles.btnPrimary} onClick={save}>
                Simpan
              </button>
              <button
                style={styles.btnDanger}
                onClick={() => setModal(null)}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },

  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "10px",
    borderBottom: "2px solid #ddd",
  },

  td: {
    padding: "10px",
    borderBottom: "1px solid #eee",
  },

  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #444",
    background: "#222",
    color: "#fff", // ✅ font putih
  },

  btnPrimary: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
    marginRight: 5,
  },

  btnSuccess: {
    background: "#2e7d32", // ✅ semua tambah hijau
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },

  btnDanger: {
    background: "#d32f2f",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
    marginRight: 5,
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
    padding: 20,
    borderRadius: 12,
    width: 300,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
};