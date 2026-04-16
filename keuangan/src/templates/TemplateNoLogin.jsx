import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";


export default function TemplateNoLogin() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
  
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user,
      password: password,
    });
  
    if (error) {
      alert("Login gagal: " + error.message);
    } else {
      navigate("/book");
    }
  };
  

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Login</h2>

        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="text"
            placeholder="Username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <button type="submit" style={styles.button}>
            Masuk
          </button>
        </form>

        <p style={styles.footer}>Keuangan App</p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily: "Segoe UI, Arial, sans-serif",
  },
  card: {
    background: "#ffffff",
    padding: "36px 32px",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 15px 35px rgba(0,0,0,0.25)",
    textAlign: "center",
  },
  title: {
    marginBottom: "24px",
    fontSize: "26px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "0.5px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
    transition: "0.2s",
  },
  button: {
    marginTop: "6px",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#3b82f6",
    color: "#ffffff",
    fontWeight: "600",
    fontSize: "15px",
    cursor: "pointer",
    transition: "0.2s",
  },
  footer: {
    marginTop: "18px",
    fontSize: "12px",
    color: "#64748b",
  },
};
