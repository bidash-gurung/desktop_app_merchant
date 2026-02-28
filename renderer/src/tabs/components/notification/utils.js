// src/tabs/components/notification/utils.js

export function safeText(v, fallback = "—") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

export function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 19);
  return d.toLocaleString();
}

export function isUnread(item) {
  return Number(item?.is_read ?? item?.isRead ?? 0) === 0;
}

/**
 * Identify "feedback-ish" notifications.
 * Adjust these checks based on your actual notification.type values.
 */
export function isFeedbackNotification(item) {
  const type = String(item?.type || "").toLowerCase();
  const title = String(item?.title || "").toLowerCase();
  const body = String(item?.body_preview || item?.message || "").toLowerCase();

  return (
    type.includes("feedback") ||
    type.includes("rating") ||
    type.includes("review") ||
    title.includes("rating") ||
    title.includes("review") ||
    body.includes("rating") ||
    body.includes("review")
  );
}

export function toneFromType(item) {
  const type = String(item?.type || "").toLowerCase();
  if (type.includes("success") || type.includes("paid")) return "success";
  if (type.includes("warn") || type.includes("cancel")) return "warn";
  if (type.includes("error") || type.includes("fail")) return "danger";
  return "neutral";
}
