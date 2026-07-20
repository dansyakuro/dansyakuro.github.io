import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [pemasukan, setPemasukan] = useState([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return;

    setUser(data.user);

    await fetchKategori();
    await fetchProfile(data.user.id);
  }

  async function fetchKategori() {
    const { data } = await supabase
      .from("tbl_kategori")
      .select("*")
      .order("nama_kategori", { ascending: true });

    // ambil hanya pemasukan (tipe = 1)
    setPemasukan(data?.filter(d => d.id_tipe_transaksi === 1) || []);
  }

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from("tbl_profil")
      .select("pemasukan_pilihan")
      .eq("id", userId)
      .single();

    if (data) {
      setSelected(data.pemasukan_pilihan || "");
    }
  }

  async function save() {
    if (!user) return;

    const { error } = await supabase
      .from("tbl_profil")
      .upsert({
        id: user.id,
        pemasukan_pilihan: selected || null,
      });

    if (error) return alert(error.message);

    alert("Berhasil disimpan");
  }

  return (
    <div style={styles.container}>
      <h2>Profile</h2>

      <div style={styles.card}>
        <div style={styles.header}>
          <h3>Pemasukan Utama</h3>
        </div>

        <select
          value={selected}
          onChange={(e) => setSelected(parseInt(e.target.value))}
          style={styles.input}
        >
          <option value="">-- Pilih Kategori --</option>
          {pemasukan.map(k => (
            <option key={k.id_kategori} value={k.id_kategori}>
              {k.nama_kategori}
            </option>
          ))}
        </select>

        <button style={styles.btnPrimary} onClick={save}>
          Simpan
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  card: {
    background: "#fff",
    padding: 14,
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    maxWidth: 400,
  },

  header: {
    marginBottom: 10,
  },

  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #444",
    background: "#222",
    color: "#fff",
    width: "100%",
    marginBottom: 12,
  },

  btnPrimary: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  },
};