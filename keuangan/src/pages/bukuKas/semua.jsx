import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";

export default function SemuaBuku() {

  const [ringkasan, setRingkasan] = useState({});
  const [transaksi, setTransaksi] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [bulan, setBulan] = useState("Semua");
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [tipe, setTipe] = useState("Semua");

  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, [bulan, tahun, tipe]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, tipe, bulan, tahun]);

  async function fetchData() {
    const user = (await supabase.auth.getUser()).data.user;

    // 🔥 ambil semua buku
    const { data: bukuList } = await supabase
      .from("tbl_buku")
      .select("*")
      .eq("id_user", user.id);

    // 🔥 ambil semua transaksi + join kategori + buku
    const { data: trx } = await supabase
      .from("tbl_buku_transaksi")
      .select(`
        *,
        tbl_kategori(nama_kategori),
        tbl_buku(nama, saldo_awal)
      `)
      .order("tanggal", { ascending: false });

    setTransaksi(trx || []);

    hitungRingkasan(trx || [], bukuList || []);
  }

  function hitungRingkasan(data, bukuList) {

    const awal =
      bulan === "Semua"
        ? new Date(tahun, 0, 1)
        : new Date(tahun, bulan - 1, 1);

    const akhir =
      bulan === "Semua"
        ? new Date(tahun, 11, 31)
        : new Date(tahun, bulan, 0);

    let saldoAwal = 0;
    let pemasukan = 0;
    let pengeluaran = 0;

    // 🔥 saldo awal = semua saldo awal buku
    bukuList.forEach(b => {
      saldoAwal += Number(b.saldo_awal || 0);
    });

    data.forEach(t => {
      const tgl = new Date(t.tanggal);

      if (tgl < awal) {
        saldoAwal += t.tipe === "Pemasukan" ? t.nominal : -t.nominal;
      }

      if (tgl >= awal && tgl <= akhir) {
        if (t.tipe === "Pemasukan") pemasukan += t.nominal;
        if (t.tipe === "Pengeluaran") pengeluaran += t.nominal;
      }
    });

    const saldoAkhir = saldoAwal + pemasukan - pengeluaran;

    setRingkasan({
      saldo_awal_bulan: saldoAwal,
      saldo_akhir_bulan: saldoAkhir,
      pemasukan_bulanan: pemasukan,
      pengeluaran_bulanan: pengeluaran,
    });
  }

  function formatTanggal(val) {
    const d = new Date(val);

    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = String(d.getUTCFullYear()).slice(2);
    const hour = String(d.getUTCHours()).padStart(2, "0");
    const minute = String(d.getUTCMinutes()).padStart(2, "0");

    return `${day}/${month}/${year}, ${hour}:${minute}`;
  }

  const transaksiWithSaldo = useMemo(() => {
    let saldo = 0;

    return [...transaksi]
      .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
      .map(t => {
        saldo += t.tipe === "Pemasukan" ? t.nominal : -t.nominal;
        return { ...t, saldo_running: saldo };
      })
      .reverse(); // balik lagi biar DESC
  }, [transaksi]);

  const filtered = useMemo(() => {
    return transaksiWithSaldo.filter(t => {
      const tgl = new Date(t.tanggal);

      const matchSearch =
        t.deskripsi?.toLowerCase().includes(search.toLowerCase());

      const matchTipe =
        tipe === "Semua"
          ? true
          : tipe === "Transfer"
          ? t.id_kategori === 1
          : t.tipe === tipe;

      const matchBulan =
        bulan === "Semua"
          ? true
          : tgl.getUTCMonth() + 1 === Number(bulan);

      const matchTahun =
        !tahun ? true : tgl.getUTCFullYear() === Number(tahun);

      return matchSearch && matchTipe && matchBulan && matchTahun;
    });
  }, [transaksiWithSaldo, search, tipe, bulan, tahun]);

  const totalData = filtered.length;
  const totalPages = Math.ceil(totalData / rowsPerPage);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const currentData = filtered.slice(startIndex, endIndex);

  function getPages() {
    const pages = [];

    if (totalPages <= 4) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let start = Math.max(currentPage - 2, 1);
    let end = Math.min(start + 3, totalPages);

    if (end - start < 3) {
      start = end - 3;
    }

    if (start > 1) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) pages.push("...");

    return pages;
  }

  return (
    <div>

      {/* 🔥 SUMMARY (TIDAK DIUBAH) */}
      <div style={styles.summaryGrid}>
        <SummaryCard title="Semua Buku" />
        <SummaryCard title="Saldo Awal Bulan" value={ringkasan?.saldo_awal_bulan} />
        <SummaryCard title="Saldo Akhir Bulan" value={ringkasan?.saldo_akhir_bulan} />
        <SummaryCard title="Pemasukan Bulanan" value={ringkasan?.pemasukan_bulanan} />
        <SummaryCard title="Pengeluaran Bulanan" value={ringkasan?.pengeluaran_bulanan} />
      </div>

      <div style={{ marginBottom: 10, fontSize: 12 }}>
        {totalData > 0
          ? `Menampilkan ${startIndex + 1} - ${Math.min(endIndex, totalData)} dari ${totalData} data`
          : "Tidak ada data"}
      </div>

      {/* 🔥 FILTER */}
      <div style={styles.filterRow}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#aaa" }}>Rows</span>
          <select
            style={styles.input}
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <select style={styles.input} value={tipe} onChange={e => setTipe(e.target.value)}>
          <option>Semua</option>
          <option>Pemasukan</option>
          <option>Pengeluaran</option>
          <option>Transfer</option>
        </select>

        <select style={styles.input} value={bulan} onChange={e => setBulan(e.target.value)}>
          <option value="Semua">Semua Bulan</option>
          {[...Array(12)].map((_, i) => (
            <option key={i} value={i + 1}>{i + 1}</option>
          ))}
        </select>

        <input
          style={styles.input}
          type="number"
          value={tahun}
          onChange={e => setTahun(Number(e.target.value))}
        />

        {/* 🔥 SEARCH DI KANAN */}
        <input
          style={{ ...styles.input, marginLeft: "auto" }}
          placeholder="Cari deskripsi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 🔥 TABLE */}
      <div style={styles.tableCard}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Tipe</th>
                <th style={styles.th}>Nama Buku</th>
                <th style={styles.th}>Tanggal</th>
                <th style={styles.th}>Kategori</th>
                <th style={styles.th}>Deskripsi</th>
                <th style={styles.th}>Pemasukan</th>
                <th style={styles.th}>Pengeluaran</th>
                <th style={styles.th}>Saldo</th>
              </tr>
            </thead>

            <tbody>
              {currentData.map(trx => (
                <tr key={trx.id}>
                  <td style={styles.td}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 12,
                      background:
                        trx.kode_transfer
                          ? "#6a1b9a"
                          : trx.tipe === "Pemasukan"
                          ? "#2e7d32"
                          : "#d32f2f",
                      color: "#fff"
                    }}>
                      {trx.kode_transfer ? "↔" : trx.tipe === "Pemasukan" ? "+" : "-"}
                    </span>
                  </td>

                  <td style={styles.td}>
                    {trx.tbl_buku?.nama || "-"}
                  </td>

                  <td style={styles.td}>{formatTanggal(trx.tanggal)}</td>

                  <td style={styles.td}>
                    {trx.tbl_kategori?.nama_kategori || (trx.id_kategori === 1 ? "Transfer Kas" : "-")}
                  </td>

                  <td style={styles.td}>{trx.deskripsi}</td>

                  <td style={styles.td}>
                    {trx.tipe === "Pemasukan" ? "Rp " + trx.nominal.toLocaleString() : "-"}
                  </td>

                  <td style={styles.td}>
                    {trx.tipe === "Pengeluaran" ? "Rp " + trx.nominal.toLocaleString() : "-"}
                  </td>

                  <td style={styles.td}>
                    Rp {trx.saldo_running.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>

              <button
                style={styles.btnPrimary}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Prev
              </button>

              {getPages().map((p, i) => (
                <button
                  key={i}
                  disabled={p === "..."}
                  onClick={() => p !== "..." && setCurrentPage(p)}
                  style={{
                    ...styles.btnPrimary,
                    background: currentPage === p ? "#555" : "#1976d2",
                    cursor: p === "..." ? "default" : "pointer"
                  }}
                >
                  {p}
                </button>
              ))}

              <button
                style={styles.btnPrimary}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </button>

            </div>
          )}

        </div>
      </div>

    </div>
  );
}

function SummaryCard({ title, value, desc }) {
  return (
    <div style={styles.card}>
      <h4 style={{ margin: 0 }}>{title}</h4>
      {desc && <small>{desc}</small>}
      {value !== undefined && <h3>Rp {Number(value || 0).toLocaleString()}</h3>}
    </div>
  );
}

// 🔥 STYLE (TETAP)
const styles = {
  th: { textAlign: "center", padding: 8, fontSize: 12, whiteSpace: "nowrap" },
  td: { textAlign: "center", padding: 8, fontSize: 12, whiteSpace: "nowrap" },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
    gap: 12,
    marginBottom: 20,
  },

  card: {
    background: "#fff",
    padding: 14,
    borderRadius: 10,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    fontSize: 13
  },

  filterRow: {
    display: "flex",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
    alignItems: "center"
  },

  tableCard: {
    background: "#fff",
    padding: 12,
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: 600,
    borderCollapse: "collapse",
  },

  input: {
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 13,
    minWidth: 90,
    flex: 1,
    color: "#fff",
    background: "#2c2c2c"
  },

  btnPrimary: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
  },
};