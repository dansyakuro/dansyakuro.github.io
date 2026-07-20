import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function Dashboard() {
  const now = new Date();

  const [chartData, setChartData] = useState([]);
  const [totalSaldo, setTotalSaldo] = useState(0);
  const [totalPiutang, setTotalPiutang] = useState(0);
  const [rawBuku, setRawBuku] = useState([]);
  const [rawTrx, setRawTrx] = useState([]);
  const [periode, setPeriode] = useState({
    bulan: now.getMonth() + 1,
    tahun: now.getFullYear(),
  });
  const { bulan: bulanPilih, tahun: tahunPilih } = periode;
  const [transaksiTerakhir, setTransaksiTerakhir] = useState([]);

  const namaBulan = NAMA_BULAN[bulanPilih - 1];
  const isBulanIni =
    bulanPilih === now.getMonth() + 1 && tahunPilih === now.getFullYear();

  const monthly = useMemo(
    () => computeMonthly(rawBuku, rawTrx, bulanPilih, tahunPilih, now),
    [rawBuku, rawTrx, bulanPilih, tahunPilih]
  );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const user = (await supabase.auth.getUser()).data.user;

    const { data: bukuData } = await supabase
      .from("tbl_buku")
      .select("*")
      .eq("id_user", user.id);

    const { data: trx } = await supabase
      .from("tbl_buku_transaksi")
      .select("*, tbl_kategori(nama_kategori)")
      .order("tanggal", { ascending: false });

    const { data: trxPiutang } = await supabase
      .from("tbl_transaksi_utang_piutang")
      .select("nominal");

    let totalAll = 0;

    const result = (bukuData || []).map((b) => {
      const list = (trx || []).filter((t) => t.id_buku === b.id_buku);

      let saldo = b.saldo_awal || 0;

      list.forEach((t) => {
        if (t.tipe === "Pemasukan") saldo += t.nominal;
        else saldo -= t.nominal;
      });

      totalAll += saldo;

      return { nama: b.nama, saldo };
    });

    const chart = result.map((r, i) => ({
      ...r,
      persen: totalAll ? ((r.saldo / totalAll) * 100).toFixed(1) : 0,
      color: COLORS[i % COLORS.length],
    }));

    const totalPiutangSaldo = (trxPiutang || []).reduce(
      (a, b) => a + b.nominal * -1,
      0
    );

    const nonTransfer = (trx || []).filter(
      (t) => t.id_kategori !== 1 && !t.kode_transfer
    );

    setRawBuku(bukuData || []);
    setRawTrx(trx || []);
    setChartData(chart);
    setTotalSaldo(totalAll);
    setTotalPiutang(totalPiutangSaldo);
    setTransaksiTerakhir(nonTransfer.slice(0, 5));
  }

  function shiftMonth(delta) {
    setPeriode(({ bulan, tahun }) => {
      let m = bulan + delta;
      let y = tahun;
      if (m < 1) {
        m = 12;
        y -= 1;
      } else if (m > 12) {
        m = 1;
        y += 1;
      }
      return { bulan: m, tahun: y };
    });
  }

  const surplus = monthly.cashFlow.pemasukan - monthly.cashFlow.pengeluaran;
  const maxTop = monthly.topPengeluaran[0]?.total || 1;

  return (
    <div>
      <div style={styles.grid}>
        <Card title="Total Saldo Semua Buku" value={format(totalSaldo)} />
        <Card title="Total Saldo Piutang" value={format(totalPiutang)} />
      </div>

      <div style={{ ...styles.chartBox, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>Total Saldo per Buku</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {chartData.map((c, i) => (
            <div key={i}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span>{c.nama}</span>
                <span>
                  {format(c.saldo)} ({c.persen}%)
                </span>
              </div>

              <div style={styles.barBackground}>
                <div
                  style={{
                    ...styles.barFill,
                    width: `${c.persen}%`,
                    background: c.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...styles.chartBox, marginBottom: 20, overflow: "hidden" }}>
        <MonthNav
          title="Saldo Kas Bulan"
          bulan={bulanPilih}
          tahun={tahunPilih}
          onPrev={() => shiftMonth(-1)}
          onNext={() => shiftMonth(1)}
        />
        <p style={styles.chartSubtitle}>
          Saldo berjalan harian (pemasukan − pengeluaran) semua buku
        </p>

        <div style={styles.chartFullBleed}>
          <SaldoLineChart data={monthly.saldoHarian} namaBulan={namaBulan} />
        </div>

        {isBulanIni && monthly.saldoHariIni != null && (
          <div style={styles.saldoHariIni}>
            <div>
              <div style={styles.saldoHariIniLabel}>Hari ini</div>
              <div style={styles.saldoHariIniValue}>
                Saldo {format(monthly.saldoHariIni)}
              </div>
            </div>
            {monthly.perubahanHarian !== 0 && (
              <div
                style={{
                  ...styles.perubahan,
                  color: monthly.perubahanHarian > 0 ? "#2e7d32" : "#d32f2f",
                }}
              >
                {monthly.perubahanHarian > 0 ? "▲" : "▼"}{" "}
                {monthly.perubahanHarian > 0 ? "+" : "−"}
                {format(Math.abs(monthly.perubahanHarian))}
                <span style={styles.perubahanSub}> dibanding kemarin</span>
              </div>
            )}
            {monthly.perubahanHarian === 0 && (
              <div style={{ ...styles.perubahan, color: "#777" }}>
                ↔ tidak berubah dibanding kemarin
              </div>
            )}
          </div>
        )}
      </div>

      <div style={styles.grid2}>
        <div style={styles.chartBox}>
          <MonthNav
            title="Cash Flow"
            bulan={bulanPilih}
            tahun={tahunPilih}
            onPrev={() => shiftMonth(-1)}
            onNext={() => shiftMonth(1)}
          />

          <div style={styles.cashFlowRow}>
            <span style={styles.cashFlowLabel}>Pemasukan</span>
            <span style={{ ...styles.cashFlowVal, color: "#2e7d32" }}>
              +{format(monthly.cashFlow.pemasukan)}
            </span>
          </div>
          <div style={styles.cashFlowBarBg}>
            <div
              style={{
                ...styles.cashFlowBarFill,
                width: `${monthly.cashFlow.pemasukan ? 100 : 0}%`,
                background: "#2e7d32",
              }}
            />
          </div>

          <div style={{ ...styles.cashFlowRow, marginTop: 12 }}>
            <span style={styles.cashFlowLabel}>Pengeluaran</span>
            <span style={{ ...styles.cashFlowVal, color: "#d32f2f" }}>
              −{format(monthly.cashFlow.pengeluaran)}
            </span>
          </div>
          <div style={styles.cashFlowBarBg}>
            <div
              style={{
                ...styles.cashFlowBarFill,
                width: `${
                  monthly.cashFlow.pemasukan
                    ? (monthly.cashFlow.pengeluaran / monthly.cashFlow.pemasukan) * 100
                    : monthly.cashFlow.pengeluaran
                    ? 100
                    : 0
                }%`,
                background: "#d32f2f",
              }}
            />
          </div>

          <div style={styles.cashFlowTotal}>
            <span>Net</span>
            <span
              style={{
                color: surplus >= 0 ? "#2e7d32" : "#d32f2f",
                fontWeight: 600,
              }}
            >
              {surplus >= 0 ? "+" : "−"}
              {format(Math.abs(surplus))}
            </span>
          </div>
        </div>

        <div style={styles.chartBox}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>
            Top Pengeluaran {namaBulan}
          </h3>

          {monthly.topPengeluaran.length === 0 ? (
            <div style={styles.chartEmpty}>Belum ada pengeluaran bulan ini.</div>
          ) : (
            monthly.topPengeluaran.map((item, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={styles.topRow}>
                  <span style={styles.topNama}>{item.nama}</span>
                  <span style={styles.topNominal}>{format(item.total)}</span>
                </div>
                <div style={styles.barBackground}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${(item.total / maxTop) * 100}%`,
                      background: "#d32f2f",
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ ...styles.chartBox, marginTop: 20 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Transaksi Terakhir</h3>

        {transaksiTerakhir.length === 0 ? (
          <div style={styles.chartEmpty}>Belum ada transaksi.</div>
        ) : (
          transaksiTerakhir.map((t) => (
            <div key={t.id} style={styles.trxRow}>
              <div style={styles.trxLeft}>
                <span
                  style={{
                    color: t.tipe === "Pemasukan" ? "#2e7d32" : "#d32f2f",
                    fontWeight: 600,
                    fontSize: 12,
                    minWidth: 14,
                  }}
                >
                  {t.tipe === "Pemasukan" ? "+" : "−"}
                </span>
                <span style={styles.trxDesc}>
                  {t.deskripsi || t.tbl_kategori?.nama_kategori || "—"}
                </span>
              </div>
              <div style={styles.trxRight}>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 12,
                    color: t.tipe === "Pemasukan" ? "#2e7d32" : "#d32f2f",
                  }}
                >
                  {format(t.nominal)}
                </span>
                <span style={styles.trxTgl}>{formatTanggalSingkat(t.tanggal)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function computeMonthly(bukuData, trx, bulan, tahun, now) {
  const harian = hitungSaldoHarian(bukuData, trx, bulan, tahun);

  const isBulanIni =
    bulan === now.getMonth() + 1 && tahun === now.getFullYear();
  const hariIni = now.getDate();
  const idxHariIni = harian.findIndex((d) => d.hari === hariIni);
  const saldoToday =
    isBulanIni && idxHariIni >= 0 ? harian[idxHariIni].saldo : null;
  const saldoKemarin =
    isBulanIni && idxHariIni > 0 ? harian[idxHariIni - 1].saldo : null;

  const trxBulan = (trx || []).filter((t) => isInMonth(t.tanggal, bulan, tahun));

  let pemasukan = 0;
  let pengeluaran = 0;
  const byKategori = {};

  trxBulan.forEach((t) => {
    if (t.tipe === "Pemasukan") pemasukan += t.nominal;
    else {
      pengeluaran += t.nominal;
      if (t.id_kategori !== 1) {
        const nama = t.tbl_kategori?.nama_kategori || "Lainnya";
        byKategori[nama] = (byKategori[nama] || 0) + t.nominal;
      }
    }
  });

  const topPengeluaran = Object.entries(byKategori)
    .map(([nama, total]) => ({ nama, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    saldoHarian: harian,
    saldoHariIni: saldoToday,
    perubahanHarian:
      saldoToday != null && saldoKemarin != null
        ? saldoToday - saldoKemarin
        : 0,
    cashFlow: { pemasukan, pengeluaran },
    topPengeluaran,
  };
}

function MonthNav({ title, bulan, tahun, onPrev, onNext }) {
  const label = `${title} ${NAMA_BULAN[bulan - 1]}${
    tahun !== new Date().getFullYear() ? ` ${tahun}` : ""
  }`;

  return (
    <div style={styles.monthNav}>
      <button type="button" style={styles.monthBtn} onClick={onPrev} aria-label="Bulan sebelumnya">
        ‹
      </button>
      <h3 style={styles.monthTitle}>{label}</h3>
      <button type="button" style={styles.monthBtn} onClick={onNext} aria-label="Bulan berikutnya">
        ›
      </button>
    </div>
  );
}

function hitungSaldoHarian(bukuData, trx, bulan, tahun) {
  const awal = new Date(tahun, bulan - 1, 1);
  const akhir = new Date(tahun, bulan, 0);
  const jumlahHari = akhir.getDate();

  let saldo = 0;

  (bukuData || []).forEach((b) => {
    let saldoBuku = Number(b.saldo_awal || 0);
    const list = (trx || []).filter((t) => t.id_buku === b.id_buku);

    list.forEach((t) => {
      const tgl = new Date(t.tanggal);
      if (tgl < awal) {
        saldoBuku += t.tipe === "Pemasukan" ? t.nominal : -t.nominal;
      }
    });

    saldo += saldoBuku;
  });

  const hasil = [];

  for (let hari = 1; hari <= jumlahHari; hari++) {
    const trxHari = (trx || []).filter((t) =>
      isSameDay(t.tanggal, tahun, bulan, hari)
    );

    trxHari.forEach((t) => {
      if (t.tipe === "Pemasukan") saldo += t.nominal;
      else saldo -= t.nominal;
    });

    hasil.push({ hari, saldo });
  }

  return hasil;
}

function isSameDay(tanggal, tahun, bulan, hari) {
  const tgl = new Date(tanggal);
  return (
    tgl.getUTCFullYear() === tahun &&
    tgl.getUTCMonth() + 1 === bulan &&
    tgl.getUTCDate() === hari
  );
}

function isInMonth(tanggal, bulan, tahun) {
  const tgl = new Date(tanggal);
  return tgl.getUTCFullYear() === tahun && tgl.getUTCMonth() + 1 === bulan;
}

function SaldoLineChart({ data, namaBulan }) {
  const [tip, setTip] = useState(null);

  if (!data.length) {
    return (
      <div style={styles.chartEmpty}>Belum ada data transaksi bulan ini.</div>
    );
  }

  const n = data.length;
  const W = 900;
  const H = 300;
  const padL = 120;
  const padR = 120;
  const padT = 14;
  const padB = 26;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const saldos = data.map((d) => d.saldo);
  const dataMin = Math.min(...saldos);
  const dataMax = Math.max(...saldos);
  const yMin = dataMin < 0 ? niceFloor(dataMin * 1.1) : 0;
  const yMax = niceCeil(Math.max(dataMax * 1.1, yMin + 500000));
  const yRange = yMax - yMin || 1;

  const ticks = buildYTicks(yMin, yMax);

  const toX = (i) => padL + (i / (n - 1 || 1)) * chartW;
  const toY = (val) => padT + chartH - ((val - yMin) / yRange) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.saldo)}`).join(" ");
  const zeroY = toY(0);

  return (
    <div style={styles.lineChartWrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ ...styles.lineChartSvg, aspectRatio: `${W} / ${H}` }}
      >
        {ticks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line
                x1={padL}
                y1={y}
                x2={W - padR}
                y2={y}
                stroke="#eee"
                strokeWidth="1"
              />
              <text
                x={padL - 4}
                y={y + 3}
                textAnchor="end"
                fontSize="8"
                fill="#999"
              >
                {formatCompact(tick)}
              </text>
            </g>
          );
        })}

        {yMin < 0 && yMax > 0 && (
          <line
            x1={padL}
            y1={zeroY}
            x2={W - padR}
            y2={zeroY}
            stroke="#ddd"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
        )}

        <polyline
          points={points}
          fill="none"
          stroke="#1976d2"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((d, i) => {
          const cx = toX(i);
          const cy = toY(d.saldo);
          const active = tip?.i === i;
          return (
            <g key={d.hari}>
              <circle
                cx={cx}
                cy={cy}
                r={10}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() =>
                  setTip({ hari: d.hari, saldo: d.saldo, i, cx, cy })
                }
                onMouseLeave={() => setTip(null)}
                onClick={() =>
                  setTip((prev) =>
                    prev?.i === i
                      ? null
                      : { hari: d.hari, saldo: d.saldo, i, cx, cy }
                  )
                }
              />
              <circle
                cx={cx}
                cy={cy}
                r={active ? 4 : 2.5}
                fill={active ? "#1976d2" : "#fff"}
                stroke="#1976d2"
                strokeWidth="1.5"
                style={{ pointerEvents: "none" }}
              />
            </g>
          );
        })}

        {tip != null && (
          <ChartTooltip
            tip={tip}
            namaBulan={namaBulan}
            padL={padL}
            W={W}
            padR={padR}
          />
        )}

        {data.map((d, i) => (
          <text
            key={`x-${d.hari}`}
            x={toX(i)}
            y={H - 5}
            textAnchor="middle"
            fontSize="7"
            fill="#aaa"
          >
            {d.hari}
          </text>
        ))}
      </svg>
    </div>
  );
}

function ChartTooltip({ tip, namaBulan, padL, W, padR }) {
  const saldoText = format(tip.saldo);
  const hariText = `${tip.hari} ${namaBulan}`;
  const boxW = Math.max(hariText.length * 4.2, saldoText.length * 4.8) + 14;
  const boxH = 24;
  let x = tip.cx - boxW / 2;
  x = Math.max(padL, Math.min(x, W - padR - boxW));
  const y = tip.cy - boxH - 6;

  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={boxW}
        height={boxH}
        rx={4}
        fill="#1976d2"
        stroke="#1565c0"
        strokeWidth="0.5"
      />
      <text
        x={x + boxW / 2}
        y={y + 9}
        textAnchor="middle"
        fontSize="6.5"
        fill="#fff"
        opacity={0.9}
      >
        {hariText}
      </text>
      <text
        x={x + boxW / 2}
        y={y + 18}
        textAnchor="middle"
        fontSize="7.5"
        fill="#fff"
        fontWeight="bold"
      >
        {saldoText}
      </text>
    </g>
  );
}

function buildYTicks(yMin, yMax) {
  const range = yMax - yMin;
  const rough = range / 5;
  const step = niceStep(rough);
  const ticks = [];

  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
    ticks.push(v);
  }

  if (!ticks.includes(0) && yMin <= 0 && yMax >= 0) ticks.push(0);
  return ticks.sort((a, b) => a - b);
}

