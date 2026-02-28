// renderer/src/tabs/components/banners/bannerApi.js

/* ======================= helpers ======================= */

function extractToken(session) {
  const payload = session?.payload || session || {};
  return (
    payload?.token?.access_token ||
    payload?.data?.token?.access_token ||
    payload?.access_token ||
    payload?.data?.access_token ||
    null
  );
}

function extractUser(session) {
  const payload = session?.payload || session || {};
  const user = payload?.user || payload?.data?.user || null;

  const userId = user?.user_id ?? user?.id ?? null;
  const businessId =
    user?.business_id ??
    payload?.business_id ??
    payload?.data?.business_id ??
    user?.businessId ??
    null;

  return { user, userId, businessId };
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function messageOf(payload, fallback) {
  if (!payload) return fallback || "Request failed.";
  if (typeof payload === "string") return payload;
  return (
    payload.message ||
    payload.error ||
    payload.msg ||
    payload.details ||
    fallback ||
    "Request failed."
  );
}

function joinUrl(prefix, webPath) {
  if (!webPath) return "";
  const p = String(webPath);
  if (p.startsWith("http://") || p.startsWith("https://")) return p;

  const base = (prefix || "").trim();
  if (!base) return p;

  const baseNoSlash = base.endsWith("/") ? base.slice(0, -1) : base;
  const pathSlash = p.startsWith("/") ? p : `/${p}`;
  return `${baseNoSlash}${pathSlash}`;
}

/* ======================= ENV endpoints (YOURS) ======================= */

const BANNERS_IMAGE_ENDPOINT =
  import.meta.env.VITE_BANNERS_IMAGE_ENDPOINT || "";
const CREATE_BANNER_ENDPOINT =
  import.meta.env.VITE_CREATE_BANNER_ENDPOINT || "";
const UPDATE_BANNER_ENDPOINT =
  import.meta.env.VITE_UPDATE_BANNER_ENDPOINT || "";
const DELETE_BANNER_ENDPOINT =
  import.meta.env.VITE_DELETE_BANNER_ENDPOINT || "";
const BY_BUSINESS_ENDPOINT =
  import.meta.env.VITE_BANNERS_BY_BUSINESS_ENDPOINT || "";

/**
 * Validate and normalize an env URL.
 * Supports placeholders {id} and {business_id} by validating a test URL.
 */
function requireEnvUrl(name, value) {
  const raw = String(value ?? "").trim();

  const unquoted =
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
      ? raw.slice(1, -1).trim()
      : raw;

  if (!unquoted) {
    throw new Error(
      `[Banners API] Missing env: ${name}. ` +
        `Add it to your renderer .env (the Vite project root), then restart the renderer dev server.`,
    );
  }

  // ✅ placeholders can break new URL(), so validate with safe replacements
  const testUrl = unquoted
    .replaceAll("{id}", "1")
    .replaceAll("{business_id}", "1");

  try {
    // eslint-disable-next-line no-new
    new URL(testUrl);
  } catch {
    throw new Error(
      `[Banners API] Invalid URL in env ${name}: "${unquoted}". ` +
        `Fix the value (no spaces/quotes), then restart the renderer dev server.`,
    );
  }

  return unquoted.replace(/\/+$/, ""); // remove trailing slash
}

/* ======================= derived / builders ======================= */

/**
 * Backend: GET /api/banners/base-price
 * Derived from CREATE endpoint because you may not have a separate env.
 */
function deriveBasePriceEndpoint() {
  const base = requireEnvUrl(
    "VITE_CREATE_BANNER_ENDPOINT",
    CREATE_BANNER_ENDPOINT,
  );
  return `${base}/base-price`;
}

function buildByBusinessUrl(business_id, owner_type) {
  const tpl = requireEnvUrl(
    "VITE_BANNERS_BY_BUSINESS_ENDPOINT",
    BY_BUSINESS_ENDPOINT,
  );

  const url = tpl.includes("{business_id}")
    ? tpl.replace("{business_id}", encodeURIComponent(String(business_id)))
    : `${tpl}/${encodeURIComponent(String(business_id))}`;

  if (!owner_type) return url;
  return `${url}?owner_type=${encodeURIComponent(String(owner_type))}`;
}

function buildUpdateUrl(id) {
  const tpl = requireEnvUrl(
    "VITE_UPDATE_BANNER_ENDPOINT",
    UPDATE_BANNER_ENDPOINT,
  );

  return tpl.includes("{id}")
    ? tpl.replace("{id}", encodeURIComponent(String(id)))
    : `${tpl}/${encodeURIComponent(String(id))}`;
}

function buildDeleteUrl(id) {
  const tpl = requireEnvUrl(
    "VITE_DELETE_BANNER_ENDPOINT",
    DELETE_BANNER_ENDPOINT,
  );

  return tpl.includes("{id}")
    ? tpl.replace("{id}", encodeURIComponent(String(id)))
    : `${tpl}/${encodeURIComponent(String(id))}`;
}

/** Creates a clearer error for server HTML responses etc. */
async function readTextSafely(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function makeHttpError({ res, payload, url, label, server_text }) {
  const status = res?.status;
  const statusText = res?.statusText;
  const msg = messageOf(payload, `${label} failed (${status})`);

  const hint =
    status === 404
      ? "Endpoint not found (check route path / reverse proxy)."
      : status === 400
        ? "Bad Request (check required fields / dates / wallet / ID service)."
        : status === 401 || status === 403
          ? "Unauthorized (check bearer token)."
          : status === 413
            ? "File too large (multer LIMIT_FILE_SIZE)."
            : "Check server logs for details.";

  const extra = server_text
    ? `\n• Server text: ${String(server_text).slice(0, 800)}`
    : "";

  const e = new Error(
    `[Banners API] ${msg}\n` +
      `• HTTP: ${status} ${statusText || ""}\n` +
      `• URL: ${url}\n` +
      `• Hint: ${hint}` +
      extra,
  );

  e.status = status;
  e.url = url;
  e.payload = payload;
  e.server_text = server_text;
  return e;
}

/* ======================= Public API ======================= */

export function getSessionMeta(session) {
  const { user, userId, businessId } = extractUser(session);
  return { user, userId, businessId, token: extractToken(session) };
}

export function getBannerImageUrl(webPath) {
  const base = requireEnvUrl(
    "VITE_BANNERS_IMAGE_ENDPOINT",
    BANNERS_IMAGE_ENDPOINT,
  );
  return joinUrl(base, webPath);
}

export async function getBasePrice({ session, signal } = {}) {
  const token = extractToken(session);
  const url = deriveBasePriceEndpoint();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });

  const out = await safeJson(res);
  if (!res.ok)
    throw makeHttpError({ res, payload: out, url, label: "Base price fetch" });

  return { amount_per_day: Number(out?.amount_per_day) };
}

