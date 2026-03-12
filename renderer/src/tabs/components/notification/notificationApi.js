const API_TIMEOUT_MS = 20000;

/* ===================== helpers ===================== */

function withTimeout(factory, ms = API_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return Promise.resolve(factory(ctrl.signal)).finally(() => clearTimeout(t));
}

function mustPositiveInt(v, msg) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(msg);
  return n;
}

function mustStringId(v, msg) {
  const s = String(v || "").trim();
  if (!s) throw new Error(msg);
  return s;
}

function pickMsg(json, fallback) {
  if (!json) return fallback;
  if (typeof json.message === "string" && json.message.trim())
    return json.message;
  if (typeof json.error === "string" && json.error.trim()) return json.error;
  return fallback;
}

function mustId(v, msg) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(msg);
  return n;
}

export function mustType(type) {
  const t = String(type || "")
    .toLowerCase()
    .trim();
  if (t === "food" || t === "mart") return t;
  throw new Error("Invalid rating type. Expected 'food' or 'mart'.");
}

/** Replace multiple placeholder styles safely */
function fill(url, params = {}) {
  let out = String(url || "");
  for (const [k, v] of Object.entries(params)) {
    out = out
      .replaceAll(`{${k}}`, encodeURIComponent(String(v)))
      .replaceAll(`:${k}`, encodeURIComponent(String(v)));
  }
  return out;
}

async function fetchJson(url, { method = "GET", token, body } = {}) {
  return withTimeout(async (signal) => {
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    let json = null;
    try {
      json = await res.json();
    } catch (_) {}

    if (!res.ok) {
      throw new Error(pickMsg(json, `Request failed (${res.status})`));
    }
    if (json && json.success === false) {
      throw new Error(pickMsg(json, "Request failed"));
    }
    return json;
  });
}

/* =========================================================
   ORDER / BUSINESS NOTIFICATIONS
========================================================= */

const NOTIFICATIONS_ENDPOINT = import.meta.env.VITE_NOTIFICATIONS_ENDPOINT;
const NOTIF_READ_ENDPOINT = import.meta.env.VITE_NOTIFICATION_READ_ENDPOINT;
const NOTIF_READ_ALL_ENDPOINT = import.meta.env
  .VITE_NOTIFICATION_READ_ALL_ENDPOINT;
const NOTIF_DELETE_ENDPOINT = import.meta.env.VITE_NOTIFICATION_DELETE_ENDPOINT;

/**
 * GET business notifications
 */
export async function listBusinessNotifications({
  business_id,
  token,
  unreadOnly = false,
  limit = 200,
  offset = 0,
} = {}) {
  if (!NOTIFICATIONS_ENDPOINT)
    throw new Error("VITE_NOTIFICATIONS_ENDPOINT missing in .env");

  const bid = mustPositiveInt(business_id, "business_id missing");

  const baseUrl = fill(NOTIFICATIONS_ENDPOINT, {
    business_id: bid,
    businessId: bid,
  });

  const url = new URL(baseUrl);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (unreadOnly) url.searchParams.set("unreadOnly", "true");

  const json = await fetchJson(url.toString(), { token });

  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.rows)) return json.rows;
  return [];
}

/**
 * PATCH mark one order notification as read
 */
export async function markNotificationRead({ notificationId, token } = {}) {
  if (!NOTIF_READ_ENDPOINT)
    throw new Error("VITE_NOTIFICATION_READ_ENDPOINT missing in .env");

  const id = mustStringId(notificationId, "notificationId missing");

  const url = fill(NOTIF_READ_ENDPOINT, {
    notificationId: id,
    notification_id: id,
  });

  return fetchJson(url, { method: "PATCH", token });
}

/**
 * PATCH mark all order notifications as read
 */
export async function markAllNotificationsRead({ businessId, token } = {}) {
  if (!NOTIF_READ_ALL_ENDPOINT)
    throw new Error("VITE_NOTIFICATION_READ_ALL_ENDPOINT missing in .env");

  const bid = mustPositiveInt(businessId, "businessId missing");

  const url = fill(NOTIF_READ_ALL_ENDPOINT, {
    businessId: bid,
    business_id: bid,
  });

  return fetchJson(url, { method: "PATCH", token });
}

/**
 * DELETE order notification
 */
export async function deleteNotification({ notificationId, token } = {}) {
  if (!NOTIF_DELETE_ENDPOINT)
    throw new Error("VITE_NOTIFICATION_DELETE_ENDPOINT missing in .env");

  const id = mustStringId(notificationId, "notificationId missing");

  const url = fill(NOTIF_DELETE_ENDPOINT, {
    notificationId: id,
    notification_id: id,
  });

  return fetchJson(url, { method: "DELETE", token });
}

/* =========================================================
   GENERAL / USER NOTIFICATIONS
========================================================= */

