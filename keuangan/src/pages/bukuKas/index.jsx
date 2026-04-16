import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";

export default function BukuKasIndex() {
  const { id_buku } = useParams();

  const [buku, setBuku] = useState(null);
  const [ringkasan, setRingkasan] = useState({});
  const [transaksi, setTransaksi] = useState([]);
  const [kategori, setKategori] = useState([]);
  const [listBuku, setListBuku] = useState([]);

  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [tipe, setTipe] = useState("Semua");

  const [search, setSearch] = useState("");
  const [showEntries, setShowEntries] = useState(10);

  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    tanggal: "",
    nominal: "",
    deskripsi: "",
    id_kategori: "",
    dari_buku: "",
    ke_buku: "",
  });

  useEffect(() => {
    fetchData();
  }, [id_buku, bulan, tahun, tipe]);

  async function fetchData() {
    const user = (await supabase.auth.getUser()).data.user;

    const { data: bukuData } = await supabase
      .from("tbl_buku")
      .select("*")
      .eq("id_buku", id_buku)
      .single();

    setBuku(bukuData);

    const { data: bukuList } = await supabase
      .from("tbl_buku")
      .select("*")
      .eq("id_user", user.id);

    setListBuku(bukuList || []);

    const { data: kat } = await supabase
      .from("tbl_kategori")
      .select("*")
      .eq("id_user", user.id);

    setKategori(kat || []);

    const { data: trx } = await supabase
      .from("tbl_buku_transaksi")
      .select(`*, tbl_kategori(nama_kategori)`)
      .eq("id_buku", id_buku)
      .order("tanggal", { ascending: true });

    setTransaksi(trx || []);

    hitungRingkasan(trx || [], bukuData);
  }

  function hitungRingkasan(data, buku) {
    if (!buku) return;

    const awal = new Date(tahun, bulan - 1, 1);
    const akhir = new Date(tahun, bulan, 0);

    let saldoAwal = Number(buku.saldo_awal || 0);
    let pemasukan = 0;
    let pengeluaran = 0;

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

  async function save() {
    if (!form.nominal) return alert("Nominal wajib diisi");

    const tanggal = form.tanggal || new Date();

    if (modal === "Transfer") {
      const nominal = parseInt(form.nominal);

      const { data: trxKeluar } = await supabase
        .from("tbl_buku_transaksi")
        .insert([{
          id_buku: form.dari_buku,
          tipe: "Pengeluaran",
          nominal,
          id_kategori: 1,
          deskripsi: form.deskripsi,
          tanggal,
        }])
        .select()
        .single();

      const { data: trxMasuk } = await supabase
        .from("tbl_buku_transaksi")
        .insert([{
          id_buku: form.ke_buku,
          tipe: "Pemasukan",
          nominal,
          id_kategori: 1,
          deskripsi: form.deskripsi,
          tanggal,
        }])
        .select()
        .single();

      const kode = `${form.dari_buku}_${form.ke_buku}-${trxKeluar.id}_${trxMasuk.id}`;

      await supabase
        .from("tbl_buku_transaksi")
        .update({ kode_transfer: kode })
        .in("id", [trxKeluar.id, trxMasuk.id]);

    } else {
      if (editId) {
        await supabase
          .from("tbl_buku_transaksi")
          .update({
            nominal: parseInt(form.nominal),
            id_kategori: form.id_kategori,
            deskripsi: form.deskripsi,
            tanggal,
          })
          .eq("id", editId);
      } else {
        await supabase.from("tbl_buku_transaksi").insert([{
          id_buku: Number(id_buku),
          tipe: modal,
          nominal: parseInt(form.nominal),
          id_kategori: form.id_kategori,
          deskripsi: form.deskripsi,
          tanggal,
        }]);
      }
    }

    setModal(null);
    setEditId(null);
    setForm({});
    fetchData();
  }

  function handleEdit(trx) {
    setEditId(trx.id);
    setModal(trx.tipe);

    setForm({
      tanggal: trx.tanggal?.slice(0, 16),
      nominal: trx.nominal,
      deskripsi: trx.deskripsi,
      id_kategori: trx.id_kategori,
    });
  }

  async function handleDelete(trx) {
    if (!confirm("Yakin hapus?")) return;

    if (trx.kode_transfer) {
      await supabase
        .from("tbl_buku_transaksi")
        .delete()
        .eq("kode_transfer", trx.kode_transfer);
    } else {
      await supabase
        .from("tbl_buku_transaksi")
        .delete()
        .eq("id", trx.id);
    }

    fetchData();
  }

  const transaksiWithSaldo = useMemo(() => {
    let saldo = Number(buku?.saldo_awal || 0);

    return transaksi.map(t => {
      saldo += t.tipe === "Pemasukan" ? t.nominal : -t.nominal;
      return { ...t, saldo_running: saldo };
    });
  }, [transaksi, buku]);

  const filtered = useMemo(() => {
    return transaksiWithSaldo
      .filter(t => t.deskripsi?.toLowerCase().includes(search.toLowerCase()))
      .slice(0, showEntries);
  }, [transaksiWithSaldo, search, showEntries]);

  return (
    <div>

      <div style={styles.summaryGrid}>
        <SummaryCard title={buku?.nama} desc={buku?.deskripsi} />
        <SummaryCard title="Saldo Awal Bulan" value={ringkasan?.saldo_awal_bulan} />
        <SummaryCard title="Saldo Akhir Bulan" value={ringkasan?.saldo_akhir_bulan} />
        <SummaryCard title="Pemasukan Bulanan" value={ringkasan?.pemasukan_bulanan} />
        <SummaryCard title="Pengeluaran Bulanan" value={ringkasan?.pengeluaran_bulanan} />
      </div>

      <div style={styles.filterRow}>
        <select style={styles.input} value={tipe} onChange={e => setTipe(e.target.value)}>
          <option>Semua</option>
          <option>Pemasukan</option>
          <option>Pengeluaran</option>
          <option>Transfer</option>
        </select>

        <select style={styles.input} value={bulan} onChange={e => setBulan(Number(e.target.value))}>
          {[...Array(12)].map((_, i) => (
            <option key={i} value={i + 1}>{i + 1}</option>
          ))}
        </select>

        <input style={styles.input} type="number" value={tahun} onChange={e => setTahun(Number(e.target.value))} />

        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button style={styles.btnPrimary} onClick={() => setModal("Transfer")}>Transfer</button>
          <button style={styles.btnSuccess} onClick={() => setModal("Pemasukan")}>Pemasukan</button>
          <button style={styles.btnDanger} onClick={() => setModal("Pengeluaran")}>Pengeluaran</button>
        </div>
      </div>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tipe</th>
              <th style={styles.th}>Tanggal</th>
              <th style={styles.th}>Kategori</th>
              <th style={styles.th}>Deskripsi</th>
              <th style={styles.th}>Pemasukan</th>
              <th style={styles.th}>Pengeluaran</th>
              <th style={styles.th}>Saldo</th>
              <th style={styles.th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(trx => (
              <tr key={trx.id}>
                <td style={styles.td}>
                  {trx.tipe === "Pemasukan" ? "+" : trx.id_kategori === 1 ? "↔" : "-"}
                </td>
                <td style={styles.td}>{new Date(trx.tanggal).toLocaleDateString()}</td>
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
                <td style={styles.td}>
                  <button style={styles.btnPrimary} onClick={() => handleEdit(trx)}>Edit</button>
                  <button style={styles.btnDanger} onClick={() => handleDelete(trx)}>Hapus</button>
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

            {modal === "Transfer" && (
              <>
                <select style={styles.input}
                  value={form.dari_buku || ""}
                  onChange={e => setForm({ ...form, dari_buku: e.target.value })}
                >
                  <option value="">Dari Buku</option>
                  {listBuku.map(b => <option key={b.id_buku} value={b.id_buku}>{b.nama}</option>)}
                </select>

                <select style={styles.input}
                  value={form.ke_buku || ""}
                  onChange={e => setForm({ ...form, ke_buku: e.target.value })}
                >
                  <option value="">Ke Buku</option>
                  {listBuku.map(b => <option key={b.id_buku} value={b.id_buku}>{b.nama}</option>)}
                </select>
              </>
            )}

            {(modal === "Pemasukan" || modal === "Pengeluaran") && (
              <select style={styles.input}
                value={form.id_kategori || ""}
                onChange={e => setForm({ ...form, id_kategori: e.target.value })}
              >
                <option value="">Pilih Kategori</option>
                {kategori
                  .filter(k => k.id_tipe_transaksi === (modal === "Pemasukan" ? 1 : 2))
                  .map(k => (
                    <option key={k.id_kategori} value={k.id_kategori}>{k.nama_kategori}</option>
                  ))}
              </select>
            )}

            <input style={styles.input} placeholder="Nominal"
              value={form.nominal || ""}
              onChange={e => setForm({ ...form, nominal: e.target.value })}
            />

            <textarea style={styles.input} placeholder="Deskripsi"
              value={form.deskripsi || ""}
              onChange={e => setForm({ ...form, deskripsi: e.target.value })}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button style={styles.btnPrimary} onClick={save}>
                {editId ? "Update" : "Simpan"}
              </button>

              <button style={styles.btnDanger} onClick={() => {
                setModal(null);
                setEditId(null);
                setForm({});
              }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function SummaryCard({ title, value, desc }) {
  return (
    <div style={styles.card}>
      <h4>{title}</h4>
      {desc && <small>{desc}</small>}
      {value !== undefined && <h3>Rp {Number(value || 0).toLocaleString()}</h3>}
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