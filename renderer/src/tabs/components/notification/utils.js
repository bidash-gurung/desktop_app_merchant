/* ===================== basic ===================== */
export function safeText(v, fallback = "—") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

export function isUnread(n) {
  if (!n || typeof n !== "object") return false;

  if ("is_read" in n) return Number(n.is_read ?? 0) === 0;

  const status = String(n.status || "")
    .trim()
    .toLowerCase();
  if (status) return status === "unread";

  return false;
}

/* ===================== ids / types ===================== */
export function pickFeedbackId(fb) {
  const id = fb?.rating_id ?? fb?.notification_id ?? fb?.id;
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** strict: only food | mart */
export function safeType(type, fallback = "food") {
  const t = String(type || "")
    .trim()
    .toLowerCase();
  if (t === "food" || t === "mart") return t;

  const f = String(fallback || "")
    .trim()
    .toLowerCase();
  if (f === "food" || f === "mart") return f;

  return "food";
}

/** tolerant: tries to detect "mart" from mixed values, otherwise food */
export function normalizeType(ownerType) {
  const t = String(ownerType || "")
    .trim()
    .toLowerCase();
  if (t === "mart" || t.includes("mart")) return "mart";
  if (t === "food" || t.includes("food")) return "food";
  return "food";
}

/* ===================== time ===================== */
export function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 19);
  return d.toLocaleString();
}

export function fmtRelativeTime({ hours_ago } = {}) {
  const h = Number(hours_ago);
  if (!Number.isFinite(h)) return "—";
  if (h <= 0) return "Just now";
  if (h === 1) return "1 hour ago";
  if (h < 24) return `${h} hours ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

/* ===================== rating / reply normalization ===================== */
export function normalizeFeedback(raw) {
  const fb = raw || {};
  const user = fb.user || {};

  const id = fb.id ?? fb.rating_id ?? fb.notification_id ?? null;

  return {
    ...fb,

    id,
    rating_id: fb.rating_id ?? fb.id ?? fb.notification_id ?? null,

    owner_type: fb.owner_type || fb.type || fb.rating_type || "",
    rating_type: fb.rating_type || fb.owner_type || fb.type || "",

    rating: fb.rating ?? fb.stars ?? null,
    comment: fb.comment ?? fb.message ?? fb.text ?? "",
    likes_count: Number(fb.likes_count ?? fb.likes ?? 0),

    created_at: fb.created_at ?? fb.ts ?? fb.date ?? null,
    hours_ago: fb.hours_ago ?? null,

    user_name: user.user_name ?? fb.user_name ?? fb.customer_name ?? null,
    profile_image: user.profile_image ?? fb.profile_image ?? null,

    replies: Array.isArray(fb.replies) ? fb.replies : [],
    reply_count:
      Number(
        fb.reply_count ?? (Array.isArray(fb.replies) ? fb.replies.length : 0),
      ) || 0,
  };
}

export function normalizeReply(raw) {
  const r = raw || {};
  const user = r.user || {};

  return {
    ...r,

    id: r.id ?? r.reply_id ?? null,
    reply_id: r.reply_id ?? r.id ?? null,

    text: r.text ?? r.message ?? r.reply ?? "",
    message: r.text ?? r.message ?? r.reply ?? "",

    ts: r.ts ?? r.created_at ?? null,
    created_at: r.created_at ?? r.ts ?? null,
    hours_ago: r.hours_ago ?? null,

    user_id: r.user_id ?? user.user_id ?? null,
    user_name: user.user_name ?? r.user_name ?? null,
    profile_image: user.profile_image ?? r.profile_image ?? null,
  };
}

/* ===================== ui helpers ===================== */
export function starsText(n) {
  const x = Math.max(0, Math.min(5, Number(n) || 0));
  return "★★★★★".slice(0, x) + "☆☆☆☆☆".slice(0, 5 - x);
}

/** used by NotificationCard.jsx */
export function toneFromType(value) {
  const raw =
    typeof value === "object"
      ? value?.type || value?.status || value?.title || ""
      : value || "";

  const t = String(raw).trim().toLowerCase();

  if (
    t === "success" ||
    t === "ok" ||
    t === "paid" ||
    t === "completed" ||
    t === "delivered" ||
    t.includes("success")
  )
    return "success";

  if (
    t === "warn" ||
    t === "warning" ||
    t === "pending" ||
    t === "scheduled" ||
    t === "expired" ||
    t.includes("wallet_update")
  )
    return "warn";

  if (
    t === "danger" ||
    t === "error" ||
    t === "failed" ||
    t === "cancelled" ||
    t === "canceled" ||
    t === "rejected"
  )
    return "danger";

  return "neutral";
}
