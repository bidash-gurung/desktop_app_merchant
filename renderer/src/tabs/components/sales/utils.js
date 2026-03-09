// src/tabs/components/sales/utils.js

export function safeJson(res) {
  try {
    return res.json();
  } catch {
    return null;
  }
}

export function extractMessage(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return payload.message || payload.error || payload.msg || "";
}

export function buildUrl(base, id) {
  if (!base) return "";
  if (base.includes("{business_id}"))
    return base.replace("{business_id}", String(id));
  return base.endsWith("/") ? `${base}${id}` : `${base}/${id}`;
}

export function getTokenFromSession(session) {
  const payload = session?.payload || session || {};
  return (
    payload?.token?.access_token ||
    payload?.data?.token?.access_token ||
    payload?.access_token ||
    payload?.data?.access_token ||
    null
  );
}

export function getBusinessIdFromSession(session) {
  const payload = session?.payload || session || {};
  const user = payload?.user || payload?.data?.user || null;

  return (
    user?.business_id ??
    payload?.business_id ??
    payload?.data?.business_id ??
    user?.businessId ??
    null
  );
}

/** API date looks like: "Sun Feb 01 2026 00:00:00 GMT+0000 (...)" */
export function parseApiDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** local YYYY-MM-DD */
export function toISODateLocal(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** date-only key in local time */
export function dateKeyLocal(d) {
  if (!d) return "";
  return toISODateLocal(d);
}

export function sumAmounts(rows) {
  return rows.reduce(
    (acc, r) => acc + (Number(r?._amount ?? r?.total_amount ?? 0) || 0),
    0,
  );
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function filterRows(rows, { mode, day, from, to, month }) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // discard rows with invalid date
  const base = rows.filter(
    (r) => r?._dateObj instanceof Date && !Number.isNaN(r._dateObj.getTime()),
  );

  if (mode === "day") {
    const d = new Date(`${day}T00:00:00`);
    const a = startOfDay(d);
    const b = endOfDay(d);
    return base.filter((r) => r._dateObj >= a && r._dateObj <= b);
  }

  if (mode === "week") {
    const a = startOfDay(new Date(`${from}T00:00:00`));
    const b = endOfDay(new Date(`${to}T00:00:00`));
    return base.filter((r) => r._dateObj >= a && r._dateObj <= b);
  }

  // month: month = YYYY-MM
  const [yy, mm] = String(month)
    .split("-")
    .map((x) => Number(x));
  if (!yy || !mm) return base;

  const a = new Date(yy, mm - 1, 1, 0, 0, 0, 0);
  const b = new Date(yy, mm, 0, 23, 59, 59, 999); // last day of month
  return base.filter((r) => r._dateObj >= a && r._dateObj <= b);
}

/**
 * Chart data:
 * - day: per-order points (x=order_id, y=amount)
 * - week/month: per-day totals (x=YYYY-MM-DD, y=sum)
 */
export function aggregateForChart(rows, { mode }) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  if (mode === "day") {
    // keep top N orders for readability, but not required; show all
    return rows
      .slice()
      .sort(
        (a, b) =>
          (a._dateObj?.getTime?.() || 0) - (b._dateObj?.getTime?.() || 0),
      )
      .map((r) => ({
        label: r._orderId || "—",
        amount: Number(r._amount || 0),
      }));
  }

  // week/month => group by day (local)
  const map = new Map();
  for (const r of rows) {
    const k = dateKeyLocal(r._dateObj);
    map.set(k, (map.get(k) || 0) + Number(r._amount || 0));
  }

  const out = Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => ({ label: k, amount: v }));

  return out;
}
