// src/tabs/components/sales/SalesFilters.jsx
import React from "react";

export default function SalesFilters({
  mode,
  setMode,
  day,
  setDay,
  from,
  setFrom,
  to,
  setTo,
  month,
  setMonth,
  onExportPdf,
  exportDisabled,
}) {
  return (
    <div className="slToolbar">
      <div className="slSegment">
        <button
          type="button"
          className={`slSegBtn ${mode === "day" ? "active" : ""}`}
          onClick={() => setMode("day")}
        >
          Day
        </button>
        <button
          type="button"
          className={`slSegBtn ${mode === "week" ? "active" : ""}`}
          onClick={() => setMode("week")}
        >
          Week
        </button>
        <button
          type="button"
          className={`slSegBtn ${mode === "month" ? "active" : ""}`}
          onClick={() => setMode("month")}
        >
          Month
        </button>
      </div>

      <div className="slFilters">
        {mode === "day" ? (
          <div className="slField">
            <label className="slLabel">Date</label>
            <input
              className="slInput"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </div>
        ) : null}

        {mode === "week" ? (
          <>
            <div className="slField">
              <label className="slLabel">From</label>
              <input
                className="slInput"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="slField">
              <label className="slLabel">To</label>
              <input
                className="slInput"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </>
        ) : null}

        {mode === "month" ? (
          <div className="slField">
            <label className="slLabel">Month</label>
            <input
              className="slInput"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        ) : null}

        <div className="slActions">
          <button
            type="button"
            className="slBtn slBtnPrimary"
            onClick={onExportPdf}
            disabled={exportDisabled}
            title={
              exportDisabled ? "No data to export" : "Export report to PDF"
            }
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