export async function listBannersByBusiness({
  session,
  businessId,
  ownerType,
  signal,
} = {}) {
  const token = extractToken(session);
  if (!businessId) throw new Error("[Banners API] Missing business_id");

  const url = buildByBusinessUrl(businessId, ownerType);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });

  const out = await safeJson(res);
  if (!res.ok)
    throw makeHttpError({ res, payload: out, url, label: "Banners fetch" });

  return Array.isArray(out?.data) ? out.data : [];
}

/**
 * CREATE
 * Backend route: POST /api/banners
 * - expects multipart/form-data
 */
export async function createBanner({ session, form, signal } = {}) {
  const token = extractToken(session);

  const url = requireEnvUrl(
    "VITE_CREATE_BANNER_ENDPOINT",
    CREATE_BANNER_ENDPOINT,
  );

  const fd = new FormData();
  Object.entries(form || {}).forEach(([k, v]) => {
    if (v === undefined) return;
    if (v === null) {
      fd.append(k, "");
      return;
    }
    fd.append(k, v);
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: fd,
    signal,
  });

  const out = await safeJson(res);
  if (!res.ok) {
    if (!out) {
      const text = await readTextSafely(res);
      throw makeHttpError({
        res,
        payload: null,
        url,
        label: "Create",
        server_text: text,
      });
    }
    throw makeHttpError({ res, payload: out, url, label: "Create" });
  }

  return out;
}

/**
 * UPDATE
 * Backend route: PUT /api/banners/:id
 * - expects multipart/form-data
 */
export async function updateBanner({ session, id, form, signal } = {}) {
  const token = extractToken(session);
  if (!id) throw new Error("[Banners API] Missing banner id");

  const url = buildUpdateUrl(id);

  const fd = new FormData();
  Object.entries(form || {}).forEach(([k, v]) => {
    if (v === undefined) return;
    if (v === null) {
      fd.append(k, "");
      return;
    }
    fd.append(k, v);
  });

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: fd,
    signal,
  });

  const out = await safeJson(res);
  if (!res.ok) {
    if (!out) {
      const text = await readTextSafely(res);
      throw makeHttpError({
        res,
        payload: null,
        url,
        label: "Update",
        server_text: text,
      });
    }
    throw makeHttpError({ res, payload: out, url, label: "Update" });
  }

  return out;
}

/**
 * DELETE
 * Backend route: DELETE /api/banners/:id
 */
export async function deleteBanner({ session, id, signal } = {}) {
  const token = extractToken(session);
  if (!id) throw new Error("[Banners API] Missing banner id");

  const url = buildDeleteUrl(id);

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });

  const out = await safeJson(res);
  if (!res.ok) throw makeHttpError({ res, payload: out, url, label: "Delete" });

  return out;
}

/* ======================= Optional: env self-check ======================= */
export function debugBannerEnv() {
  const snap = {
    VITE_BANNERS_IMAGE_ENDPOINT: import.meta.env.VITE_BANNERS_IMAGE_ENDPOINT,
    VITE_CREATE_BANNER_ENDPOINT: import.meta.env.VITE_CREATE_BANNER_ENDPOINT,
    VITE_UPDATE_BANNER_ENDPOINT: import.meta.env.VITE_UPDATE_BANNER_ENDPOINT,
    VITE_DELETE_BANNER_ENDPOINT: import.meta.env.VITE_DELETE_BANNER_ENDPOINT,
    VITE_BANNERS_BY_BUSINESS_ENDPOINT: import.meta.env
      .VITE_BANNERS_BY_BUSINESS_ENDPOINT,
  };

  console.log("[Banners API] ENV snapshot:", snap);

  requireEnvUrl(
    "VITE_BANNERS_IMAGE_ENDPOINT",
    snap.VITE_BANNERS_IMAGE_ENDPOINT,
  );
  requireEnvUrl(
    "VITE_CREATE_BANNER_ENDPOINT",
    snap.VITE_CREATE_BANNER_ENDPOINT,
  );
  requireEnvUrl(
    "VITE_UPDATE_BANNER_ENDPOINT",
    snap.VITE_UPDATE_BANNER_ENDPOINT,
  );
  requireEnvUrl(
    "VITE_DELETE_BANNER_ENDPOINT",
    snap.VITE_DELETE_BANNER_ENDPOINT,
  );
  requireEnvUrl(
    "VITE_BANNERS_BY_BUSINESS_ENDPOINT",
    snap.VITE_BANNERS_BY_BUSINESS_ENDPOINT,
  );

  return true;
}
