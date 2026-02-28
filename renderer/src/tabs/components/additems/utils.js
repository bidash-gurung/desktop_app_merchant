// src/tabs/components/additems/utils.js
export function safeText(v) {
  const s = String(v ?? "").trim();
  return s ? s : "";
}

export function clampNum(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

export function toBool01(v, def = 0) {
  if (v === undefined || v === null) return def;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(s)) return 1;
    if (["0", "false", "no", "off"].includes(s)) return 0;
  }
  return v ? 1 : 0;
}

export function extractMessage(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return payload.message || payload.error || payload.msg || "";
}

export function moneyNu(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "Nu. 0.00";
  return `Nu. ${n.toFixed(2)}`;
}

export function computeFinalPrice(base, discountPct, taxPct) {
  const b = Number(base);
  const d = clampNum(Number(discountPct), 0, 100);
  const t = clampNum(Number(taxPct), 0, 999);

  if (!Number.isFinite(b) || b < 0) {
    return {
      base: 0,
      discountAmount: 0,
      afterDiscount: 0,
      taxAmount: 0,
      final: 0,
    };
  }

  const discountAmount = (b * d) / 100;
  const afterDiscount = Math.max(0, b - discountAmount);
  const taxAmount = (afterDiscount * t) / 100;
  const final = afterDiscount + taxAmount;

  return { base: b, discountAmount, afterDiscount, taxAmount, final };
}
