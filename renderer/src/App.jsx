// App.jsx
import React from "react";
import LoginScreen from "./auth/LoginScreen";
import MainScreen from "./MainScreen";

const STORAGE_KEY = "merchant_session";

// ✅ Add this env in renderer/.env
// VITE_REFRESH_TOKEN_ENDPOINT=https://.../refresh
const REFRESH_ENDPOINT = import.meta.env.VITE_REFRESH_TOKEN_ENDPOINT;

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function base64UrlDecode(str) {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
  } catch {
    try {
      return atob(b64);
    } catch {
      return null;
    }
  }
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const json = base64UrlDecode(parts[1]);
  if (!json) return null;
  return safeJsonParse(json);
}

function getAccessTokenFromSession(session) {
  const payload = session?.payload;
  if (!payload) return null;

  // login response style: token: { access_token }
  if (payload?.token?.access_token) return payload.token.access_token;

  // sometimes nested
  if (payload?.data?.token?.access_token)
    return payload.data.token.access_token;

  // legacy: token is a string
  if (typeof payload?.token === "string") return payload.token;
  if (typeof payload?.data?.token === "string") return payload.data.token;

  return null;
}

function getRefreshTokenFromSession(session) {
  const payload = session?.payload;
  if (!payload) return null;

  // ✅ common shapes
  if (payload?.token?.refresh_token) return payload.token.refresh_token;
  if (payload?.refresh_token) return payload.refresh_token;

  if (payload?.data?.token?.refresh_token)
    return payload.data.token.refresh_token;
  if (payload?.data?.refresh_token) return payload.data.refresh_token;

  return null;
}

function isTokenExpired(accessToken, skewSeconds = 15) {
  const decoded = decodeJwtPayload(accessToken);
  const exp = decoded?.exp;
  if (!exp || typeof exp !== "number") return true;

  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec >= exp - skewSeconds;
}

function readSessionRaw() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const session = safeJsonParse(raw);
  if (!session?.payload) return null;
  return session;
}

/**
 * ✅ Reads session from storage.
 * - If access token valid -> returns session
 * - If expired and refresh possible -> returns session (we'll refresh after mount)
 * - If broken -> null
 */
function readInitialSession() {
  const session = readSessionRaw();
  if (!session) return null;

  const access = getAccessTokenFromSession(session);
  if (!access) return null;

  // allow expired at boot, we'll refresh after mount if possible
  return session;
}

async function readResponseBody(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  const text = await res.text().catch(() => "");
  return text || null;
}

function extractMessage(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return payload.message || payload.error || payload.msg || "";
}

/**
 * ✅ Refresh access token using refresh_token
 * Request JSON:
 * { refresh_token: "..." }
 *
 * Success response:
 * { success:true, token:{access_token:"...", access_token_time:60} }
 */
async function refreshAccessToken(refreshToken) {
  if (!REFRESH_ENDPOINT) {
    throw new Error(
      "Missing env: VITE_REFRESH_TOKEN_ENDPOINT (refresh token API).",
    );
  }
  if (!refreshToken) {
    throw new Error("Missing refresh token.");
  }

  const res = await fetch(REFRESH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const payload = await readResponseBody(res);

  // backend may return 200 with success:false, or non-200
  const ok = res.ok && payload?.success === true;
  if (!ok) {
    const msg =
      extractMessage(payload) || `Refresh failed (${res.status || "unknown"})`;
    const err = new Error(msg);
    err.payload = payload;
    err.status = res.status;
    throw err;
  }

  const newAccess = payload?.token?.access_token || null;
  if (!newAccess) {
    throw new Error("Refresh response missing token.access_token");
  }

  return { newAccess, raw: payload };
}

/**
 * ✅ Update stored session access token in-place (keeps refresh token etc.)
 */
function applyNewAccessTokenToSession(session, newAccess) {
  const next = { ...session, payload: { ...session.payload } };

  // prefer payload.token.access_token shape
  if (next.payload.token && typeof next.payload.token === "object") {
    next.payload.token = { ...next.payload.token, access_token: newAccess };
  } else if (
    next.payload.data?.token &&
    typeof next.payload.data.token === "object"
  ) {
    next.payload.data = {
      ...next.payload.data,
      token: { ...next.payload.data.token, access_token: newAccess },
    };
  } else {
    // fallback: attach token object
    next.payload.token = { access_token: newAccess };
  }

  next.refreshedAt = new Date().toISOString();
  return next;
}

export default function App() {
  const [session, setSession] = React.useState(() => readInitialSession());
  const [bootRefreshing, setBootRefreshing] = React.useState(false);

  const logout = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const handleLoginSuccess = React.useCallback((payload) => {
    // payload should include refresh token somewhere (store full payload as-is)
    const toStore = { payload, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    setSession(toStore);
  }, []);

  // ✅ On mount / when session changes:
  // If access token expired, try refresh once automatically.
  React.useEffect(() => {
    let alive = true;

    async function maybeRefresh() {
      if (!session) return;

      const access = getAccessTokenFromSession(session);
      if (!access) {
        logout();
        return;
      }

      if (!isTokenExpired(access)) return;

      const refreshToken = getRefreshTokenFromSession(session);
      if (!refreshToken) {
        logout();
        return;
      }

      try {
        setBootRefreshing(true);
        const { newAccess } = await refreshAccessToken(refreshToken);

        if (!alive) return;

        const updated = applyNewAccessTokenToSession(session, newAccess);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setSession(updated);
      } catch (e) {
        if (!alive) return;

        // ✅ per your backend messages:
        const msg = String(e?.message || "");
        if (
          msg.toLowerCase().includes("session expired") ||
          msg.toLowerCase().includes("invalid") ||
          msg.toLowerCase().includes("expired refresh")
        ) {
          logout();
          return;
        }

        // if unknown refresh error, also logout to be safe
        logout();
      } finally {
        if (alive) setBootRefreshing(false);
      }
    }

    maybeRefresh();
    return () => {
      alive = false;
    };
  }, [session, logout]);

  // ✅ While app open: check token expiry periodically
  // If expired -> refresh; if refresh fails -> logout
  React.useEffect(() => {
    if (!session) return;

    let alive = true;
    let refreshing = false;

    const tick = async () => {
      if (!alive || refreshing) return;

      const current = readSessionRaw(); // always read latest from storage
      if (!current) return;

      const access = getAccessTokenFromSession(current);
      if (!access) return;

      if (!isTokenExpired(access)) return;

      const refreshToken = getRefreshTokenFromSession(current);
      if (!refreshToken) {
        logout();
        return;
      }

      try {
        refreshing = true;
        const { newAccess } = await refreshAccessToken(refreshToken);
        if (!alive) return;

        const updated = applyNewAccessTokenToSession(current, newAccess);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setSession(updated);
      } catch (e) {
        if (!alive) return;
        logout();
      } finally {
        refreshing = false;
      }
    };

    // immediate check + every 25s
    tick();
    const id = setInterval(tick, 25 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [session, logout]);

  if (!session) return <LoginScreen onLoginSuccess={handleLoginSuccess} />;

  // optional: show a small overlay while boot refresh is happening
  return (
    <>
      <MainScreen session={session} onLogout={logout} />
      {bootRefreshing ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,16,32,0.10)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(15,16,32,0.10)",
              borderRadius: 14,
              padding: "10px 14px",
              fontWeight: 900,
              fontSize: 13,
            }}
          >
            Refreshing session…
          </div>
        </div>
      ) : null}
    </>
  );
}
