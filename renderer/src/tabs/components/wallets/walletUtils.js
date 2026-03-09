// src/tabs/components/wallets/walletUtils.js

export async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function extractMessage(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return (
    payload.message ||
    payload.error ||
    payload.msg ||
    payload?.data?.message ||
    ""
  );
}

export function clampNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function moneyNu(v) {
  const n = clampNum(v, 0);
  return `Nu. ${n.toFixed(2)}`;
}

export function isWalletId(v) {
  return /^TD\d{8}$/i.test(String(v || "").trim());
}

export function maskWallet(walletId) {
  const s = String(walletId || "").trim();
  if (!s || s.length < 5) return s || "—";
  const prefix = s.slice(0, 2);
  const last2 = s.slice(-2);
  return prefix + "*".repeat(Math.max(0, s.length - 4)) + last2;
}

export function buildUrl(base, id) {
  if (!base) return "";
  if (base.includes("{user_id}")) return base.replace("{user_id}", String(id));
  if (base.includes("{wallet_id}"))
    return base.replace("{wallet_id}", String(id));
  return base.endsWith("/") ? `${base}${id}` : `${base}/${id}`;
}

export function toYmd(d) {
  const dt = d ? new Date(d) : new Date();
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
