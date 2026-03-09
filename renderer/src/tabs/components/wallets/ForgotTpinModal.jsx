// src/tabs/components/wallets/ForgotTpinModal.jsx
import React, { useMemo, useState } from "react";
import {
  WALLET_TPIN_FORGOT_ENDPOINT,
  WALLET_TPIN_VERIFY_ENDPOINT,
  FORGOT_TPIN_SMS_ENDPOINT,
  VERIFY_TPIN_SMS_ENDPOINT,
  buildUrl,
} from "./walletApi";
import {
  extractMessage,
  safeJson,
  maskWallet,
  isWalletId,
} from "./walletUtils";

export default function ForgotTpinModal({ open, onClose, wallet, token }) {
  const walletId = wallet?.wallet_id || "";

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const [mode, setMode] = useState("email"); // email | sms
  const [step, setStep] = useState(1); // 1 request, 2 verify, 3 done

  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function resetState() {
    setMode("email");
    setStep(1);
    setOtp("");
    setNewPin("");
    setBusy(false);
    setMsg("");
    setErr("");
  }

  function closeAndReset() {
    resetState();
    onClose?.();
  }

  async function requestOtp() {
    setErr("");
    setMsg("");

    if (!walletId || !isWalletId(walletId)) {
      setErr("Wallet account number is missing.");
      return;
    }

    const endpoint =
      mode === "sms" ? FORGOT_TPIN_SMS_ENDPOINT : WALLET_TPIN_FORGOT_ENDPOINT;

    if (!endpoint) {
      setErr(
        mode === "sms"
          ? "Missing env: VITE_FORGOT_TPIN_SMS_ENDPOINT"
          : "Missing env: VITE_WALLET_TPIN_FORGOT_ENDPOINT",
      );
      return;
    }

    setBusy(true);
    try {
      const url = buildUrl(endpoint, walletId);
      const res = await fetch(url, { method: "POST", headers });
      const out = await safeJson(res);

      if (!res.ok) {
        setErr(extractMessage(out) || `OTP request failed (${res.status})`);
        return;
      }

      setMsg(
        out?.message ||
          (mode === "sms"
            ? "OTP sent to your registered phone number."
            : "OTP sent to your registered email address."),
      );
      setStep(2);
    } catch (e) {
      setErr(e?.message || "Network error requesting OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndReset() {
    setErr("");
    setMsg("");

    if (!walletId || !isWalletId(walletId)) {
      setErr("Wallet account number is missing.");
      return;
    }

    const otpStr = String(otp || "").trim();
    if (!/^\d{6}$/.test(otpStr)) {
      setErr("OTP must be 6 digits.");
      return;
    }

    const pinStr = String(newPin || "").trim();
    if (!/^\d{4}$/.test(pinStr)) {
      setErr("New T-PIN must be 4 digits.");
      return;
    }

    const endpoint =
      mode === "sms" ? VERIFY_TPIN_SMS_ENDPOINT : WALLET_TPIN_VERIFY_ENDPOINT;

    if (!endpoint) {
      setErr(
        mode === "sms"
          ? "Missing env: VITE_VERIFY_TPIN_SMS_ENDPOINT"
          : "Missing env: VITE_WALLET_TPIN_VERIFY_ENDPOINT",
      );
      return;
    }

    setBusy(true);
    try {
      const url = buildUrl(endpoint, walletId);
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ otp: otpStr, new_t_pin: pinStr }),
      });

      const out = await safeJson(res);
      if (!res.ok) {
        setErr(extractMessage(out) || `Reset failed (${res.status})`);
        return;
      }

      setMsg(out?.message || "T-PIN reset successfully.");
      setStep(3);
    } catch (e) {
      setErr(e?.message || "Network error verifying OTP.");
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
            <div className="wlModalTitle">Forgot T-PIN</div>
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
            <CloseIcon />
          </button>
        </div>

        {err ? <div className="wlInlineErr">{err}</div> : null}
        {msg ? <div className="wlInlineOk">{msg}</div> : null}

        {/* ✅ Hide tabs after success */}
        {step !== 3 ? (
          <div className="wlTabs">
            <button
              type="button"
              className={`wlTab ${mode === "email" ? "active" : ""}`}
              onClick={() => setMode("email")}
              disabled={busy}
            >
              Email
            </button>
            <button
              type="button"
              className={`wlTab ${mode === "sms" ? "active" : ""}`}
              onClick={() => setMode("sms")}
              disabled={busy}
            >
              SMS
            </button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="wlForm">
            <div className="wlHelp">
              Request OTP and reset your T-PIN using{" "}
              {mode === "sms" ? "SMS" : "Email"}.
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
                onClick={requestOtp}
                disabled={busy}
              >
                {busy ? "Requesting..." : "Request OTP"}
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="wlForm">
            <div className="wlField">
              <label className="wlLabel">OTP</label>
              <input
                className="wlInput"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 6))
                }
                placeholder="6 digits"
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
              />
            </div>

            <div className="wlModalActions wlModalActionsBetween">
              <button
                type="button"
                className="wlBtn wlBtnSecondary"
                onClick={requestOtp}
                disabled={busy}
                title="Resend OTP"
              >
                {busy ? "..." : "Resend OTP"}
              </button>

              <div className="wlModalActionsRight">
                <button
                  type="button"
                  className="wlBtn wlBtnGhost"
                  onClick={() => setStep(1)}
                  disabled={busy}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="wlBtn wlBtnPrimary"
                  onClick={verifyAndReset}
                  disabled={busy}
                >
                  {busy ? "Verifying..." : "Verify & Reset"}
                </button>
              </div>
            </div>

            <div className="wlHint">
              OTP is time-limited. If it expires, request again.
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="wlModalActions">
            <button
              type="button"
              className="wlBtn wlBtnPrimary wlBtnFull"
              onClick={closeAndReset}
            >
              Done
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
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
  );
}
