// src/tabs/components/wallets/walletApi.js

export const TRANSACTION_HISTORY_ENDPOINT = import.meta.env
  .VITE_TANSACTION_HISTORY_ENDPOINT;

export const CREATE_WALLET_ENDPOINT = import.meta.env
  .VITE_CREATE_WALLET_ENDPOINT;

export const WALLET_ENDPOINT = import.meta.env.VITE_WALLET_ENDPOINT;

export const WALLET_USERNAME_ENDPOINT = import.meta.env
  .VITE_WALLET_USERNAME_ENDPOINT;

export const HAS_TPIN_ENDPOINT = import.meta.env.VITE_HAS_TPIN_ENDPOINT;

export const CREATE_TPIN_ENDPOINT = import.meta.env.VITE_CREATE_TPIN_ENDPOINT;

export const WALLET_TPIN_VERIFY_ENDPOINT = import.meta.env
  .VITE_WALLET_TPIN_VERIFY_ENDPOINT;

export const WALLET_TPIN_FORGOT_ENDPOINT = import.meta.env
  .VITE_WALLET_TPIN_FORGOT_ENDPOINT;

export const WALLET_TPIN_CHANGE_ENDPOINT = import.meta.env
  .VITE_WALLET_TPIN_CHANGE_ENDPOINT;

export const FORGOT_TPIN_SMS_ENDPOINT = import.meta.env
  .VITE_FORGOT_TPIN_SMS_ENDPOINT;

export const VERIFY_TPIN_SMS_ENDPOINT = import.meta.env
  .VITE_VERIFY_TPIN_SMS_ENDPOINT;

export const SEND_TO_FRIEND_ENDPOINT = import.meta.env
  .VITE_SEND_TO_FRIEND_ENDPOINT;

// ---------- helpers ----------
export function buildUrl(base, idOrValue) {
  if (!base) return "";
  if (base.includes("{user_id}"))
    return base.replace("{user_id}", String(idOrValue));
  if (base.includes("{wallet_id}"))
    return base.replace("{wallet_id}", String(idOrValue));
  return base.endsWith("/") ? `${base}${idOrValue}` : `${base}/${idOrValue}`;
}

export function buildTxUrl(base, walletId) {
  // VITE_TANSACTION_HISTORY_ENDPOINT ends with .../wallet/{wallet_id}
  if (!base) return "";
  if (base.includes("{wallet_id}"))
    return base.replace("{wallet_id}", String(walletId));
  return base.endsWith("/") ? `${base}${walletId}` : `${base}/${walletId}`;
}
