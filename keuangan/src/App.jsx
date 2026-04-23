import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import TemplateLogin from "./templates/TemplateLogin";
import TemplateNoLogin from "./templates/TemplateNoLogin";
import { supabase } from "./lib/supabase";
import "./App.css";

// Pages
import Dashboard from "./pages/dashboard";
import BukuDaftar from "./pages/bukuKas/daftar";
import BukuSemua from "./pages/bukuKas/semua";
import BukuIndex from "./pages/bukuKas/index";
import Utang from "./pages/utangPiutang/utang";
import Piutang from "./pages/utangPiutang/piutang";
import DetailPiutang from "./pages/utangPiutang/detailPiutang";
import LaporanKas from "./pages/catatanLaporan/kas";
import LaporanNeraca from "./pages/catatanLaporan/neraca";
import LaporanLabaRugi from "./pages/catatanLaporan/labaRugi";
import Kategori from "./pages/kategori";
import Profile from "./pages/profile";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // loading dulu biar ga flicker / loop
  if (loading) return null;

  return (
    <HashRouter>
      <Routes>
        {/* Root */}
        <Route
          path="/"
          element={
            session ? <Navigate to="dashboard" replace /> : <TemplateNoLogin />
          }
        />

        {/* Layout setelah login */}
        <Route
          path="/"
          element={
            session ? <TemplateLogin /> : <Navigate to="/" replace />
          }
        >
          {/* Dashboard */}
          <Route path="dashboard" element={<Dashboard />} />

          {/* Buku Kas */}
          <Route path="buku/daftar" element={<BukuDaftar />} />
          <Route path="buku/semua" element={<BukuSemua />} />
          <Route path="buku/:id_buku" element={<BukuIndex />} />

          {/* Utang Piutang */}
          <Route path="utang" element={<Utang />} />
          <Route path="piutang" element={<Piutang />} />
          <Route path="piutang/:id" element={<DetailPiutang />} />

          {/* Laporan */}
          <Route path="laporan/kas" element={<LaporanKas />} />
          <Route path="laporan/neraca" element={<LaporanNeraca />} />
          <Route path="laporan/laba" element={<LaporanLabaRugi />} />

          {/* Aset */}
          <Route path="aset/kategori" element={<div>Kategori Aset</div>} />
          <Route path="aset" element={<div>Daftar Aset</div>} />

          {/* Lainnya */}
          <Route path="kategori" element={<Kategori />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
