const MEDIA_BASE = import.meta.env.VITE_MEDIA_BASE_URL || "https://grab.newedge.bt";

// Scheduled-only prefixes (as you requested)
const FOOD_SCHED_PREFIX = import.meta.env.VITE_MENU_IMAGE_ENDPOINT || "https://grab.newedge.bt/food";
const MART_SCHED_PREFIX = import.meta.env.VITE_ITEM_IMAGE_ENDPOINT || "https://grab.newedge.bt/mart";

export const ORDER_ENDPOINT = import.meta.env.VITE_ORDER_ENDPOINT; // .../orders/orders/business/{businessId}/grouped
export const SCHEDULED_ORDER_ENDPOINT = import.meta.env.VITE_SCHEDULED_ORDER_ENDPOINT; // .../orders/api/scheduled-orders/business/{business_Id}

export function safeLower(v) {
  return String(v || "").trim().toLowerCase();
}

export function safeJson(res) {
  return res.json().catch(() => null);
}

export function msgFrom(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return payload.message || payload.error || payload.msg || "";
}

export function moneyNu(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `Nu. ${n.toFixed(2)}`;
}

export function shortStatusLabel(s) {
  return String(s || "").replaceAll("_", " ");
}

export function normalizeStatus(status) {
  const s = String(status || "").toUpperCase();
  // Tabs you want:
  // Pending, Confirmed, Ready, Assigned, Out for delivery, Scheduled
  if (s === "PENDING") return "PENDING";
  if (s === "CONFIRMED") return "CONFIRMED";
  if (s === "READY") return "READY";
  if (s === "ASSIGNED") return "ASSIGNED";
  if (s === "OUT_FOR_DELIVERY") return "OUT_FOR_DELIVERY";
  return s; // keep others (DECLINED etc.) but they won't be shown unless you add a tab
}

export function joinUrl(prefix, path) {
  if (!path) return "";
  const p = String(path).trim();
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;

  const base = String(prefix || "").trim();
  if (!base) return p;

  const baseNoSlash = base.endsWith("/") ? base.slice(0, -1) : base;
  const pathSlash = p.startsWith("/") ? p : `/${p}`;
  return `${baseNoSlash}${pathSlash}`;
}

/**
 * NORMAL orders image rule:
 * - if MART and path is relative -> prefix with VITE_MEDIA_BASE_URL
 * - if FOOD -> use as-is if absolute; if relative, also prefix with VITE_MEDIA_BASE_URL (safe fallback)
 */
export function resolveOrderItemImage(order, item) {
  const service = String(order?.service_type || "").toUpperCase();
  const raw = item?.item_image || "";
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  if (service === "MART") return joinUrl(MEDIA_BASE, raw);
  // Food: you said “directly display from url fetched”, but in case backend sends relative, fallback:
  return joinUrl(MEDIA_BASE, raw);
}

/**
 * SCHEDULED orders image rule (your exact request):
 * - use VITE_ITEM_IMAGE_ENDPOINT for MART
 * - use VITE_MENU_IMAGE_ENDPOINT for FOOD
 */
export function resolveScheduledItemImage(job) {
  const service = String(job?.order_payload?.service_type || "").toUpperCase();
  const items = job?.order_payload?.items || [];
  const first = items[0] || {};
  const raw = first?.item_image || (job?.order_payload?.item_images?.[0] || "");
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  if (service === "MART") return joinUrl(MART_SCHED_PREFIX, raw);
  return joinUrl(FOOD_SCHED_PREFIX, raw);
}

/**
 * Flatten grouped response:
 * data: [{ user, orders: [] }, ...] -> [{...order, _user}, ...]
 */
export function flattenGroupedOrders(groupedData) {
  const out = [];
  (groupedData || []).forEach((block) => {
    const u = block?.user || {};
    (block?.orders || []).forEach((o) => {
      out.push({ ...o, _user: u });
    });
  });
  return out;
}

export function pickFirstItem(order) {
  const items = order?.items || [];
  return items[0] || null;
}

export function itemsCount(order) {
  const items = order?.items || [];
  return items.reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0);
}

export function matchSearch(order, needle) {
  const q = safeLower(needle);
  if (!q) return true;

  const oid = safeLower(order?.order_id);
  const addr = safeLower(order?.deliver_to?.address);
  const reason = safeLower(order?.status_reason);
  const pay = safeLower(order?.payment_method);
  const svc = safeLower(order?.service_type);
  const custName = safeLower(order?._user?.name);
  const custPhone = safeLower(order?._user?.phone);

  const items = (order?.items || [])
    .map((it) => safeLower(it?.item_name))
    .join(" ");

  return (
    oid.includes(q) ||
    addr.includes(q) ||
    items.includes(q) ||
    reason.includes(q) ||
    pay.includes(q) ||
    svc.includes(q) ||
    custName.includes(q) ||
    custPhone.includes(q)
  );
}

export function matchSearchScheduled(job, needle) {
  const q = safeLower(needle);
  if (!q) return true;

  const jid = safeLower(job?.job_id);
  const name = safeLower(job?.name);
  const items = (job?.order_payload?.items || [])
    .map((it) => safeLower(it?.item_name))
    .join(" ");
  const addr = safeLower(job?.order_payload?.delivery_address?.address);
  const phone = safeLower(job?.order_payload?.phone);

  return jid.includes(q) || name.includes(q) || items.includes(q) || addr.includes(q) || phone.includes(q);
}
