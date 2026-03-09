// src/tabs/components/wallets/TransactionHistoryCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { TRANSACTION_HISTORY_ENDPOINT, buildUrl } from "./walletApi";
import { safeJson, extractMessage, moneyNu } from "./walletUtils";

// ✅ NEW: jsPDF export (no blank window)
import { exportTransactionsToPdf } from "./utils/exportPdf";

/* ---------------- helpers ---------------- */

function parseNote(note) {
  const s = String(note || "").trim();
  if (!s) return "";
  try {
    const obj = JSON.parse(s);
    if (obj && typeof obj === "object") {
      const reason = obj.reason ? `Reason: ${obj.reason}` : "";
      const ride =
        obj.ride_id !== undefined && obj.ride_id !== null
          ? `Ride: #${obj.ride_id}`
          : "";
      const svc = obj.service_type ? `Service: ${obj.service_type}` : "";
      const parts = [reason, ride, svc].filter(Boolean);
      return parts.length ? parts.join(" • ") : s;
    }
    return s;
  } catch {
    return s;
  }
}

function toDateInputValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function inRange(dateObj, fromStr, toStr) {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj)) return false;

  const fromOk = fromStr ? dateObj >= new Date(`${fromStr}T00:00:00`) : true;
  const toOk = toStr ? dateObj <= new Date(`${toStr}T23:59:59`) : true;

  return fromOk && toOk;
}

function pickDateRaw(r) {
  // Prefer ISO created_at for correct parsing; fallback to local string
  return r?.created_at || r?.created_at_local || "";
}

function dateLabel(r) {
  return r?.created_at_local || r?.created_at || "—";
}

function resolveFromTo(r) {
  // API fields: wallet_id + counterparty_wallet_id + direction ("CR"/"DR")
  const dir = String(r?.direction || "").toUpperCase();

  // Interpret:
  // - CR => this wallet received from counterparty
  // - DR => this wallet sent to counterparty
  // If any missing, fallback to "—"
  const from = dir === "CR" ? r?.counterparty_wallet_id : r?.wallet_id;
  const to = dir === "CR" ? r?.wallet_id : r?.counterparty_wallet_id;

  return {
    dir,
    from: from || "—",
    to: to || "—",
  };
}

export default function TransactionHistoryCard({
  walletId,
  token,
  businessName,
}) {
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);

  // Date range (default: last 30 days)
  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [toDate, setToDate] = useState(() => toDateInputValue(today));

  async function load() {
    setErr("");
    setLoading(true);

    try {
      if (!TRANSACTION_HISTORY_ENDPOINT) {
        setErr("Missing env: VITE_TANSACTION_HISTORY_ENDPOINT");
        setRows([]);
        setCount(0);
        return;
      }
      if (!walletId) {
        setErr("Wallet ID missing.");
        setRows([]);
        setCount(0);
        return;
      }

      const url = buildUrl(TRANSACTION_HISTORY_ENDPOINT, walletId);
      const res = await fetch(url, { method: "GET", headers });
      const out = await safeJson(res);

      if (!res.ok) {
        setErr(extractMessage(out) || `Fetch failed (${res.status})`);
        setRows([]);
        setCount(0);
        return;
      }

      const list = Array.isArray(out?.data) ? out.data : [];
      setCount(Number(out?.count || list.length || 0));

      // ✅ Filter by range + sort latest first + take latest 20
      const filtered = list
        .filter((r) => {
          const raw = pickDateRaw(r);
          const dt = raw ? new Date(raw) : null;
          return inRange(dt, fromDate, toDate);
        })
        .sort((a, b) => {
          const da = new Date(pickDateRaw(a) || 0).getTime();
          const db = new Date(pickDateRaw(b) || 0).getTime();
          return db - da;
        })
        .slice(0, 20);

      setRows(filtered);
    } catch (e) {
      setErr(e?.message || "Network error fetching transactions.");
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletId]);

  const onExportPdf = () => {
    // ✅ No window.open → avoids blank Electron window
    exportTransactionsToPdf({
      businessName: businessName || "Merchant",
      walletId,
      status: "", // optional (pass wallet.status from parent if you want)
      fromDate,
      toDate,
      rows: rows.map((r) => {
        const { dir, from, to } = resolveFromTo(r);
        return {
          ...r,
          direction: dir,
          wallet_id: from === "—" ? r.wallet_id : from, // keep original fields but ensure table works
          counterparty_wallet_id: to === "—" ? r.counterparty_wallet_id : to,
        };
      }),
    });
  };

  return (
    <div className="wlCard wlCardWide">
      <div className="wlCardTop">
        <div>
          <div className="wlCardTitle">Transaction History</div>
          <div className="wlCardSub">
            Showing <b>last 20</b> transactions (filtered by date range).
          </div>
        </div>

        <div className="wlActionsInline">
          <div className="wlDateRow">
            <div className="wlDateField">
              <div className="wlDateLabel">From</div>
              <input
                type="date"
                className="wlInput wlInputDate"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="wlDateField">
              <div className="wlDateLabel">To</div>
              <input
                type="date"
                className="wlInput wlInputDate"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            className="wlBtn wlBtnSecondary"
            onClick={load}
            disabled={loading}
            title="Refresh"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            type="button"
            className="wlBtn wlBtnPrimary"
            onClick={onExportPdf}
            disabled={!rows.length}
            title="Export as PDF"
          >
            Export PDF
          </button>
        </div>
      </div>

      {err ? <div className="wlInlineErr">{err}</div> : null}

      <div className="wlCountRow">
        <div className="wlCountText">
          {count ? `${count} record(s)` : "No record"}
        </div>
      </div>

      <div className="wlTableWrap">
        <table className="wlTable">
          <thead>
            <tr>
              <th className="wlColTxn">Txn ID</th>
              <th className="wlColJrn">Journal</th>
              <th className="wlColFrom">From</th>
              <th className="wlColTo">To</th>
              <th className="wlColDir">Dir</th>
              <th className="right wlColAmt">Amount</th>
              <th className="wlColDate">Date</th>
              <th className="wlColRemark">Remark</th>
            </tr>
          </thead>

          <tbody>
            {!rows.length ? (
              <tr>
                <td colSpan={8} className="wlEmptyMini">
                  No transactions found for the selected date range.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const { dir, from, to } = resolveFromTo(r);
                const remark = parseNote(r.note);
                const dt = dateLabel(r);

                return (
                  <tr key={r.transaction_id}>
                    <td className="wlMono wlCellWrap">{r.transaction_id}</td>
                    <td className="wlMono wlCellWrap">{r.journal_code}</td>
                    <td className="wlMono wlCellWrap">{from}</td>
                    <td className="wlMono wlCellWrap">{to}</td>
                    <td>
                      <span
                        className={`wlDirPill ${dir === "CR" ? "cr" : "dr"}`}
                      >
                        {dir || "—"}
                      </span>
                    </td>
                    <td className="right">{moneyNu(r.amount)}</td>
                    <td className="wlCellWrap">{dt}</td>
                    <td className="wlRemarkCell">
                      {remark ? (
                        <div className="wlRemarkText">{remark}</div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="wlFooterHint">
        Tip: Select a date range then click <b>Export PDF</b>.
      </div>
    </div>
  );
}
