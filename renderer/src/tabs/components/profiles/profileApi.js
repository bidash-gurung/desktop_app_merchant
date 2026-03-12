// src/tabs/components/profiles/profileApi.js

const PROFILE_ENDPOINT = import.meta.env.VITE_PROFILE_ENDPOINT;
const PASSWORD_CHANGE_ENDPOINT = import.meta.env.VITE_PASSWORD_CHANGE_ENDPOINT;
const PROFILE_IMAGE_PREFIX =
  import.meta.env.VITE_PROFILE_IMAGE_PREFIX ||
  import.meta.env.VITE_PROFILE_IMAGE;
const BUSINESS_DETAILS_ENDPOINT = import.meta.env.VITE_BUSINESS_DETAILS;
const REMOVE_SPECIAL_CELEBRATION_ENDPOINT = import.meta.env
  .VITE_REMOVE_SEPCIAL_CELEBRATION_ENDPOINT;
const MERCHANT_LOGO_PREFIX = import.meta.env.VITE_MERCHANT_LOGO_PREFIX;

function buildUrl(base, id, key = "user_id") {
  if (!base) return "";
  const raw = String(base).trim();

  if (raw.includes(`{${key}}`)) {
    return raw.replace(`{${key}}`, String(id));
  }

  return raw.endsWith("/") ? `${raw}${id}` : `${raw}/${id}`;
}

export function joinUrl(prefix, path) {
  if (!path) return "";
  const p = String(path).trim();

  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;

  const base = String(prefix || "").trim();
  if (!base) return p;

  const baseNoSlash = base.endsWith("/") ? base.slice(0, -1) : base;
  const pathWithSlash = p.startsWith("/") ? p : `/${p}`;
  return `${baseNoSlash}${pathWithSlash}`;
}

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function pickMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === "string" && payload.trim()) return payload;
  return (
    payload.message ||
    payload.error ||
    payload.msg ||
    payload.details ||
    fallback
  );
}

function getAuthHeaders(token, extra = {}) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function normalizeHolidays(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export async function fetchProfile({ userId, token, signal }) {
  if (!userId) throw new Error("Missing user_id");
  if (!PROFILE_ENDPOINT) throw new Error("Missing env: VITE_PROFILE_ENDPOINT");

  const res = await fetch(buildUrl(PROFILE_ENDPOINT, userId, "user_id"), {
    method: "GET",
    headers: getAuthHeaders(token, {
      Accept: "application/json",
    }),
    signal,
  });

  const json = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      pickMessage(json, `Failed to fetch profile (${res.status})`),
    );
  }

  const data = json?.data && typeof json.data === "object" ? json.data : json;

  return {
    user_id: data?.user_id ?? userId,
    user_name: data?.user_name ?? "",
    email: data?.email ?? "",
    phone: data?.phone ?? "",
    role: data?.role ?? "",
    profile_image: data?.profile_image ?? "",
    is_verified: Number(data?.is_verified ?? 0),
    is_active: Number(data?.is_active ?? 0),
    last_login: data?.last_login ?? "",
    points: Number(data?.points ?? 0),
    profile_image_url: joinUrl(PROFILE_IMAGE_PREFIX, data?.profile_image ?? ""),
  };
}

export async function updateProfile({
  userId,
  token,
  user_name,
  email,
  phone,
  profile_image_file,
}) {
  if (!userId) throw new Error("Missing user_id");
  if (!PROFILE_ENDPOINT) throw new Error("Missing env: VITE_PROFILE_ENDPOINT");

  const formData = new FormData();

  if (String(user_name || "").trim())
    formData.append("user_name", user_name.trim());
  if (String(email || "").trim()) formData.append("email", email.trim());
  if (String(phone || "").trim()) formData.append("phone", phone.trim());
  if (profile_image_file) formData.append("profile_image", profile_image_file);

  const res = await fetch(buildUrl(PROFILE_ENDPOINT, userId, "user_id"), {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: formData,
  });

  const json = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      pickMessage(json, `Failed to update profile (${res.status})`),
    );
  }

  return {
    success: true,
    message: pickMessage(json, "Profile updated successfully."),
    data: json?.data || json || null,
  };
}

