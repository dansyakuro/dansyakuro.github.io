import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import SideMenu from "./SideMenu";
import HeadPanel from "./HeadPanel";

export default function TemplateLogin() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [menuOpen, setMenuOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setMenuOpen(!mobile);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const toggle = () => {
      setMenuOpen((prev) => !prev);
    };

    document.addEventListener("toggle-menu", toggle);
    return () => document.removeEventListener("toggle-menu", toggle);
  }, []);

  return (
    <div style={styles.wrapper}>
      <SideMenu open={menuOpen} isMobile={isMobile} />

      {/* HeadPanel tetap full */}
      <HeadPanel />

      {/* 🔥 marginLeft hanya untuk content */}
      <div
        style={{
          ...styles.content,
          marginLeft: !isMobile && menuOpen ? 260 : 0,
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    height: "100vh",
    background: "#f4f6f8",
  },

  content: {
    marginTop: 56,
    padding: 16,
    height: "calc(100vh - 56px)",
    overflow: "auto",
    flex: 1,
    transition: "margin-left 0.25s ease",
  },
};