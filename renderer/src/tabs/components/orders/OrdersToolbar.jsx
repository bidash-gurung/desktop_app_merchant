import React from "react";
import "./css/ordersToolbar.css";

export default function OrdersToolbar({
  tab,
  setTab,
  q,
  setQ,
  counts,
  loading,
  onRefresh,
}) {
  const tabs = [
    { key: "PENDING", label: "Pending" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "READY", label: "Ready" },
    { key: "ASSIGNED", label: "Assigned" },
    { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
    { key: "SCHEDULED", label: "Scheduled" },
  ];

  return (
    <div className="otWrap">
      <div className="otTabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`otTab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span className="otTabLabel">{t.label}</span>
            <span className="otTabCount">{counts?.[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="otBar">
        <div className="otSearch">
          <span className="otSearchIcon">🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order id, address, item name..."
          />
          {q ? (
            <button className="otClear" type="button" onClick={() => setQ("")}>
              ×
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className="otBtn"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );
}