const USER_NOTIFICATIONS_ENDPOINT = import.meta.env
  .VITE_USER_NOTIFICATIONS_ENDPOINT;
const USER_NOTIF_READ_ENDPOINT = import.meta.env
  .VITE_USER_NOTIFICATION_READ_ENDPOINT;
const USER_NOTIF_DELETE_ENDPOINT = import.meta.env
  .VITE_USER_NOTIFICATION_DELETE_ENDPOINT;
const USER_NOTIF_READ_ALL_ENDPOINT = import.meta.env
  .VITE_USER_NOTIFICATION_READ_ALL_ENDPOINT;

/**
 * GET user/general notifications
 * Expected response:
 * { success:true, count:n, data:[...] }
 */
export async function listUserNotifications({
  user_id,
  token,
  limit = 200,
  offset = 0,
  unreadOnly = false,
} = {}) {
  if (!USER_NOTIFICATIONS_ENDPOINT)
    throw new Error("VITE_USER_NOTIFICATIONS_ENDPOINT missing in .env");

  const uid = mustPositiveInt(user_id, "user_id missing");

  const baseUrl = fill(USER_NOTIFICATIONS_ENDPOINT, {
    user_id: uid,
    userId: uid,
  });

  const url = new URL(baseUrl);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (unreadOnly) url.searchParams.set("unreadOnly", "true");

  const json = await fetchJson(url.toString(), { token });

  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.rows)) return json.rows;
  if (Array.isArray(json?.notifications)) return json.notifications;
  return [];
}

/**
 * PATCH mark one user/general notification as read
 * Here notification id is numeric from sample response
 */
export async function markUserNotificationRead({ notificationId, token } = {}) {
  if (!USER_NOTIF_READ_ENDPOINT)
    throw new Error("VITE_USER_NOTIFICATION_READ_ENDPOINT missing in .env");

  const id = mustPositiveInt(notificationId, "notificationId missing");

  const url = fill(USER_NOTIF_READ_ENDPOINT, {
    notificationId: id,
    notification_id: id,
    id,
  });

  return fetchJson(url, { method: "PATCH", token });
}

/**
 * PATCH mark all user/general notifications as read
 */
export async function markAllUserNotificationsRead({ user_id, token } = {}) {
  if (!USER_NOTIF_READ_ALL_ENDPOINT)
    throw new Error("VITE_USER_NOTIFICATION_READ_ALL_ENDPOINT missing in .env");

  const uid = mustPositiveInt(user_id, "user_id missing");

  const url = fill(USER_NOTIF_READ_ALL_ENDPOINT, {
    user_id: uid,
    userId: uid,
  });

  return fetchJson(url, { method: "PATCH", token });
}

/**
 * DELETE user/general notification
 */
export async function deleteUserNotification({ notificationId, token } = {}) {
  if (!USER_NOTIF_DELETE_ENDPOINT)
    throw new Error("VITE_USER_NOTIFICATION_DELETE_ENDPOINT missing in .env");

  const id = mustPositiveInt(notificationId, "notificationId missing");

  const url = fill(USER_NOTIF_DELETE_ENDPOINT, {
    notificationId: id,
    notification_id: id,
    id,
  });

  return fetchJson(url, { method: "DELETE", token });
}

/* =========================================================
   SYSTEM NOTIFICATIONS
========================================================= */

const SYSTEM_NOTIFS_ENDPOINT = import.meta.env
  .VITE_SYSTEM_NOTIFICATIONS_ENDPOINT;

/**
 * GET system notifications
 * backend returns:
 * { success:true, user_id:"58", count:23, notifications:[...] }
 */
export async function listSystemNotifications({ user_id, token } = {}) {
  if (!SYSTEM_NOTIFS_ENDPOINT)
    throw new Error("VITE_SYSTEM_NOTIFICATIONS_ENDPOINT missing in .env");

  const uid = mustPositiveInt(user_id, "user_id missing");

  const url = fill(SYSTEM_NOTIFS_ENDPOINT, { user_id: uid, userId: uid });

  const json = await fetchJson(url, { token });

  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.notifications)) return json.notifications;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.rows)) return json.rows;
  return [];
}

/* =========================================================
   FEEDBACK / RATINGS
========================================================= */

const FEEDBACK_ENDPOINT = import.meta.env.VITE_FEEDBACK_ENDPOINT;
const FEEDBACK_REPLY_ENDPOINT = import.meta.env.VITE_FEEDBACK_REPLY_ENDPOINT;
const FEEDBACK_REPLY_DELETE_ENDPOINT = import.meta.env
  .VITE_FEEDBACK_REPLY_DELETE_ENDPOINT;

