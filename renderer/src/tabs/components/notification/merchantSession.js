// src/tabs/components/notification/merchantSession.js

function tryParseJSON(v) {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickOwnerType(payload) {
  const user = payload?.user || payload?.data?.user || null;

  const owner =
    user?.owner_type ??
    payload?.owner_type ??
    payload?.data?.owner_type ??
    user?.ownerType ??
    payload?.ownerType ??
    payload?.data?.ownerType ??
    null;

  return owner ? String(owner).trim().toLowerCase() : "";
}

/**
 * Extract user_id, business_id, token, owner_type from the session prop.
 */
export function pickSessionIds(session) {
  const payload = session?.payload || session || {};
  const user = payload?.user || payload?.data?.user || null;

  const user_id = asNumber(
    user?.user_id ?? user?.id ?? payload?.user_id ?? null,
  );

  const token =
    payload?.token?.access_token ||
    payload?.data?.token?.access_token ||
    payload?.access_token ||
    payload?.data?.access_token ||
    payload?.token ||
    null;

  // ✅ MUCH STRONGER business_id extraction
  const business_id = asNumber(
    user?.business_id ??
      payload?.business_id ??
      payload?.data?.business_id ??
      user?.businessId ??
      payload?.businessId ??
      payload?.data?.businessId ??
      payload?.business?.business_id ??
      payload?.business?.businessId ??
      user?.business?.business_id ??
      user?.business?.businessId ??
      payload?.data?.business?.business_id ??
      payload?.data?.business?.businessId ??
      null,
  );

  const owner_type = pickOwnerType(payload);

  return {
    user_id,
    business_id,
    token: token ? String(token) : null,
    owner_type,
    raw: payload,
  };
}

/**
 * Fallback: if session prop is missing, try from storage.
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
    }
  }

  return {
    user_id: null,
    business_id: null,
    token: null,
    owner_type: "",
    raw: null,
  };
}
