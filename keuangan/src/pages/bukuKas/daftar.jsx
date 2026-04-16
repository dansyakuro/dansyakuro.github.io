import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function DaftarBuku() {
  const [buku, setBuku] = useState([]);
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nama: "", saldo_awal: "", deskripsi: "" });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const user = (await supabase.auth.getUser()).data.user;
  
    // ✅ buku
    const { data: bukuData } = await supabase
      .from("tbl_buku")
      .select("*")
      .eq("id_user", user.id);
  
    if (!bukuData) return;
  
    // ✅ ambil transaksi yang BENAR
    const { data: trx } = await supabase
    .from("tbl_buku_transaksi")
    .from("tbl_buku_transaksi")
    .select(`
      id_buku,
      nominal,
      tbl_transaksi_utang_piutang (
        id_tipe_transaksi
      )
    `)
    .eq("id_user", user.id)
    .eq("is_hidden", false);
  
    const map = {};
  
    trx?.forEach((t) => {
      if (t.is_hidden) return; // 🔥 skip yg dihapus
  
      if (!map[t.id_buku]) {
        map[t.id_buku] = { masuk: 0, keluar: 0 };
      }
  
      if (t.id_tipe_transaksi === 1) {
        map[t.id_buku].masuk += t.nominal;
      }
  
      if (t.id_tipe_transaksi === 2) {
        map[t.id_buku].keluar += t.nominal;
      }
    });
  
    const final = bukuData.map((b) => {
      const masuk = map[b.id_buku]?.masuk || 0;
      const keluar = map[b.id_buku]?.keluar || 0;
  
      const saldo_akhir =
        parseInt(b.saldo_awal || 0) + masuk - keluar;
  
      return { ...b, masuk, keluar, saldo_akhir };
    });
  
    // sort tetap
    final.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return a.nama.localeCompare(b.nama);
    });
  
    setBuku(final);
  };
  

  const openAdd = () => {
    setEditId(null);
    setForm({ nama: "", saldo_awal: "", deskripsi: "" });
    setShow(true);
  };

  const openEdit = (b) => {
    setEditId(b.id_buku);
    setForm({
      nama: b.nama,
      saldo_awal: b.saldo_awal,
      deskripsi: b.deskripsi,
    });
    setShow(true);
  };

  const save = async () => {
    const user = (await supabase.auth.getUser()).data.user;

    if (!form.nama) return alert("Nama buku wajib diisi");

    if (editId) {
      await supabase
        .from("tbl_buku")
        .update({
          nama: form.nama,
          saldo_awal: parseInt(form.saldo_awal || 0),
          deskripsi: form.deskripsi,
        })
        .eq("id_buku", editId);
    } else {
      await supabase.from("tbl_buku").insert([
        {
          id_user: user.id,
          nama: form.nama,
          saldo_awal: parseInt(form.saldo_awal || 0),
          deskripsi: form.deskripsi,
          created_at: new Date(),
        },
      ]);
    }

    setShow(false);
    load();
  };

  const del = async (id) => {
    if (!confirm("Hapus buku ini?")) return;
  
    const { error } = await supabase
      .from("tbl_buku")
      .delete()
      .eq("id_buku", id);
  
    if (error) {
      alert("Gagal hapus: " + error.message);
      return;
    }
  
    load();
  };
  

  const setDefault = async (id) => {
    const user = (await supabase.auth.getUser()).data.user;

    await supabase
      .from("tbl_buku")
      .update({ is_default: false })
      .eq("id_user", user.id);

    await supabase
      .from("tbl_buku")
      .update({ is_default: true })
      .eq("id_buku", id);

    load();
  };

  return (
    <div>

      {/* HEADER */}
      <div style={styles.header}>
        <h2>Daftar Buku</h2>
        <button style={styles.btnPrimary} onClick={openAdd}>
          + Buat Buku Kas
        </button>
      </div>

      <div style={styles.divider} />

      {/* GRID */}
      <div style={styles.grid}>
      {buku.map((b) => {
          const total = (b.masuk || 0) + (b.keluar || 0);
          const persenMasuk = total ? (b.masuk / total) * 100 : 0;

          return (
            <div key={b.id_buku} style={styles.card}>

              <h3>{b.nama}</h3>
              <small>{b.deskripsi}</small>

              {/* DONUT */}
            <div style={{ marginTop: 10, textAlign: "center" }}>
                <div
                    style={{
                    width: 70,
                    height: 70,
                    borderRadius: "50%",
                    margin: "auto",
                    background: `conic-gradient(
                      #4caf50 0% ${persenMasuk}%,
                      #f44336 ${persenMasuk}% 100%
                    )`,
                    }}
                />

                {/* LEGEND */}
                <div style={{ fontSize: 12, marginTop: 6 }}>
                    <span style={{ color: "#4caf50" }}>● Pemasukan</span>
                    {"  "}
                    <span style={{ color: "#f44336" }}>● Pengeluaran</span>
                </div>
            </div>

            <div style={styles.saldoBox}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                        <small style={styles.label}>Saldo Awal</small>
                        <div style={styles.money}>
                            Rp {Number(b.saldo_awal).toLocaleString()}
                        </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                        <small style={styles.label}>Saldo Akhir</small>
                        <div style={styles.money}>
                            Rp {Number(b.saldo_akhir).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

              {/* BUTTONS */}
              <div style={styles.btnRow}>
                <button style={styles.btnEdit} onClick={() => openEdit(b)}>
                  Edit
                </button>

                {!b.is_default && (
                  <>
                    <button style={styles.btnDelete} onClick={() => del(b.id_buku)}>
                      Delete
                    </button>

                    <button style={styles.btnDefault} onClick={() => setDefault(b.id_buku)}>
                      Set Default
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {show && (
        <div style={styles.modal}>
          <div style={styles.box}>
            <h3>{editId ? "Edit Buku" : "Buat Buku Kas"}</h3>

            <input
              style={styles.input}
              placeholder="Nama Buku"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
            />

            <input
              style={styles.input}
              placeholder="Saldo Awal"
              value={form.saldo_awal}
              onChange={(e) => setForm({ ...form, saldo_awal: e.target.value })}
            />

            <textarea
              style={styles.input}
              placeholder="Deskripsi"
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button style={styles.btnPrimary} onClick={save}>
                Simpan
              </button>

              <button style={styles.btnCancel} onClick={() => setShow(false)}>
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
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  divider: {
    borderBottom: "1px solid #ddd",
    marginBottom: 20,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))",
    gap: 20,
  },

  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },

  donutWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 10,
  },

  donut: {
    width: 70,
    height: 70,
    borderRadius: "50%",
    background:
      "conic-gradient(#1976d2 70%, #e0e0e0 0%)",
  },

  saldoRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 12,
  },

  label: {
    fontSize: 12,
    color: "#666",
  },

  btnRow: {
    display: "flex",
    gap: 8,
    marginTop: 15,
  },

  btnPrimary: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
  },

  btnEdit: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
  },

  btnDelete: {
    background: "#d32f2f",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
  },

  btnDefault: {
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
  },

  btnCancel: {
    background: "#d32f2f",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
  },

  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.3)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  box: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    width: 320,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  input: {
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ccc",
    color: "#fff"
  },
};
