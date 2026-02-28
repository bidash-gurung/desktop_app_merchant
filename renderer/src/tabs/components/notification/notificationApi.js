// src/tabs/components/notification/notificationApi.js

function mustEnv(name) {
  const v = import.meta.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return String(v);
}

const NOTIFICATIONS_ENDPOINT = mustEnv("VITE_NOTIFICATIONS_ENDPOINT"); // .../order_notification/business/{business_id}
const SYSTEM_NOTIFICATIONS_ENDPOINT = mustEnv(
  "VITE_SYSTEM_NOTIFICATIONS_ENDPOINT",
); // .../system-notifications/{user_id}
const NOTIFICATION_READ_ENDPOINT = mustEnv("VITE_NOTIFICATION_READ_ENDPOINT"); // .../order_notification/{notificationId}/read
const NOTIFICATION_READ_ALL_ENDPOINT = mustEnv(
  "VITE_NOTIFICATION_READ_ALL_ENDPOINT",
); // .../order_notification/business/{businessId}/read-all
const NOTIFICATION_DELETE_ENDPOINT = mustEnv(
  "VITE_NOTIFICATION_DELETE_ENDPOINT",
); // .../order_notification/{notificationId}
const FEEDBACK_REPLY_ENDPOINT = mustEnv("VITE_FEEDBACK_REPLY_ENDPOINT"); // .../ratings/food/{notification_id}/replies

function withPath(template, params) {
  let out = String(template);
  Object.entries(params || {}).forEach(([k, v]) => {
    out = out.replaceAll(`{${k}}`, encodeURIComponent(String(v)));
  });
  return out;
}

async function httpJSON(url, { method = "GET", token = null, body } = {}) {
  const headers = {
    Accept: "application/json",
  };
  if (body != null) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { success: false, message: text || "Invalid JSON response" };
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      `Request failed (${res.status}) ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** =============== BUSINESS (ORDER) NOTIFICATIONS =============== */

export async function listBusinessNotifications({
  business_id,
  token,
  unreadOnly = false,
  limit = 100,
  offset = 0,
}) {
  const url = new URL(withPath(NOTIFICATIONS_ENDPOINT, { business_id }));
  // Backend supports: limit, offset, unreadOnly=true|false
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("unreadOnly", unreadOnly ? "true" : "false");

  const out = await httpJSON(url.toString(), { token });
  // Expect: { success:true, count, data:[...] }
  return out?.data || [];
}

export async function markNotificationRead({ notificationId, token }) {
  const url = withPath(NOTIFICATION_READ_ENDPOINT, { notificationId });
  return httpJSON(url, { method: "PATCH", token });
}

export async function markAllNotificationsRead({ businessId, token }) {
  const url = withPath(NOTIFICATION_READ_ALL_ENDPOINT, { businessId });
  return httpJSON(url, { method: "PATCH", token });
}

export async function deleteNotification({ notificationId, token }) {
  const url = withPath(NOTIFICATION_DELETE_ENDPOINT, { notificationId });
  return httpJSON(url, { method: "DELETE", token });
}

/** =============== SYSTEM NOTIFICATIONS =============== */

export async function listSystemNotifications({ user_id, token }) {
  const url = withPath(SYSTEM_NOTIFICATIONS_ENDPOINT, { user_id });
  const out = await httpJSON(url, { token });
  // Expect: { success:true, notifications:[...] }
  return out?.notifications || out?.data || [];
}

/** =============== FEEDBACK REPLY =============== */
/**
 * When you detect a feedback-type notification, allow merchant to reply.
 * Endpoint provided: .../ratings/food/{notification_id}/replies
 *
 * Payload varies by your backend; this is a safe, typical structure.
 */
export async function sendFeedbackReply({
  notification_id,
  user_id,
  token,
  reply,
}) {
  const url = withPath(FEEDBACK_REPLY_ENDPOINT, { notification_id });

  const body = {
    user_id: Number(user_id),
    reply: String(reply || "").trim(),
  };

  if (!body.reply) throw new Error("Reply cannot be empty.");

  return httpJSON(url, { method: "POST", token, body });
}
