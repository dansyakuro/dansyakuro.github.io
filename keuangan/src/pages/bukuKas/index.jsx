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
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [bulan, setBulan] = useState("Semua");
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [tipe, setTipe] = useState("Semua");

  const [search, setSearch] = useState("");

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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, tipe, bulan, tahun]);

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

    const awal =
      bulan === "Semua"
        ? new Date(tahun, 0, 1)
        : new Date(tahun, bulan - 1, 1);

    const akhir =
      bulan === "Semua"
        ? new Date(tahun, 11, 31)
        : new Date(tahun, bulan, 0);

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
      if (editId) {

        const { data: list } = await supabase
          .from("tbl_buku_transaksi")
          .select("*")
          .eq("kode_transfer", transaksi.find(t => t.id === editId)?.kode_transfer);

        for (const t of list) {
          await supabase
            .from("tbl_buku_transaksi")
            .update({
              nominal,
              deskripsi: form.deskripsi,
              tanggal,
            })
            .eq("id", t.id);
        }

      } else {

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
      }

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
  
    if (trx.kode_transfer) {
      setModal("Transfer");
  
      const [dari, ke] = trx.kode_transfer.split("-")[0].split("_");
  
      setForm({
        tanggal: trx.tanggal?.slice(0, 16),
        nominal: trx.nominal,
        deskripsi: trx.deskripsi,
        dari_buku: dari,
        ke_buku: ke,
      });
  
    } else {
      setModal(trx.tipe);
  
      setForm({
        tanggal: trx.tanggal?.slice(0, 16),
        nominal: trx.nominal,
        deskripsi: trx.deskripsi,
        id_kategori: trx.id_kategori,
      });
    }
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

      <div style={styles.summaryGrid}>
        <SummaryCard title={buku?.nama} desc={buku?.deskripsi} />
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

        <select
          style={styles.input}
          value={bulan}
          onChange={e => setBulan(e.target.value)}
        >
          <option value="Semua">Semua Bulan</option>
          {[...Array(12)].map((_, i) => (
            <option key={i} value={i + 1}>{i + 1}</option>
          ))}
        </select>

        <input style={styles.input} type="number" value={tahun} onChange={e => setTahun(Number(e.target.value))} />

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.btnPrimary} onClick={() => setModal("Transfer")}>Transfer</button>
          <button style={styles.btnSuccess} onClick={() => setModal("Pemasukan")}>Pemasukan</button>
          <button style={styles.btnDanger} onClick={() => setModal("Pengeluaran")}>Pengeluaran</button>
        </div>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableWrapper}>
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
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button style={styles.btnPrimary} onClick={() => handleEdit(trx)}>Edit</button>
                      <button style={styles.btnDanger} onClick={() => handleDelete(trx)}>Hapus</button>
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
      <h4 style={{ margin: 0 }}>{title}</h4>
      {desc && <small>{desc}</small>}
      {value !== undefined && <h3>Rp {Number(value || 0).toLocaleString()}</h3>}
    </div>
  );
}

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

  btnSuccess: {
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
  },

  btnDanger: {
    background: "#d32f2f",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
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
    width: "90%",
    maxWidth: 350,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
};