function niceStep(rough) {
  if (rough <= 0) return 100000;
  const exp = Math.floor(Math.log10(rough));
  const base = Math.pow(10, exp);
  const f = rough / base;
  if (f <= 1) return base;
  if (f <= 2) return 2 * base;
  if (f <= 5) return 5 * base;
  return 10 * base;
}

function niceCeil(val) {
  if (val <= 0) return 0;
  const step = niceStep(val / 5);
  return Math.ceil(val / step) * step;
}

function niceFloor(val) {
  if (val >= 0) return 0;
  const step = niceStep(Math.abs(val) / 5);
  return Math.floor(val / step) * step;
}

function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.title}>{title}</div>
      <div style={styles.value}>{value}</div>
    </div>
  );
}

function format(val) {
  return "Rp " + Number(val || 0).toLocaleString("id-ID");
}

function formatCompact(val) {
  const n = Math.abs(Number(val || 0));
  const sign = val < 0 ? "−" : "";
  if (n >= 1_000_000) {
    const jt = n / 1_000_000;
    return sign + (jt % 1 === 0 ? jt.toFixed(0) : jt.toFixed(1)) + "jt";
  }
  if (n >= 1_000) {
    const rb = n / 1_000;
    return sign + rb.toFixed(0) + "rb";
  }
  return sign + n.toLocaleString("id-ID");
}

