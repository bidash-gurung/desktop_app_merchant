// src/tabs/components/wallets/ChangeTpinModal.jsx
import React, { useMemo, useState } from "react";
import { WALLET_TPIN_CHANGE_ENDPOINT, buildUrl } from "./walletApi";
import {
  extractMessage,
  safeJson,
  maskWallet,
  isWalletId,
} from "./walletUtils";

export default function ChangeTpinModal({
  open,
  onClose,
  wallet,
  token,
  onSuccess,
}) {
  const walletId = wallet?.wallet_id || "";

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function closeAndReset() {
    setOldPin("");
    setNewPin("");
    setBusy(false);
    setMsg("");
    setErr("");
    onClose?.();
  }

  async function submit() {
    setErr("");
    setMsg("");

    if (!walletId || !isWalletId(walletId)) {
      setErr("Wallet account number is missing.");
      return;
    }

    const oldStr = String(oldPin || "")
      .replace(/[^\d]/g, "")
      .slice(0, 4);
    const newStr = String(newPin || "")
      .replace(/[^\d]/g, "")
      .slice(0, 4);

    if (!/^\d{4}$/.test(oldStr)) return setErr("Old T-PIN must be 4 digits.");
    if (!/^\d{4}$/.test(newStr)) return setErr("New T-PIN must be 4 digits.");
    if (oldStr === newStr) return setErr("New T-PIN must be different.");

    if (!WALLET_TPIN_CHANGE_ENDPOINT) {
      setErr("Missing env: VITE_WALLET_TPIN_CHANGE_ENDPOINT");
      return;
    }

    setBusy(true);
    try {
      const url = buildUrl(WALLET_TPIN_CHANGE_ENDPOINT, walletId, "t-pin");

      // ✅ must be string to preserve leading zeros
      const payload = { old_t_pin: oldStr, new_t_pin: newStr };

      const res = await fetch(url, {
        method: "PATCH", // ✅ REQUIRED by backend
        headers,
        body: JSON.stringify(payload),
      });

      const out = await safeJson(res);
      if (!res.ok) {
        setErr(extractMessage(out) || `Change failed (${res.status})`);
        return;
      }

      setMsg(out?.message || "T-PIN changed successfully.");
      setOldPin("");
      setNewPin("");
      onSuccess?.();
    } catch (e) {
      setErr(e?.message || "Network error changing T-PIN.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="wlModalOverlay" role="dialog" aria-modal="true">
      <div className="wlModal">
        <div className="wlModalTop">
          <div>
            <div className="wlModalTitle">Change T-PIN</div>
            <div className="wlModalSub">
              Account <span className="wlMono">{maskWallet(walletId)}</span>
            </div>
          </div>

          <button
            type="button"
            className="wlIconBtn"
            onClick={closeAndReset}
            aria-label="Close"
            title="Close"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {err ? <div className="wlInlineErr">{err}</div> : null}
        {msg ? <div className="wlInlineOk">{msg}</div> : null}

        <div className="wlForm">
          <div className="wlField">
            <label className="wlLabel">Old T-PIN</label>
            <input
              className="wlInput"
              value={oldPin}
              onChange={(e) =>
                setOldPin(e.target.value.replace(/[^\d]/g, "").slice(0, 4))
              }
              placeholder="4 digits"
              inputMode="numeric"
              autoComplete="off"
            />
          </div>

          <div className="wlField">
            <label className="wlLabel">New T-PIN</label>
            <input
              className="wlInput"
              value={newPin}
              onChange={(e) =>
                setNewPin(e.target.value.replace(/[^\d]/g, "").slice(0, 4))
              }
              placeholder="4 digits"
              inputMode="numeric"
              autoComplete="off"
            />
          </div>

          <div className="wlModalActions">
            <button
              type="button"
              className="wlBtn wlBtnGhost"
              onClick={closeAndReset}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="wlBtn wlBtnPrimary"
              onClick={submit}
              disabled={busy}
            >
              {busy ? "Changing..." : "Change T-PIN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
