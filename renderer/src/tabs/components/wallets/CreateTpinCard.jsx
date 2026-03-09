// src/tabs/components/wallets/CreateTpinCard.jsx
import React, { useMemo, useState } from "react";
import { CREATE_TPIN_ENDPOINT, buildUrl } from "./walletApi";
import { extractMessage, safeJson, isWalletId } from "./walletUtils";

export default function CreateTpinCard({ walletId, token, onSuccess }) {
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [show, setShow] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function clean4(v) {
    return String(v || "")
      .replace(/[^\d]/g, "")
      .slice(0, 4);
  }

  async function submit() {
    setErr("");
    setOk("");

    const wid = String(walletId || "").trim();
    if (!wid || !isWalletId(wid)) {
      setErr("Wallet account number is invalid.");
      return;
    }

    if (!CREATE_TPIN_ENDPOINT) {
      setErr("Missing env: VITE_CREATE_TPIN_ENDPOINT");
      return;
    }

    const p1 = clean4(pin);
    const p2 = clean4(pin2);

    if (!/^\d{4}$/.test(p1)) {
      setErr("T-PIN must be exactly 4 digits.");
      return;
    }
    if (p1 !== p2) {
      setErr("T-PIN confirmation does not match.");
      return;
    }

    setBusy(true);
    try {
      const url = buildUrl(CREATE_TPIN_ENDPOINT, wid);

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ t_pin: p1 }),
      });

      const out = await safeJson(res);

      if (!res.ok) {
        setErr(extractMessage(out) || `Failed to set T-PIN (${res.status})`);
        return;
      }

      setOk(out?.message || "T-PIN set successfully.");
      setPin("");
      setPin2("");

      // refresh wallet tab state
      onSuccess?.();
    } catch (e) {
      setErr(e?.message || "Network error while setting T-PIN.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wlCard">
      <div className="wlCardTop">
        <div>
          <div className="wlCardTitle">Create T-PIN</div>
          <div className="wlCardSub">
            Set a 4-digit T-PIN to enable wallet transfers.
          </div>
        </div>

        <span className="wlPill warn" title="Required to send money">
          Required
        </span>
      </div>

      {err ? <div className="wlInlineErr">{err}</div> : null}
      {ok ? <div className="wlInlineOk">{ok}</div> : null}

      <div className="wlForm">
        <div className="wlField">
          <label className="wlLabel">New T-PIN</label>
          <input
            className="wlInput"
            value={pin}
            onChange={(e) => setPin(clean4(e.target.value))}
            placeholder="4 digits"
            type={show ? "text" : "password"}
            inputMode="numeric"
          />
        </div>

        <div className="wlField">
          <label className="wlLabel">Confirm T-PIN</label>
          <input
            className="wlInput"
            value={pin2}
            onChange={(e) => setPin2(clean4(e.target.value))}
            placeholder="4 digits"
            type={show ? "text" : "password"}
            inputMode="numeric"
          />
        </div>

        <div
          className="wlRow wlRowGap"
          style={{ justifyContent: "space-between" }}
        >
          <button
            type="button"
            className="wlBtn wlBtnSecondary"
            onClick={() => setShow((s) => !s)}
            disabled={busy}
            title={show ? "Hide PIN" : "Show PIN"}
          >
            {show ? "Hide" : "Show"}
          </button>

          <button
            type="button"
            className="wlBtn wlBtnPrimary"
            onClick={submit}
            disabled={busy}
          >
            {busy ? "Saving..." : "Save T-PIN"}
          </button>
        </div>

        <div className="wlHint">
          Keep your T-PIN private. Do not share it with anyone.
        </div>
      </div>
    </div>
  );
}