function formatTanggalSingkat(tanggal) {
  if (!tanggal) return "";
  const tgl = new Date(tanggal);
  const hari = tgl.getUTCDate();
  const bln = NAMA_BULAN[tgl.getUTCMonth()].slice(0, 3);
  return `${hari} ${bln}`;
}

const COLORS = ["#1976d2", "#2e7d32", "#ed6c02", "#9c27b0", "#d32f2f"];

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
    gap: 16,
    marginBottom: 20,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))",
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
  chartBox: {
    background: "#fff",
    padding: 16,
    borderRadius: 10,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },
  monthNav: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  monthBtn: {
    width: 28,
    height: 28,
    border: "1px solid #ddd",
    borderRadius: 6,
    background: "#fafafa",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    color: "#555",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
  },
  monthTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    flex: 1,
    textAlign: "center",
  },
  chartSubtitle: {
    margin: "0 0 10px",
    fontSize: 11,
    color: "#999",
  },
  chartFullBleed: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
  },
  lineChartWrap: {
    width: "100%",
  },
  lineChartSvg: {
    width: "100%",
    height: "auto",
    display: "block",
  },
  chartEmpty: {
    padding: "20px 0",
    textAlign: "center",
    color: "#999",
    fontSize: 12,
  },
  saldoHariIni: {
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid #eee",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  saldoHariIniLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 2,
  },
  saldoHariIniValue: {
    fontSize: 14,
    fontWeight: 600,
  },
  perubahan: {
    fontSize: 12,
    fontWeight: 600,
  },
  perubahanSub: {
    fontWeight: 400,
    color: "#999",
    fontSize: 11,
  },
  barBackground: {
    width: "100%",
    height: 14,
    background: "#e5e5e5",
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    transition: "0.3s",
  },
  cashFlowRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    marginBottom: 4,
  },
  cashFlowLabel: {
    color: "#666",
  },
  cashFlowVal: {
    fontWeight: 600,
    fontSize: 12,
  },
  cashFlowBarBg: {
    height: 8,
    background: "#eee",
    borderRadius: 999,
    overflow: "hidden",
  },
  cashFlowBarFill: {
    height: "100%",
    borderRadius: 999,
    maxWidth: "100%",
  },
  cashFlowTotal: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 10,
    borderTop: "1px solid #eee",
    fontSize: 12,
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    marginBottom: 4,
  },
  topNama: {
    fontWeight: 500,
  },
  topNominal: {
    fontWeight: 600,
    fontSize: 11,
    color: "#666",
  },
  trxRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #f0f0f0",
    gap: 8,
  },
  trxLeft: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  trxDesc: {
    fontSize: 12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  trxRight: {
    textAlign: "right",
    flexShrink: 0,
  },
  trxTgl: {
    display: "block",
    fontSize: 10,
    color: "#aaa",
    marginTop: 2,
  },
};
