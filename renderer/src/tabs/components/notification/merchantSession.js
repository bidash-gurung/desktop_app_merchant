// src/tabs/components/notification/merchantSession.js

function tryParseJSON(v) {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

export function pickSessionIds(session) {
  const payload = session?.payload || session || {};
  const user = payload?.user || payload?.data?.user || null;

  const user_id = user?.user_id ?? user?.id ?? null;

  const token =
    payload?.token?.access_token ||
    payload?.data?.token?.access_token ||
    payload?.access_token ||
    payload?.data?.access_token ||
    null;

  const business_id =
    user?.business_id ??
    payload?.business_id ??
    payload?.data?.business_id ??
    user?.businessId ??
    null;

  return {
    user_id: user_id != null ? Number(user_id) : null,
    business_id: business_id != null ? Number(business_id) : null,
    token: token ? String(token) : null,
    raw: payload,
  };
}

/**
 * Fallback reader if session prop is not passed.
 */
export function getMerchantSessionFromStorage() {
  const keys = [
    "merchant_session",
    "merchantSession",
    "MERCHANT_SESSION",
    "session",
    "auth",
    "user",
    "merchant",
  ];

  const storages = [localStorage, sessionStorage];

  for (const st of storages) {
    for (const k of keys) {
      const raw = st.getItem(k);
      if (!raw) continue;

      const data = tryParseJSON(raw);
      if (!data || typeof data !== "object") continue;

      const picked = pickSessionIds(data);
      if (picked.user_id && picked.business_id) return picked;

      // alternate shapes
      const userId =
        data.user_id ??
        data.userId ??
        data?.user?.user_id ??
        data?.user?.userId ??
        data?.merchant?.user_id ??
        data?.merchant?.userId ??
        data?.profile?.user_id ??
        data?.profile?.userId;

      const businessId =
        data.business_id ??
        data.businessId ??
        data?.business?.business_id ??
        data?.business?.businessId ??
        data?.merchant?.business_id ??
        data?.merchant?.businessId ??
        data?.profile?.business_id ??
        data?.profile?.businessId;

      const token =
        data.token ??
        data.accessToken ??
        data.access_token ??
        data?.auth?.token ??
        data?.auth?.accessToken;

      if (userId != null && businessId != null) {
        return {
          user_id: Number(userId),
          business_id: Number(businessId),
          token: token ? String(token) : null,
          raw: data,
        };
      }
    }
  }

  return { user_id: null, business_id: null, token: null, raw: null };
}
