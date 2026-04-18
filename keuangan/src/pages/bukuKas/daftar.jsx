import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function DaftarBuku() {
  const [buku, setBuku] = useState([]);
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nama: "", saldo_awal: "", deskripsi: "" });

  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) return;

    // buku
    const { data: bukuData, error: bukuErr } = await supabase
      .from("tbl_buku")
      .select("*")
      .eq("id_user", user.id);

    if (bukuErr) {
      console.error("buku error:", bukuErr);
      return;
    }

    // transaksi (FIX FINAL - TANPA RELASI)
    const { data: trx, error: trxErr } = await supabase
      .from("tbl_buku_transaksi")
      .select(`
        id_buku,
        nominal,
        tipe
      `) // ⬅️ GANTI INI kalau nama kolom beda
      .eq("is_hidden", false);

    if (trxErr) {
      console.error("trx error:", trxErr);
      return;
    }

    const map = {};

    trx?.forEach((t) => {
      if (!t.id_buku) return;

      const tipe = t.tipe; // ⬅️ SESUAIKAN NAMA KOLOM
      const nilai = Number(t.nominal || 0);

      if (!map[t.id_buku]) {
        map[t.id_buku] = { masuk: 0, keluar: 0 };
      }

      if (tipe === "Pemasukan") {
        map[t.id_buku].masuk += nilai;
      } else if (tipe === "Pengeluaran") {
        map[t.id_buku].keluar += nilai;
      }
    });

    const final = bukuData.map((b) => {
      const masuk = map[b.id_buku]?.masuk || 0;
      const keluar = map[b.id_buku]?.keluar || 0;

      return {
        ...b,
        masuk,
        keluar,
        saldo_akhir: Number(b.saldo_awal || 0) + masuk - keluar,
      };
    });

    final.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return (a.nama || "").localeCompare(b.nama || "");
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

      <div
        style={{
          ...styles.header,
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? 10 : 0,
        }}
      >
        <h2>Daftar Buku</h2>
        <button style={styles.btnPrimary} onClick={openAdd}>
          + Buat Buku Kas
        </button>
      </div>

      <div
        style={{
          ...styles.divider,
          maxWidth: isMobile ? 420 : "100%",
          margin: isMobile ? "0 auto 20px" : "0 0 20px",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "repeat(auto-fill, minmax(260px,1fr))",
          gap: isMobile ? 12 : 20,
        }}
      >
        {buku.map((b) => {
          const total = (b.masuk || 0) + (b.keluar || 0);

          const persenMasuk = total ? (b.masuk / total) * 100 : 0;
          const persenKeluar = total ? (b.keluar / total) * 100 : 0;

          return (
            <div
              key={b.id_buku}
              style={{
                ...styles.card,
                padding: isMobile ? 14 : 20,
              }}
            >

              <h3 style={{ fontSize: isMobile ? 16 : 18 }}>{b.nama}</h3>
              <small style={{ fontSize: isMobile ? 12 : 13 }}>{b.deskripsi}</small>

              <div style={{ marginTop: 10, textAlign: "center" }}>
              <div
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();

                    const cx = rect.width / 2;
                    const cy = rect.height / 2;

                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const dx = x - cx;
                    const dy = y - cy;

                    let angle = Math.atan2(dy, dx) * (180 / Math.PI);

                    angle = (angle + 360 + 90) % 360; 
                    // +90 biar start dari atas (sesuai conic-gradient default)

                    const batasMasuk = persenMasuk; // karena gradient dari 0 → persenMasuk

                    const isMasuk = angle <= batasMasuk;

                    const text = isMasuk
                      ? `Pemasukan: ${persenMasuk.toFixed(1)}% (Rp ${b.masuk.toLocaleString()})`
                      : `Pengeluaran: ${persenKeluar.toFixed(1)}% (Rp ${b.keluar.toLocaleString()})`;

                    e.currentTarget.title = text;
                  }}
                  style={{
                    width: isMobile ? 60 : 70,
                    height: isMobile ? 60 : 70,
                    borderRadius: "50%",
                    margin: "auto",
                    cursor: "pointer",
                    background: `conic-gradient(
                      #4caf50 0% ${persenMasuk}%,
                      #f44336 ${persenMasuk}% 100%
                    )`,
                  }}
                />

                <div style={{ fontSize: 12, marginTop: 6 }}>
                  <span style={{ color: "#4caf50" }}>● Pemasukan</span>{" "}
                  <span style={{ color: "#f44336" }}>● Pengeluaran</span>
                </div>
              </div>

              <div style={{ fontSize: 11, marginTop: 6 }}>
                <div>📈 {persenMasuk.toFixed(1)}% (Rp {b.masuk.toLocaleString()})</div>
                <div>📉 {persenKeluar.toFixed(1)}% (Rp {b.keluar.toLocaleString()})</div>
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

              <div
                style={{
                  ...styles.btnRow,
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
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

      {show && (
          <div style={styles.modal}>
            <div
              style={{
                ...styles.box,
                width: isMobile ? "90%" : 320,
                maxHeight: isMobile ? "90vh" : "auto",
                overflowY: "auto",
              }}
            >
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
    width: "100%",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))",
    gap: 20,
  },
  card: {
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    width: "100%",   // ✅ penting
    maxWidth: "100%", // ✅ biar ikut grid
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
    zIndex: 999, // 🔥 penting kalau ketutup element lain
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