export async function changePassword({
  userId,
  token,
  current_password,
  new_password,
}) {
  if (!userId) throw new Error("Missing user_id");
  if (!PASSWORD_CHANGE_ENDPOINT) {
    throw new Error("Missing env: VITE_PASSWORD_CHANGE_ENDPOINT");
  }

  const url = buildUrl(PASSWORD_CHANGE_ENDPOINT, userId, "user_id");

  const res = await fetch(url, {
    method: "PUT",
    headers: getAuthHeaders(token, {
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    body: JSON.stringify({
      current_password,
      new_password,
    }),
  });

  const json = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      pickMessage(json, `Failed to change password (${res.status})`),
    );
  }

  return {
    success: true,
    message: pickMessage(json, "Password updated successfully."),
  };
}

export async function fetchMerchantBusiness({ businessId, token, signal }) {
  if (!businessId) throw new Error("Missing business_id");
  if (!BUSINESS_DETAILS_ENDPOINT) {
    throw new Error("Missing env: VITE_BUSINESS_DETAILS");
  }

  const res = await fetch(
    buildUrl(BUSINESS_DETAILS_ENDPOINT, businessId, "business_id"),
    {
      method: "GET",
      headers: getAuthHeaders(token, {
        Accept: "application/json",
      }),
      signal,
    },
  );

  const json = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      pickMessage(json, `Failed to fetch business details (${res.status})`),
    );
  }

  const data = json?.data || {};

  return {
    ...data,
    holidays: normalizeHolidays(data?.holidays),
    business_logo_url: joinUrl(MERCHANT_LOGO_PREFIX, data?.business_logo || ""),
    license_image_url: joinUrl(MERCHANT_LOGO_PREFIX, data?.license_image || ""),
  };
}

export async function updateMerchantBusiness({
  businessId,
  token,
  fields = {},
  business_logo_file,
  license_image_file,
}) {
  if (!businessId) throw new Error("Missing business_id");
  if (!BUSINESS_DETAILS_ENDPOINT) {
    throw new Error("Missing env: VITE_BUSINESS_DETAILS");
  }

  const formData = new FormData();

  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      formData.append(key, "");
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((v) => formData.append(key, v));
      return;
    }

    formData.append(key, value);
  });

  if (business_logo_file) formData.append("business_logo", business_logo_file);
  if (license_image_file) formData.append("license_image", license_image_file);

  const res = await fetch(
    buildUrl(BUSINESS_DETAILS_ENDPOINT, businessId, "business_id"),
    {
      method: "PUT",
      headers: getAuthHeaders(token),
      body: formData,
    },
  );

  const json = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      pickMessage(json, `Failed to update business details (${res.status})`),
    );
  }

  return {
    success: true,
    message: pickMessage(json, "Business details updated successfully."),
    data: json?.data || null,
  };
}

export async function removeSpecialCelebration({ businessId, token }) {
  if (!businessId) throw new Error("Missing business_id");
  if (!REMOVE_SPECIAL_CELEBRATION_ENDPOINT) {
    throw new Error("Missing env: VITE_REMOVE_SEPCIAL_CELEBRATION_ENDPOINT");
  }

  const res = await fetch(
    buildUrl(REMOVE_SPECIAL_CELEBRATION_ENDPOINT, businessId, "business_id"),
    {
      method: "DELETE",
      headers: getAuthHeaders(token, {
        Accept: "application/json",
      }),
    },
  );

  const json = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      pickMessage(json, `Failed to remove special celebration (${res.status})`),
    );
  }

  return {
    success: true,
    message: pickMessage(json, "Special celebration removed successfully."),
    data: json?.data || null,
  };
}
