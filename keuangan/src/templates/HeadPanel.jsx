import React from "react";
import { useNavigate } from "react-router-dom";

export default function HeadPanel() {
  const navigate = useNavigate();

  const toggleMenu = () => {
    document.dispatchEvent(new Event("toggle-menu"));
  };

  return (
    <header style={styles.header}>
      <button style={styles.menuBtn} onClick={toggleMenu}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="white"
      >
        <rect y="4" width="24" height="2" />
        <rect y="11" width="24" height="2" />
        <rect y="18" width="24" height="2" />
      </svg>
    </button>


      <h2 style={styles.title} onClick={() => navigate("/dashboard")}>
        FlowIO App
      </h2>
    </header>
  );
}

const styles = {
  header: {
    height: 56,
    background: "#1976d2",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    position: "fixed",
    width: "100%",
    zIndex: 1000,
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },

  title: {
    margin: 0,
    marginLeft: 12,
    fontWeight: 500,
    cursor: "pointer",
    color: "#fff"
  },

  menuBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 6,
  }
  ,
};
