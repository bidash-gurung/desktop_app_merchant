// src/tabs/SalesTab.jsx
import React, { useMemo, useRef, useState } from "react";
import "./components/sales/css/sales.css";

import SalesHeader from "./components/sales/SalesHeader";
import SalesFilters from "./components/sales/SalesFilters";
import SalesSummaryCards from "./components/sales/SalesSummaryCards";
import SalesChart from "./components/sales/SalesChart";
import SalesTable from "./components/sales/SalesTable";

import { useSalesData } from "./components/sales/useSalesData";
import {
  aggregateForChart,
  filterRows,
  getBusinessIdFromSession,
  getTokenFromSession,
  parseApiDate,
  sumAmounts,
  toISODateLocal,
} from "./components/sales/utils";

export default function SalesTab({ session }) {
  const token = useMemo(() => getTokenFromSession(session), [session]);
  const businessId = useMemo(
    () => getBusinessIdFromSession(session),
    [session],
  );

  // Default filter: current month
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [mode, setMode] = useState("month"); // "day" | "week" | "month"
  const [day, setDay] = useState(toISODateLocal(today)); // YYYY-MM-DD
  const [from, setFrom] = useState(
    toISODateLocal(
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
    ),
  );
  const [to, setTo] = useState(toISODateLocal(today));
  const [month, setMonth] = useState(defaultMonth); // YYYY-MM

  const reportRef = useRef(null);

  const { loading, error, data, refetch } = useSalesData({
    businessId,
    token,
  });

  const allRows = useMemo(() => {
    const rows = data?.rows || [];
    // normalize date -> Date object once
    return rows.map((r) => ({
      ...r,
      _dateObj: parseApiDate(r?.date),
      _amount: Number(r?.total_amount ?? 0) || 0,
      _orderId: String(r?.order_id || ""),
    }));
  }, [data]);

  const filtered = useMemo(() => {
    return filterRows(allRows, { mode, day, from, to, month });
  }, [allRows, mode, day, from, to, month]);

  const summary = useMemo(() => {
    const total = sumAmounts(filtered);
    const orders = filtered.length;
    const avg = orders > 0 ? total / orders : 0;

    return {
      total_amount: total,
      orders_count: orders,
      avg_amount: avg,
      rows_count: orders,
    };
  }, [filtered]);

  const chartData = useMemo(() => {
    return aggregateForChart(filtered, { mode, day, from, to, month });
  }, [filtered, mode, day, from, to, month]);

  const rangeLabel = useMemo(() => {
    if (mode === "day") return `Day: ${day}`;
    if (mode === "week") return `Range: ${from} → ${to}`;
    return `Month: ${month}`;
  }, [mode, day, from, to, month]);

  return (
    <div className="slWrap">
      <SalesHeader
        title="Sales"
        subtitle="Earnings report (Graph + Export)"
        loading={loading}
        onRefresh={refetch}
        businessId={businessId}
      />

      <SalesFilters
        mode={mode}
        setMode={setMode}
        day={day}
        setDay={setDay}
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
        month={month}
        setMonth={setMonth}
        onExportPdf={() => {
          // Lazy import to avoid making initial bundle larger
          import("./components/sales/exportPdf").then(({ exportNodeToPdf }) => {
            exportNodeToPdf({
              node: reportRef.current,
              filename: `sales-report_${mode}_${mode === "month" ? month : mode === "day" ? day : `${from}_to_${to}`}.pdf`,
              title: `Sales Report • ${rangeLabel}`,
            });
          });
        }}
        exportDisabled={!filtered.length}
      />

      {error ? (
        <div className="slError">
          <div className="slErrorTitle">Failed to load sales</div>
          <div className="slErrorMsg">{error}</div>
        </div>
      ) : null}

      <div ref={reportRef} className="slReport">
        <div className="slTopRow">
          <SalesSummaryCards summary={summary} rangeLabel={rangeLabel} />
          <div className="slMiniMeta">
            {/* <div className="slMiniMetaRow">
              <span className="slMiniK">Business ID</span>
              <span className="slMiniV">{businessId ?? "—"}</span>
            </div> */}
            <div className="slMiniMetaRow">
              <span className="slMiniK">Records</span>
              <span className="slMiniV">{filtered.length}</span>
            </div>
            <div className="slMiniMetaRow">
              <span className="slMiniK">Total</span>
              <span className="slMiniV">
                {formatMoney(summary.total_amount)}
              </span>
            </div>
          </div>
        </div>

        <div className="slCard">
          <div className="slCardHead">
            <div>
              <div className="slCardTitle">Sales Trend</div>
              <div className="slCardSub">
                {mode === "day"
                  ? "Orders in selected day"
                  : mode === "week"
                    ? "Daily totals in selected range"
                    : "Daily totals in selected month"}
              </div>
            </div>
          </div>

          <div className="slChartBox">
            <SalesChart data={chartData} />
          </div>
        </div>

        <div className="slCard">
          <div className="slCardHead slCardHeadRow">
            <div>
              <div className="slCardTitle">Orders</div>
              <div className="slCardSub">Filtered rows</div>
            </div>

            <div className="slTotalsPill">
              <span className="slTotalsPillLabel">Total:</span>
              <span className="slTotalsPillVal">
                {formatMoney(sumAmounts(filtered))}
              </span>
            </div>
          </div>

          <SalesTable rows={filtered} />
        </div>
      </div>
    </div>
  );
}

function formatMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "Nu. 0.00";
  return `Nu. ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
