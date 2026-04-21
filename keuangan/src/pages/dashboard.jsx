import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [chartData, setChartData] = useState([]);
  const [totalSaldo, setTotalSaldo] = useState(0);
  const [totalPiutang, setTotalPiutang] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const user = (await supabase.auth.getUser()).data.user;

    // ✅ Ambil buku
    const { data: bukuData } = await supabase
      .from("tbl_buku")
      .select("*")
      .eq("id_user", user.id);

    // ✅ Ambil transaksi buku
    const { data: trx } = await supabase
      .from("tbl_buku_transaksi")
      .select("*")
      .eq("is_hidden", false);

    // ✅ Ambil transaksi piutang (REAL SALDO)
    const { data: trxPiutang } = await supabase
      .from("tbl_transaksi_utang_piutang")
      .select("nominal");

    // =========================
    // 🔥 HITUNG SALDO PER BUKU
    // =========================
    let totalAll = 0;

    const result = (bukuData || []).map((b) => {
      const list = (trx || []).filter(t => t.id_buku === b.id_buku);

      let saldo = b.saldo_awal || 0;

      list.forEach(t => {
        if (t.tipe === "Pemasukan") saldo += t.nominal;
        else saldo -= t.nominal;
      });

      totalAll += saldo;

      return {
        nama: b.nama,
        saldo,
      };
    });

    // =========================
    // 🔥 HITUNG PERSENTASE
    // =========================
    const chart = result.map((r, i) => ({
      ...r,
      persen: totalAll ? ((r.saldo / totalAll) * 100).toFixed(1) : 0,
      color: COLORS[i % COLORS.length],
    }));

    // =========================
    // 🔥 HITUNG TOTAL PIUTANG
    // =========================
    const totalPiutangSaldo = (trxPiutang || []).reduce(
      (a, b) => a + (b.nominal * -1),
      0
    );

    // =========================
    // 🔥 SET STATE
    // =========================
    setChartData(chart);
    setTotalSaldo(totalAll);
    setTotalPiutang(totalPiutangSaldo);
  }

  return (
    <div>

      {/* 🔥 SUMMARY */}
      <div style={styles.grid}>
        <Card
          title="Total Saldo Semua Buku"
          value={format(totalSaldo)}
        />

        <Card
          title="Total Saldo Piutang"
          value={format(totalPiutang)}
        />
      </div>

      {/* 🔥 CHART */}
      <div style={styles.chartBox}>
        <h3>Total Saldo per Buku</h3>

        <div style={styles.chart}>
          {chartData.map((c, i) => (
            <div key={i} style={{ textAlign: "center" }}>

              {/* BAR */}
              <div
                style={{
                  height: `${c.persen * 2}px`,
                  background: c.color,
                  width: 40,
                  borderRadius: 6,
                  margin: "0 auto",
                }}
              />

              {/* PERSEN */}
              <div style={{ fontSize: 12 }}>{c.persen}%</div>

              {/* NAMA */}
              <div style={{ fontSize: 12 }}>{c.nama}</div>

              {/* NOMINAL (langsung tampil) */}
              <div style={{ fontSize: 11, color: "#777" }}>
                {format(c.saldo)}
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// =========================
// 🔥 COMPONENT CARD
// =========================
function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.title}>{title}</div>
      <div style={styles.value}>{value}</div>
    </div>
  );
}

// =========================
// 🔥 FORMAT RUPIAH
// =========================
function format(val) {
  return "Rp " + Number(val || 0).toLocaleString();
}

// =========================
// 🔥 WARNA CHART
// =========================
const COLORS = [
  "#1976d2",
  "#2e7d32",
  "#ed6c02",
  "#9c27b0",
  "#d32f2f",
];

// =========================
// 🔥 STYLE
// =========================
const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
    gap: 16,
    marginBottom: 20,
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

  chartBox: {
    background: "#fff",
    padding: 16,
    borderRadius: 10,
  },

  chart: {
    display: "flex",
    alignItems: "flex-end",
    gap: 20,
    marginTop: 20,
    overflowX: "auto",
  },
};