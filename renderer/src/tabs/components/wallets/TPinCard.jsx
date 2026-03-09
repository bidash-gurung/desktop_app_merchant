// src/tabs/components/wallets/TPinCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  HAS_TPIN_ENDPOINT,
  CREATE_TPIN_ENDPOINT,
  WALLET_TPIN_CHANGE_ENDPOINT,
  buildUrl,
} from "./walletApi";
import { extractMessage, safeJson, isWalletId } from "./walletUtils";

export default function TPinCard({ session, wallet, token }) {
  const payload = session?.payload || session || {};
  const user = payload?.user || payload?.data?.user || null;
  const userId = user?.user_id ?? user?.id ?? null;

  const walletId = wallet?.wallet_id || "";

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const [hasTPin, setHasTPin] = useState(null); // null | boolean
  const [loading, setLoading] = useState(false);

  const [newPin, setNewPin] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function checkHasTPin() {
    setErr("");
    setMsg("");
    setLoading(true);

    try {
      if (!userId) {
        setHasTPin(null);
        setErr("Missing user_id in merchant session.");
        return;
      }
      if (!HAS_TPIN_ENDPOINT) {
        setHasTPin(null);
        setErr("Missing env: VITE_HAS_TPIN_ENDPOINT");
        return;
      }
      const url = buildUrl(HAS_TPIN_ENDPOINT, userId);
      const res = await fetch(url, { method: "GET", headers });
      const out = await safeJson(res);

      if (!res.ok) {
        setHasTPin(null);
        setErr(extractMessage(out) || `Has T-PIN failed (${res.status})`);
        return;
      }

      setHasTPin(!!out?.has_tpin);
    } catch (e) {
      setHasTPin(null);
      setErr(e?.message || "Network error checking T-PIN.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHasTPin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token]);

  async function createTPin() {
    setErr("");
    setMsg("");
    if (!isWalletId(walletId)) {
      setErr("Invalid wallet_id.");
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setErr("T-PIN must be 4 digits.");
      return;
    }
    if (!CREATE_TPIN_ENDPOINT) {
      setErr("Missing env: VITE_CREATE_TPIN_ENDPOINT");
      return;
    }

    setBusy(true);
    try {
      const url = buildUrl(CREATE_TPIN_ENDPOINT, walletId);
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ t_pin: newPin }),
      });
      const out = await safeJson(res);
      if (!res.ok) {
        setErr(extractMessage(out) || `Create T-PIN failed (${res.status})`);
        return;
      }
      setMsg("T-PIN created successfully.");
      setNewPin("");
      await checkHasTPin();
    } catch (e) {
      setErr(e?.message || "Network error creating T-PIN.");
    } finally {
      setBusy(false);
    }
  }

  async function changeTPin() {
    setErr("");
    setMsg("");
    if (!isWalletId(walletId)) {
      setErr("Invalid wallet_id.");
      return;
    }
    if (!/^\d{4}$/.test(oldPin) || !/^\d{4}$/.test(newPin)) {
      setErr("Old and New T-PIN must be 4 digits.");
      return;
    }
    if (oldPin === newPin) {
      setErr("New T-PIN must be different.");
      return;
    }
    if (!WALLET_TPIN_CHANGE_ENDPOINT) {
      setErr("Missing env: VITE_WALLET_TPIN_CHANGE_ENDPOINT");
      return;
    }

    setBusy(true);
    try {
      const url = buildUrl(WALLET_TPIN_CHANGE_ENDPOINT, walletId);
      const res = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ old_t_pin: oldPin, new_t_pin: newPin }),
      });
      const out = await safeJson(res);
      if (!res.ok) {
        setErr(extractMessage(out) || `Change T-PIN failed (${res.status})`);
        return;
      }
      setMsg("T-PIN changed successfully.");
      setOldPin("");
      setNewPin("");
      await checkHasTPin();
    } catch (e) {
      setErr(e?.message || "Network error changing T-PIN.");
    } finally {
      setBusy(false);
    }
  }

  const mode = hasTPin ? "change" : "create";

  return (
    <section className="wlCard">
      <div className="wlCardTop">
        <div>
          <div className="wlCardTitle">T-PIN</div>
          <div className="wlCardSub">
            {loading
              ? "Checking status..."
              : hasTPin === true
                ? "T-PIN is set"
                : hasTPin === false
                  ? "T-PIN not set"
                  : "—"}
          </div>
        </div>

        <button
          type="button"
          className="wlBtn wlBtnGhost"
          onClick={checkHasTPin}
          disabled={loading}
        >
          Check
        </button>
      </div>

      {msg ? <div className="wlInlineOk">{msg}</div> : null}
      {err ? <div className="wlInlineErr">{err}</div> : null}

      <div className="wlForm">
        {mode === "change" ? (
          <div className="wlField">
            <label className="wlLabel">Old T-PIN</label>
            <input
              className="wlInput"
              value={oldPin}
              onChange={(e) =>
                setOldPin(e.target.value.replace(/[^\d]/g, "").slice(0, 4))
              }
              placeholder="4 digits"
            />
          </div>
        ) : null}

        <div className="wlField">
          <label className="wlLabel">
            {mode === "change" ? "New T-PIN" : "Create T-PIN"}
          </label>
          <input
            className="wlInput"
            value={newPin}
            onChange={(e) =>
              setNewPin(e.target.value.replace(/[^\d]/g, "").slice(0, 4))
            }
            placeholder="4 digits"
          />
        </div>

        <button
          type="button"
          className="wlBtn wlBtnPrimary wlBtnFull"
          onClick={mode === "change" ? changeTPin : createTPin}
          disabled={busy}
        >
          {busy
            ? "Please wait..."
            : mode === "change"
              ? "Change T-PIN"
              : "Set T-PIN"}
        </button>

        <div className="wlHint">
          Forgot your T-PIN? Use the reset section below.
        </div>
      </div>
    </section>
  );
}
