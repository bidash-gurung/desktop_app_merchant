// src/auth/SplashScreen.jsx
import React from "react";
import "./css/auth.css";

export default function SplashScreen() {
  return (
    <div className="page">
      <div className="splashWrap">
        <img className="logo" src="/logo/logo.png" alt="Logo" />
        <div className="muted">Loading…</div>
      </div>
    </div>
  );
}
