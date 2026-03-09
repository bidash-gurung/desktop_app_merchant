// src/tabs/components/sales/SalesTable.jsx
import React, { useMemo, useState } from "react";
import { toISODateLocal } from "./utils";

export default function SalesTable({ rows }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = String(q || "")
      .trim()
      .toLowerCase();
    if (!term) return rows;

    return rows.filter((r) => {
      const oid = String(r?._orderId || r?.order_id || "").toLowerCase();
      const dt = r?._dateObj ? toISODateLocal(r._dateObj) : "";
      return oid.includes(term) || dt.includes(term);
    });
  }, [rows, q]);

  return (
    <div className="slTableWrap">
      <div className="slTableTop">
        <div className="slSearch">
          <input
            className="slInput"
            placeholder="Search by order id or date…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="slMuted">
          Showing <b>{filtered.length}</b> / {rows.length}
        </div>
      </div>

      <div className="slTableScroll">
        <table className="slTable">
          <thead>
            <tr>
              <th style={{ width: 170 }}>Order ID</th>
              <th style={{ width: 140 }}>Date</th>
              <th style={{ width: 140, textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered
                .slice()
                .sort(
                  (a, b) =>
                    (b?._dateObj?.getTime?.() || 0) -
                    (a?._dateObj?.getTime?.() || 0),
                )
                .map((r, idx) => (
                  <tr key={`${r?._orderId || r?.order_id || "row"}-${idx}`}>
                    <td className="slTdMono">
                      {r?._orderId || r?.order_id || "—"}
                    </td>
                    <td>{r?._dateObj ? toISODateLocal(r._dateObj) : "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      {money(r?._amount ?? r?.total_amount ?? 0)}
                    </td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan={3} className="slEmptyRow">
                  No rows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "Nu. 0.00";
  return `Nu. ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
