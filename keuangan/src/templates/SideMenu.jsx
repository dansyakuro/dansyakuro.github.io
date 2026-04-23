import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SideMenu({ open, isMobile }) {
  const location = useLocation();
  const [bukuList, setBukuList] = useState([]);
  const [collapse, setCollapse] = useState({
    buku: true,
    utang: false,
    laporan: false,
    aset: false,
  });

  useEffect(() => {
    fetchBuku();
  }, []);

  async function fetchBuku() {
    const { data } = await supabase
      .from("tbl_buku")
      .select("id_buku, nama")
      .order("nama", { ascending: true });

    if (data) setBukuList(data);
  }

  const logout = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  const toggleCollapse = (key) => {
    setCollapse((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isActive = (path) => location.pathname === path;

  // 🔥 Auto close jika mobile
  const handleLinkClick = () => {
    if (isMobile) {
      document.dispatchEvent(new Event("toggle-menu"));
    }
  };

  return (
    <>
      {/* Overlay mobile */}
      {open && isMobile && (
        <div
          style={styles.overlay}
          onClick={() =>
            document.dispatchEvent(new Event("toggle-menu"))
          }
        />
      )}

      <aside
        style={{
          ...styles.sidebar,
          left: open ? 0 : -260, // 🔥 FIX SLIDE DESKTOP + MOBILE
        }}
      >
        <ul style={styles.ul}>

          {/* ================= BUKU ================= */}
          <li style={styles.main} onClick={() => toggleCollapse("buku")}>
            Buku Kas
          </li>

          {collapse.buku && (
            <>
              {/* Daftar Buku */}
              <li>
                <Link
                  to="/buku/daftar"
                  onClick={handleLinkClick}
                  style={
                    isActive("/buku/daftar")
                      ? styles.activeSub
                      : styles.sub
                  }
                >
                  Daftar Buku
                </Link>
              </li>

              {/* 🔥 Semua Buku */}
              <li>
                <Link
                  to="/buku/semua"
                  onClick={handleLinkClick}
                  style={
                    isActive("/buku/semua")
                      ? styles.activeSub
                      : styles.sub
                  }
                >
                  Semua Buku
                </Link>
              </li>

              {/* List Buku (sudah urut abjad dari query) */}
              {bukuList.map((buku) => (
                <li key={buku.id_buku}>
                  <Link
                    to={`/buku/${buku.id_buku}`}
                    onClick={handleLinkClick}
                    style={
                      location.pathname === `/buku/${buku.id_buku}`
                        ? styles.activeSub
                        : styles.sub
                    }
                  >
                    {buku.nama}
                  </Link>
                </li>
              ))}
            </>
          )}

          {/* ================= UTANG ================= */}
          <li style={styles.main} onClick={() => toggleCollapse("utang")}>
            Utang & Piutang
          </li>

          {collapse.utang && (
            <>
              <li>
                <Link
                  to="/utang"
                  onClick={handleLinkClick}
                  style={isActive("/utang") ? styles.activeSub : styles.sub}
                >
                  Utang
                </Link>
              </li>
              <li>
                <Link
                  to="/piutang"
                  onClick={handleLinkClick}
                  style={isActive("/piutang") ? styles.activeSub : styles.sub}
                >
                  Piutang
                </Link>
              </li>
            </>
          )}

          {/* ================= LAPORAN ================= */}
          <li style={styles.main} onClick={() => toggleCollapse("laporan")}>
            Catatan Laporan
          </li>

          {collapse.laporan && (
            <>
              <li>
                <Link
                  to="/laporan/kas"
                  onClick={handleLinkClick}
                  style={
                    isActive("/laporan/kas")
                      ? styles.activeSub
                      : styles.sub
                  }
                >
                  Laporan Kas
                </Link>
              </li>
              <li>
                <Link
                  to="/laporan/neraca"
                  onClick={handleLinkClick}
                  style={
                    isActive("/laporan/neraca")
                      ? styles.activeSub
                      : styles.sub
                  }
                >
                  Laporan Neraca
                </Link>
              </li>
              <li>
                <Link
                  to="/laporan/laba"
                  onClick={handleLinkClick}
                  style={
                    isActive("/laporan/laba")
                      ? styles.activeSub
                      : styles.sub
                  }
                >
                  Laporan Laba/Rugi
                </Link>
              </li>
            </>
          )}

          {/* ================= ASET ================= */}
          <li style={styles.main} onClick={() => toggleCollapse("aset")}>
            Aset
          </li>

          {collapse.aset && (
            <>
              <li>
                <Link
                  to="/aset/kategori"
                  onClick={handleLinkClick}
                  style={
                    isActive("/aset/kategori")
                      ? styles.activeSub
                      : styles.sub
                  }
                >
                  Kategori Aset
                </Link>
              </li>
              <li>
                <Link
                  to="/aset"
                  onClick={handleLinkClick}
                  style={isActive("/aset") ? styles.activeSub : styles.sub}
                >
                  Daftar Aset
                </Link>
              </li>
            </>
          )}

          <hr style={styles.hr} />

          <li>
            <Link
              to="/kategori"
              onClick={handleLinkClick}
              style={isActive("/kategori") ? styles.activeSub : styles.mainLink}
            >
              Kategori I/O
            </Link>
          </li>

          <li>
            <Link
              to="/profile"
              onClick={handleLinkClick}
              style={isActive("/profile") ? styles.activeSub : styles.mainLink}
            >
              Profile
            </Link>
          </li>

          <li style={styles.logout} onClick={logout}>
            Logout
          </li>

        </ul>
      </aside>
    </>
  );
}

const styles = {
  sidebar: {
    width: 260,
    background: "#ffffff",
    position: "fixed",
    top: 56,
    bottom: 0,
    paddingTop: 10,
    overflowY: "auto",
    transition: "left 0.25s ease",
    boxShadow: "2px 0 6px rgba(0,0,0,0.1)",
    fontFamily: "Roboto, sans-serif",
    zIndex: 1200,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.3)",
    zIndex: 1000,
  },

  ul: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },

  main: {
    padding: "10px 12px",
    fontWeight: 600,
    color: "#222",
    cursor: "pointer",
  },

  mainLink: {
    display: "block",
    padding: "10px 12px",
    fontWeight: 500,
    color: "#222",
    textDecoration: "none",
  },

  sub: {
    display: "block",
    padding: "6px 20px",
    fontSize: 14,
    color: "#555",
    textDecoration: "none",
  },

  activeSub: {
    display: "block",
    padding: "6px 20px",
    fontSize: 14,
    background: "#e3f2fd",
    color: "#1976d2",
    fontWeight: 600,
    textDecoration: "none",
  },

  logout: {
    padding: "10px 12px",
    color: "#d32f2f",
    fontWeight: 600,
    cursor: "pointer",
  },

  hr: {
    margin: "12px 0",
    border: "none",
    borderTop: "1px solid #eee",
  },
};