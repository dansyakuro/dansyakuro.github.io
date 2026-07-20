import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Piutang() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [bukuList, setBukuList] = useState([]);
  const [kategori, setKategori] = useState([]);

  const [search, setSearch] = useState("");

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [statusFilter, setStatusFilter] = useState("Belum Lunas");

  const [loadingSave, setLoadingSave] = useState(false);

  const [summary, setSummary] = useState({
    total: 0,
    jumlah: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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

    const { data: piutang } = await supabase
      .from("tbl_utang_piutang")
      .select(`
        *,
        tbl_transaksi_utang_piutang(*)
      `)
      .eq("id_user", user.id);

    const clean = (piutang || []).map(p => {
      const trx = (p.tbl_transaksi_utang_piutang || [])
        .filter(t => !t.is_hidden);

      const saldo = trx.reduce((a, b) => a + b.nominal, 0);

      return {
        ...p,
        saldo,
        deskripsi: trx[0]?.deskripsi || "-",
        tanggal: trx[0]?.tanggal || null,
      };
    });
    
    setData(
      clean.sort((a, b) =>
        (a.klien || "").localeCompare(b.klien || "")
      )
    );

    setSummary({
      jumlah: clean.length,
      total: clean.reduce((a, b) => a + b.saldo, 0),
    });

    const { data: buku } = await supabase
      .from("tbl_buku")
      .select("*")
      .eq("id_user", user.id);

    setBukuList(buku || []);

    const { data: kat } = await supabase
      .from("tbl_kategori")
      .select("*")
      .eq("id_user", user.id)
      .eq("id_tipe_transaksi", 2);

    setKategori(kat || []);
  }

  async function save() {
    if (loadingSave) return;
  
    if (!form.nominal || !form.klien) {
      return alert("Klien & Nominal wajib diisi");
    }
  
    setLoadingSave(true);
  
    try {
      const user = (await supabase.auth.getUser()).data.user;

      const tanggal = form.tanggal || new Date().toISOString();
  
      // 1. insert utang/piutang
      const { data: utang, error: errUtang } = await supabase
        .from("tbl_utang_piutang")
        .insert([{
          id_user: user.id,
          status: "Belum Lunas",
          tipe: "Piutang",
          tanggal_tempo: form.pakaiTempo ? form.tanggal_tempo : null,
          klien: form.klien,
        }])
        .select()
        .single();
  
      if (errUtang) throw errUtang;
  
      let id_buku_transaksi = null;
  
      // 2. optional: catat ke kas
      if (form.catatKas) {
        if (!form.id_buku || !form.id_kategori) {
          throw new Error("Buku & kategori wajib diisi jika catat kas");
        }
  
        const { data: trxKas, error: errKas } = await supabase
          .from("tbl_buku_transaksi")
          .insert([{
            id_buku: form.id_buku,
            tipe: "Pengeluaran",
            nominal: parseInt(form.nominal),
            id_kategori: form.id_kategori,
            deskripsi: form.deskripsi,
            tanggal: tanggal,
          }])
          .select()
          .single();
  
        if (errKas) throw errKas;
  
        id_buku_transaksi = trxKas.id;
      }
  
      // 3. insert transaksi utang/piutang
      const { error: errTrx } = await supabase
        .from("tbl_transaksi_utang_piutang")
        .insert([{
          id_utang_piutang: utang.id_utang_piutang,
          id_buku_transaksi,
          id_tipe_transaksi: 1,
          tanggal: tanggal,
          nominal: -parseInt(form.nominal),
          deskripsi: form.deskripsi,
        }]);
  
      if (errTrx) throw errTrx;
  
      // sukses
      setModal(false);
      setForm({});
      fetchData();
  
    } catch (err) {
      console.error(err);
      alert("Gagal simpan: " + err.message);
    } finally {
      setLoadingSave(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Yakin hapus?")) return;

    const { data: trxList } = await supabase
      .from("tbl_transaksi_utang_piutang")
      .select("*")
      .eq("id_utang_piutang", id);

    const bukuIds = trxList
      ?.map(t => t.id_buku_transaksi)
      .filter(Boolean);

    if (bukuIds.length) {
      await supabase
        .from("tbl_buku_transaksi")
        .update({ is_hidden: true })
        .in("id", bukuIds);
    }

    await supabase
      .from("tbl_transaksi_utang_piutang")
      .delete()
      .eq("id_utang_piutang", id);

    await supabase
      .from("tbl_utang_piutang")
      .delete()
      .eq("id_utang_piutang", id);

    fetchData();
  }

  const filtered = useMemo(() => {
    return data.filter(p => {
      const matchSearch =
        (p.klien || "").toLowerCase().includes(search.toLowerCase());
  
      const matchStatus =
        !statusFilter || p.status === statusFilter;
  
      return matchSearch && matchStatus;
    });
  }, [data, search, statusFilter]);

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

      {/* SUMMARY */}
      <div style={styles.summaryGrid}>
        <SummaryCard title="Catatan" plain value="Buku Piutang" />
        <SummaryCard title="Jumlah Pengutang" numberOnly value={filtered.length} />
        <SummaryCard title="Total Saldo Piutang" value={Math.abs(summary.total)} />
      </div>
      <div style={{ marginBottom: 10, fontSize: 12 }}>
        {filtered.length > 0
          ? `Menampilkan ${filtered.length} dari ${data.length} data`
          : "Tidak ada data"}
      </div>
      {/* FILTER */}
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

        <select
          style={styles.input}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">Semua Status</option>
          <option value="Belum Lunas">Belum Lunas</option>
          <option value="Lunas">Lunas</option>
        </select>

        <input
          style={styles.input}
          placeholder="Cari klien..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div style={{ marginLeft: "auto" }}>
          <button style={styles.btnSuccess} onClick={() => setModal(true)}>
            Piutang Baru
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div style={styles.tableCard}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Klien</th>
                <th>Tanggal</th>
                <th>Deskripsi</th>
                <th>Saldo</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map(p => (
                <tr key={p.id_utang_piutang}>
                  <td style={styles.td}>{p.klien}</td>
                  <td style={styles.td}>{formatDate(p.tanggal)}</td>
                  <td style={styles.td}>{p.deskripsi}</td>
                  <td style={styles.td}>
                    Rp {Math.abs(p.saldo).toLocaleString()}
                  </td>
                  <td style={{
                    ...styles.td,
                    color: p.status === "Lunas" ? "green" : "orange",
                  }}>
                    {p.status}
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      <button
                        style={styles.btnPrimary}
                        onClick={() => navigate(`/piutang/${p.id_utang_piutang}`)}
                      >
                        Detail
                      </button>

                      <button
                        style={styles.btnDanger}
                        onClick={() => handleDelete(p.id_utang_piutang)}
                      >
                        Hapus
                      </button>
                    </div>
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

      {/* MODAL */}
      {modal && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h3>Piutang Baru</h3>

            <input style={styles.input} type="datetime-local"
              onChange={e => setForm({ ...form, tanggal: e.target.value })}
            />

            <label>
              <input type="checkbox"
                onChange={e => setForm({ ...form, pakaiTempo: e.target.checked })}
              /> Pakai Jatuh Tempo
            </label>

            {form.pakaiTempo && (
              <input style={styles.input} type="datetime-local"
                onChange={e => setForm({ ...form, tanggal_tempo: e.target.value })}
              />
            )}

            <input style={styles.input} placeholder="Klien"
              onChange={e => setForm({ ...form, klien: e.target.value })}
            />

            <input style={styles.input} placeholder="Nominal"
              onChange={e => setForm({ ...form, nominal: e.target.value })}
            />

            <textarea style={styles.input} placeholder="Deskripsi"
              onChange={e => setForm({ ...form, deskripsi: e.target.value })}
            />

            <label>
              <input type="checkbox"
                onChange={e => setForm({ ...form, catatKas: e.target.checked })}
              /> Catat ke Buku Kas
            </label>

            {form.catatKas && (
              <>
                <select style={styles.input}
                  onChange={e => setForm({ ...form, id_buku: e.target.value })}
                >
                  <option value="">Pilih Buku</option>
                  {bukuList.map(b => (
                    <option key={b.id_buku} value={b.id_buku}>{b.nama}</option>
                  ))}
                </select>

                <select style={styles.input}
                  onChange={e => setForm({ ...form, id_kategori: e.target.value })}
                >
                  <option value="">Pilih Kategori</option>
                  {kategori.map(k => (
                    <option key={k.id_kategori} value={k.id_kategori}>{k.nama_kategori}</option>
                  ))}
                </select>
              </>
            )}

            <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{
                ...styles.btnPrimary,
                opacity: loadingSave ? 0.6 : 1,
                cursor: loadingSave ? "not-allowed" : "pointer"
              }}
              onClick={save}
              disabled={loadingSave}
            >
              {loadingSave ? "Menyimpan..." : "Simpan"}
            </button>
              <button style={styles.btnDanger} onClick={() => setModal(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function SummaryCard({ title, value, plain, numberOnly }) {
  return (
    <div style={styles.card}>
      <h4>{title}</h4>

      {plain && <h3>{value}</h3>}
      {numberOnly && <h2>{value}</h2>}

      {!plain && !numberOnly && (
        <h3>Rp {Number(value || 0).toLocaleString()}</h3>
      )}
    </div>
  );
}

const styles = {
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
    gap: 10,
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

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  tableCard: {
    background: "#fff",
    padding: 12,
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },

  table: {
    width: "100%",
    minWidth: 700,
    borderCollapse: "collapse",
    fontSize: 12,
  },
  th: {
    textAlign: "center",
    padding: 8,
    fontSize: 12,
    whiteSpace: "nowrap"
  },
  td: {
    textAlign: "center",
    padding: 8,
    fontSize: 12
  },

  input: {
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 13,
    minWidth: 120,
    flex: 1,
    background: "#2c2c2c",
    color: "#fff"
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

  btnSuccess: {
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
  },

  btnDanger: {
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