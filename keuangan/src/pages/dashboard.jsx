import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [buku, setBuku] = useState([]);

  useEffect(() => {
    loadBuku();
  }, []);

  const loadBuku = async () => {
    const { data } = await supabase.from("tbl_buku").select("*");
    setBuku(data || []);
  };

  return (
    <div style={styles.grid}>
      <Card title="Seluruh Saldo Pemasukan" value="Rp 0" />
      <Card title="Seluruh Saldo Pengeluaran" value="Rp 0" />
      <Card title="Seluruh Saldo Kas" value="Rp 0" />
      <Card title="Seluruh Saldo Piutang" value="Rp 0" />

      {buku.map((b) => (
        <Card key={b.id_buku} title={`Saldo ${b.nama}`} value={`Rp ${b.saldo_awal}`} />
      ))}
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.title}>{title}</div>
      <div style={styles.value}>{value}</div>
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
    gap: 16,
  },

  card: {
    background: "#fff",
    padding: 16,
    borderRadius: 10,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },

  title: {
    fontSize: 13,
    color: "#777",
  },

  value: {
    fontSize: 20,
    fontWeight: 600,
  },
};
