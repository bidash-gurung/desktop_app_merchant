// src/tabs/components/sales/SalesHeader.jsx
import React from "react";

export default function SalesHeader({ title, subtitle, loading, onRefresh }) {
  return (
    <div className="slHeader">
      <div>
        <h2 className="slTitle">{title}</h2>
        <div className="slSub">{subtitle}</div>
      </div>

      <div className="slHeaderRight">
        <button
          type="button"
          className="slBtn slBtnGhost"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );
}
