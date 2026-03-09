// src/tabs/components/wallets/utils/exportPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { moneyNu } from "../walletUtils";

/* ---------------- helpers ---------------- */

function safeStr(v) {
  return String(v ?? "").trim();
}

function parseNote(note) {
  const s = safeStr(note);
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

function pickDateLabel(r) {
  return safeStr(r?.created_at_local || r?.created_at || "—");
}

function resolveFromTo(r) {
  const dir = safeStr(r?.direction).toUpperCase();
  const from = dir === "CR" ? r?.counterparty_wallet_id : r?.wallet_id;
  const to = dir === "CR" ? r?.wallet_id : r?.counterparty_wallet_id;

  return {
    dir: dir || "—",
    from: safeStr(from) || "—",
    to: safeStr(to) || "—",
  };
}

function hardWrap(doc, text, maxWidth) {
  let s = safeStr(text);
  if (!s) return "";

  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/([\/\\_\-\:\.\,\;\|\(\)\[\]\{\}])/g, "$1 ");

  const words = s.split(" ").filter(Boolean);
  const lines = [];
  let line = "";

  const push = (v) => {
    const t = safeStr(v);
    if (t) lines.push(t);
  };

  const breakLongToken = (token) => {
    let chunk = "";
    for (let i = 0; i < token.length; i++) {
      const next = chunk + token[i];
      if (doc.getTextWidth(next) <= maxWidth) {
        chunk = next;
      } else {
        push(chunk);
        chunk = token[i];
      }
    }
    if (chunk) push(chunk);
  };

  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;

    if (doc.getTextWidth(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) {
      push(line);
      line = "";
    }

    if (doc.getTextWidth(w) > maxWidth) {
      breakLongToken(w);
    } else {
      line = w;
    }
  }

  if (line) push(line);

  return lines.join("\n");
}

/**
 * ✅ Perfectly equal left/right spacing:
 * - Compute full table width (sum of column widths)
 * - left = right = (pageWidth - tableWidth)/2  (clamped)
 */
export function exportTransactionsToPdf({
  businessName = "Merchant",
  walletId = "",
  fromDate = "",
  toDate = "",
  rows = [],
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const title = "Wallet Transaction History";
  const exportedAt = new Date().toLocaleString();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 40, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Business: ${businessName || "—"}`, 40, 62);
  doc.text(`Wallet: ${walletId || "—"}`, 40, 78);
  doc.text(`Date range: ${fromDate || "—"} to ${toDate || "—"}`, 40, 94);
  doc.text(`Exported at: ${exportedAt}`, 40, 110);

  const head = [
    [
      "Txn ID",
      "Journal",
      "From",
      "To",
      "Dir",
      "Amount",
      "Date",
      "Remark / Note",
    ],
  ];

  // Column widths
  const COL = {
    txn: 120,
    jrn: 105,
    from: 86,
    to: 86,
    dir: 34,
    amt: 64,
    date: 110,
    remark: 235,
  };

  const tableWidth =
    COL.txn +
    COL.jrn +
    COL.from +
    COL.to +
    COL.dir +
    COL.amt +
    COL.date +
    COL.remark;

  const pageWidth = doc.internal.pageSize.getWidth();

  // ✅ equal margins (no fallback bias). Clamp so it never becomes too tiny.
  let marginLR = Math.floor((pageWidth - tableWidth) / 2);
  if (!Number.isFinite(marginLR)) marginLR = 40;
  if (marginLR < 24) marginLR = 24; // minimum safe margin

  const remarkMaxTextWidth = COL.remark - 14;

  const body = (rows || []).map((r) => {
    const { dir, from, to } = resolveFromTo(r);
    const remarkRaw = parseNote(r?.note) || "—";
    const remarkWrapped = hardWrap(doc, remarkRaw, remarkMaxTextWidth);

    return [
      safeStr(r?.transaction_id) || "—",
      safeStr(r?.journal_code) || "—",
      from,
      to,
      dir,
      moneyNu(r?.amount) || "—",
      pickDateLabel(r),
      remarkWrapped,
    ];
  });

  const TOTAL_TOKEN = "__TOTAL_PAGES__";

  autoTable(doc, {
    head,
    body,
    startY: 130,

    // ✅ equal margins = equal left/right space
    margin: { left: marginLR, right: marginLR },

    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
      valign: "top",
      overflow: "linebreak",
      lineColor: 200,
      lineWidth: 0.2,
    },
    headStyles: { fontStyle: "bold", fontSize: 9 },
    columnStyles: {
      0: { cellWidth: COL.txn },
      1: { cellWidth: COL.jrn },
      2: { cellWidth: COL.from },
      3: { cellWidth: COL.to },
      4: { cellWidth: COL.dir, halign: "center" },
      5: { cellWidth: COL.amt, halign: "right" },
      6: { cellWidth: COL.date },
      7: { cellWidth: COL.remark, overflow: "linebreak" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 7) {
        data.cell.styles.fontSize = 8;
        data.cell.styles.overflow = "linebreak";
      }
    },
    didDrawPage: () => {
      const page = doc.internal.getCurrentPageInfo().pageNumber;
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Page ${page} of ${TOTAL_TOKEN}`, w - 160, h - 18);
    },
  });

  // Replace placeholder with total pages on every page
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    doc.setFillColor(255, 255, 255);
    doc.rect(w - 180, h - 34, 175, 22, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Page ${i} of ${totalPages}`, w - 160, h - 18);
  }

  const fname = `wallet-transactions-${walletId || "wallet"}-${fromDate || "from"}_to_${toDate || "to"}.pdf`;
  doc.save(fname);
}
