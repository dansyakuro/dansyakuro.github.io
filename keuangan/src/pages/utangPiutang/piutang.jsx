import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Piutang() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [bukuList, setBukuList] = useState([]);
  const [kategori, setKategori] = useState([]);

  const [search, setSearch] = useState("");
  const [showEntries, setShowEntries] = useState(10);

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});

  const [summary, setSummary] = useState({
    total: 0,
    jumlah: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  function formatDate(val) {
    if (!val) return "-";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID");
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
        tanggal: trx[0]?.tanggal || null, // ✅ INI YANG KURANG
      };
    });

    setData(clean);

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
    const user = (await supabase.auth.getUser()).data.user;

    const { data: utang } = await supabase
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

    let id_buku_transaksi = null;

    if (form.catatKas) {
      const { data: trxKas } = await supabase
        .from("tbl_buku_transaksi")
        .insert([{
          id_buku: form.id_buku,
          tipe: "Pengeluaran",
          nominal: parseInt(form.nominal),
          id_kategori: form.id_kategori,
          deskripsi: form.deskripsi,
          tanggal: form.tanggal,
        }])
        .select()
        .single();

      id_buku_transaksi = trxKas.id;
    }

    await supabase.from("tbl_transaksi_utang_piutang").insert([{
      id_utang_piutang: utang.id_utang_piutang,
      id_buku_transaksi,
      id_tipe_transaksi: 1,
      tanggal: form.tanggal,
      nominal: -parseInt(form.nominal),
      deskripsi: form.deskripsi,
    }]);

    setModal(false);
    setForm({});
    fetchData();
  }

  // 🔥 FINAL DELETE FIX
  async function handleDelete(id) {
    if (!confirm("Yakin hapus?")) return;

    // ambil transaksi dulu
    const { data: trxList } = await supabase
      .from("tbl_transaksi_utang_piutang")
      .select("*")
      .eq("id_utang_piutang", id);

    const bukuIds = trxList
      ?.map(t => t.id_buku_transaksi)
      .filter(Boolean);

    // soft delete buku kas
    if (bukuIds.length) {
      await supabase
        .from("tbl_buku_transaksi")
        .update({ is_hidden: true })
        .in("id", bukuIds);
    }

    // hard delete transaksi
    await supabase
      .from("tbl_transaksi_utang_piutang")
      .delete()
      .eq("id_utang_piutang", id);

    // hard delete utama
    await supabase
      .from("tbl_utang_piutang")
      .delete()
      .eq("id_utang_piutang", id);

    fetchData();
  }

  const filtered = useMemo(() => {
    return data
      .filter(d => d.klien?.toLowerCase().includes(search.toLowerCase()))
      .slice(0, showEntries);
  }, [data, search, showEntries]);

  return (
    <div>

      {/* SUMMARY */}
      <div style={styles.summaryGrid}>
        <SummaryCard title="Catatan" plain value="Buku Piutang" />
        <SummaryCard title="Jumlah Pengutang" numberOnly value={summary.jumlah} />
        <SummaryCard title="Total Saldo Piutang" value={Math.abs(summary.total)} />
      </div>

      {/* FILTER */}
      <div style={styles.filterRow}>
        <input
          style={styles.input}
          placeholder="Cari klien..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          style={styles.input}
          value={showEntries}
          onChange={e => setShowEntries(Number(e.target.value))}
        >
          {[5, 10, 25, 50].map(n => (
            <option key={n}>{n}</option>
          ))}
        </select>

        <div style={{ marginLeft: "auto" }}>
          <button style={styles.btnSuccess} onClick={() => setModal(true)}>
            Piutang Baru
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Tanggal</th>
              <th style={styles.th}>Klien</th>
              <th style={styles.th}>Deskripsi</th>
              <th style={styles.th}>Saldo</th>
              <th style={styles.th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id_utang_piutang}>
                <td style={styles.td}>{p.status}</td>
                <td style={styles.td}>{formatDate(p.tanggal)}</td>
                <td style={styles.td}>{p.klien}</td>
                <td style={styles.td}>{p.deskripsi}</td>
                <td style={styles.td}>
                  Rp {Math.abs(p.saldo).toLocaleString()}
                </td>
                <td style={styles.td}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL tetap sama (tidak diubah logic kamu) */}
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
              <button style={styles.btnPrimary} onClick={save}>Simpan</button>
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
  th: { textAlign: "center", padding: 10 },
  td: { textAlign: "center", padding: 10 },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
    gap: 20,
    marginBottom: 20,
  },
  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },
  filterRow: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  tableCard: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  input: {
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ccc",
    color: "#fff"
  },
  btnPrimary: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
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
    padding: 20,
    borderRadius: 12,
    width: 350,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
};  