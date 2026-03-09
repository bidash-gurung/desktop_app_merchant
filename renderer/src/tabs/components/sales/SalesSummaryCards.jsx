// src/tabs/components/sales/SalesSummaryCards.jsx
import React from "react";

export default function SalesSummaryCards({ summary, rangeLabel }) {
  return (
    <div className="slCards">
      <div className="slCard slCardMini">
        <div className="slK">Total Sales</div>
        <div className="slV">{money(summary?.total_amount)}</div>
        <div className="slS">{rangeLabel}</div>
      </div>

      <div className="slCard slCardMini">
        <div className="slK">Orders</div>
        <div className="slV">
          {Number(summary?.orders_count || 0).toLocaleString()}
        </div>
        <div className="slS">Filtered rows</div>
      </div>

      <div className="slCard slCardMini">
        <div className="slK">Average / Order</div>
        <div className="slV">{money(summary?.avg_amount)}</div>
        <div className="slS">Based on filtered data</div>
      </div>
    </div>
  );
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "Nu. 0.00";
  return `Nu. ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