const FEEDBACK_REPORT_ENDPOINT = import.meta.env.VITE_FEEDBACK_REPORT_ENDPOINT;
const FEEDBACK_REPLY_REPORT_ENDPOINT = import.meta.env
  .VITE_FEEDBACK_REPLY_REPORT_ENDPOINT;

const FEEDBACK_LIKE_ENDPOINT = import.meta.env.VITE_FEEDBACK_LIKE_ENDPOINT;
const FEEDBACK_UNLIKE_ENDPOINT = import.meta.env.VITE_FEEDBACK_UNLIKE_ENDPOINT;

/**
 * NotificationsPage expects: { rows, meta }
 */
export async function listFeedbacksWithMeta({
  business_id,
  token,
  page = 1,
  limit = 50,
} = {}) {
  if (!FEEDBACK_ENDPOINT)
    throw new Error("VITE_FEEDBACK_ENDPOINT missing in .env");

  const bid = mustId(business_id, "business_id missing");

  const urlStr = fill(FEEDBACK_ENDPOINT, { business_id: bid, businessId: bid });
  const url = new URL(urlStr);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const json = await fetchJson(url.toString(), { token });

  return {
    rows: Array.isArray(json?.data) ? json.data : [],
    meta: json?.meta || null,
  };
}

/**
 * POST reply
 */
export async function sendFeedbackReply({
  rating_id,
  owner_type,
  token,
  text,
} = {}) {
  if (!FEEDBACK_REPLY_ENDPOINT)
    throw new Error("VITE_FEEDBACK_REPLY_ENDPOINT missing in .env");

  const rid = mustId(rating_id, "rating_id missing");
  const type = mustType(owner_type);

  const msg = String(text || "").trim();
  if (!msg) throw new Error("Reply text is required");

  const url = fill(FEEDBACK_REPLY_ENDPOINT, {
    type,
    rating_id: rid,
    ratingId: rid,
  });

  return fetchJson(url, { method: "POST", token, body: { text: msg } });
}

/**
 * DELETE reply
 */
export async function deleteFeedbackReply({
  reply_id,
  owner_type,
  token,
} = {}) {
  if (!FEEDBACK_REPLY_DELETE_ENDPOINT)
    throw new Error("VITE_FEEDBACK_REPLY_DELETE_ENDPOINT missing in .env");

  const repId = mustId(reply_id, "reply_id missing");
  const type = mustType(owner_type);

  const url = fill(FEEDBACK_REPLY_DELETE_ENDPOINT, {
    type,
    reply_id: repId,
    replyId: repId,
  });

  return fetchJson(url, { method: "DELETE", token });
}

/**
 * REPORT feedback
 */
export async function reportFeedback({ type, rating_id, reason, token } = {}) {
  if (!FEEDBACK_REPORT_ENDPOINT)
    throw new Error("VITE_FEEDBACK_REPORT_ENDPOINT missing in .env");

  const t = mustType(type);
  const rid = mustId(rating_id, "rating_id missing");
  const r = String(reason || "").trim();
  if (!r) throw new Error("reason is required");

  const url = fill(FEEDBACK_REPORT_ENDPOINT, { type: t, rating_id: rid });
  return fetchJson(url, { method: "POST", token, body: { reason: r } });
}

/**
 * REPORT reply
 */
export async function reportFeedbackReply({
  type,
  reply_id,
  reason,
  token,
} = {}) {
  if (!FEEDBACK_REPLY_REPORT_ENDPOINT)
    throw new Error("VITE_FEEDBACK_REPLY_REPORT_ENDPOINT missing in .env");

  const t = mustType(type);
  const repId = mustId(reply_id, "reply_id missing");
  const r = String(reason || "").trim();
  if (!r) throw new Error("reason is required");

  const url = fill(FEEDBACK_REPLY_REPORT_ENDPOINT, {
    type: t,
    reply_id: repId,
  });
  return fetchJson(url, { method: "POST", token, body: { reason: r } });
}

/**
 * LIKE / UNLIKE
 */
export async function likeRating({ type, rating_id, token } = {}) {
  if (!FEEDBACK_LIKE_ENDPOINT)
    throw new Error("VITE_FEEDBACK_LIKE_ENDPOINT missing in .env");

  const t = mustType(type);
  const rid = mustId(rating_id, "rating_id missing");

  const url = fill(FEEDBACK_LIKE_ENDPOINT, { type: t, rating_id: rid });
  return fetchJson(url, { method: "POST", token });
}

export async function unlikeRating({ type, rating_id, token } = {}) {
  if (!FEEDBACK_UNLIKE_ENDPOINT)
    throw new Error("VITE_FEEDBACK_UNLIKE_ENDPOINT missing in .env");

  const t = mustType(type);
  const rid = mustId(rating_id, "rating_id missing");

  const url = fill(FEEDBACK_UNLIKE_ENDPOINT, { type: t, rating_id: rid });
  return fetchJson(url, { method: "POST", token });
}
