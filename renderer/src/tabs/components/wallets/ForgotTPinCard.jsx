// src/tabs/components/wallets/ForgotTPinCard.jsx
import React, { useMemo, useState } from "react";
import {
  WALLET_TPIN_FORGOT_ENDPOINT,
  WALLET_TPIN_VERIFY_ENDPOINT,
  FORGOT_TPIN_SMS_ENDPOINT,
  VERIFY_TPIN_SMS_ENDPOINT,
  buildUrl,
} from "./walletApi";
import { extractMessage, safeJson, isWalletId } from "./walletUtils";

export default function ForgotTPinCard({ wallet, token }) {
  const walletId = wallet?.wallet_id || "";

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const [tab, setTab] = useState("email"); // email | sms

  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");

  const [busyReq, setBusyReq] = useState(false);
  const [busyVerify, setBusyVerify] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function requestOtp() {
    setMsg("");
    setErr("");

    if (!isWalletId(walletId)) {
      setErr("Invalid wallet_id.");
      return;
    }

    const endpoint =
      tab === "sms" ? FORGOT_TPIN_SMS_ENDPOINT : WALLET_TPIN_FORGOT_ENDPOINT;

    if (!endpoint) {
      setErr(
        tab === "sms"
          ? "Missing env: VITE_FORGOT_TPIN_SMS_ENDPOINT"
          : "Missing env: VITE_WALLET_TPIN_FORGOT_ENDPOINT",
      );
      return;
    }

    setBusyReq(true);
    try {
      const url = buildUrl(endpoint, walletId);
      const res = await fetch(url, { method: "POST", headers });
      const out = await safeJson(res);

      if (!res.ok) {
        setErr(extractMessage(out) || `OTP request failed (${res.status})`);
        return;
      }

      setMsg(
        tab === "sms"
          ? "OTP sent via SMS. Please check your phone."
          : "OTP sent to your registered email. Please check your inbox.",
      );
    } catch (e) {
      setErr(e?.message || "Network error requesting OTP.");
    } finally {
      setBusyReq(false);
    }
  }

  async function verifyOtpAndReset() {
    setMsg("");
    setErr("");

    if (!isWalletId(walletId)) {
      setErr("Invalid wallet_id.");
      return;
    }
    if (!/^\d{6}$/.test(String(otp || "").trim())) {
      setErr("OTP must be 6 digits.");
      return;
    }
    if (!/^\d{4}$/.test(String(newPin || "").trim())) {
      setErr("New T-PIN must be 4 digits.");
      return;
    }

    const endpoint =
      tab === "sms" ? VERIFY_TPIN_SMS_ENDPOINT : WALLET_TPIN_VERIFY_ENDPOINT;

    if (!endpoint) {
      setErr(
        tab === "sms"
          ? "Missing env: VITE_VERIFY_TPIN_SMS_ENDPOINT"
          : "Missing env: VITE_WALLET_TPIN_VERIFY_ENDPOINT",
      );
      return;
    }

    setBusyVerify(true);
    try {
      const url = buildUrl(endpoint, walletId);
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          otp: String(otp).trim(),
          new_t_pin: String(newPin).trim(),
        }),
      });

      const out = await safeJson(res);
      if (!res.ok) {
        setErr(extractMessage(out) || `Reset failed (${res.status})`);
        return;
      }

      setMsg("T-PIN reset successful. You can now use your new T-PIN.");
      setOtp("");
      setNewPin("");
    } catch (e) {
      setErr(e?.message || "Network error verifying OTP.");
    } finally {
      setBusyVerify(false);
    }
  }

  return (
    <section className="wlCard">
      <div className="wlCardTop">
        <div>
          <div className="wlCardTitle">Forgot T-PIN</div>
          <div className="wlCardSub">Request OTP and reset your T-PIN.</div>
        </div>

        <div className="wlSeg">
          <button
            type="button"
            className={`wlSegBtn ${tab === "email" ? "active" : ""}`}
            onClick={() => setTab("email")}
          >
            Email
          </button>
          <button
            type="button"
            className={`wlSegBtn ${tab === "sms" ? "active" : ""}`}
            onClick={() => setTab("sms")}
          >
            SMS
          </button>
        </div>
      </div>

      {msg ? <div className="wlInlineOk">{msg}</div> : null}
      {err ? <div className="wlInlineErr">{err}</div> : null}

      <div className="wlForm">
        <button
          type="button"
          className="wlBtn wlBtnSecondary wlBtnFull"
          onClick={requestOtp}
          disabled={busyReq}
        >
          {busyReq ? "Requesting..." : "Request OTP"}
        </button>

        <div className="wlSplit">
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
        </div>

        <button
          type="button"
          className="wlBtn wlBtnPrimary wlBtnFull"
          onClick={verifyOtpAndReset}
          disabled={busyVerify}
        >
          {busyVerify ? "Verifying..." : "Verify & Reset"}
        </button>

        <div className="wlHint">
          OTP is time-limited. If it expires, request a new one.
        </div>
      </div>
    </section>
  );
}
