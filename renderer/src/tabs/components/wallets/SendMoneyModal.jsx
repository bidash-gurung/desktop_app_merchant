// src/tabs/components/wallets/SendMoneyModal.jsx
import React, { useMemo, useState } from "react";
import {
  WALLET_USERNAME_ENDPOINT,
  SEND_TO_FRIEND_ENDPOINT,
  buildUrl,
} from "./walletApi";
import {
  extractMessage,
  safeJson,
  isWalletId,
  moneyNu,
  maskWallet,
} from "./walletUtils";

export default function SendMoneyModal({
  open,
  onClose,
  wallet,
  token,
  onSuccess,
  onOpenForgot, // open Forgot T-PIN modal
  onOpenChange, // ✅ NEW: open Change T-PIN modal
}) {
  const senderWalletId = wallet?.wallet_id || "";

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const [step, setStep] = useState(1); // 1 details, 2 tpin, 3 success
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [checkingName, setCheckingName] = useState(false);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [tpin, setTpin] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function resetState() {
    setStep(1);
    setRecipient("");
    setRecipientName("");
    setAmount("");
    setNote("");
    setTpin("");
    setBusy(false);
    setMsg("");
    setErr("");
    setCheckingName(false);
  }

  function closeAndReset() {
    resetState();
    onClose?.();
  }

  function openForgot() {
    closeAndReset();
    onOpenForgot?.();
  }

  function openChange() {
    closeAndReset();
    onOpenChange?.();
  }

  async function lookupRecipientName(wid) {
    setRecipientName("");
    setErr("");
    setMsg("");

    const w = String(wid || "")
      .trim()
      .toUpperCase();
    if (!w) return;

    if (!isWalletId(w)) {
      setErr("Recipient wallet must be like TD12345678.");
      return;
    }
    if (!WALLET_USERNAME_ENDPOINT) return;

    setCheckingName(true);
    try {
      const url = buildUrl(WALLET_USERNAME_ENDPOINT, w);
      const res = await fetch(url, { method: "GET", headers });
      const out = await safeJson(res);

      if (!res.ok) {
        setRecipientName("");
        setErr(
          extractMessage(out) || `Recipient lookup failed (${res.status})`,
        );
        return;
      }

      const nm = out?.data?.user_name || out?.user_name || "";
      setRecipientName(String(nm || "").trim());
    } catch (e) {
      setRecipientName("");
      setErr(e?.message || "Network error looking up recipient.");
    } finally {
      setCheckingName(false);
    }
  }

  function continueToTPin() {
    setErr("");
    setMsg("");

    const recv = String(recipient || "")
      .trim()
      .toUpperCase();
    const amt = Number(amount);

    if (!senderWalletId || !isWalletId(senderWalletId)) {
      setErr("Invalid sender wallet.");
      return;
    }
    if (!isWalletId(recv)) {
      setErr("Recipient wallet must be like TD12345678.");
      return;
    }
    if (recv === senderWalletId) {
      setErr("Sender and recipient wallet must be different.");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr("Enter a valid transfer amount.");
      return;
    }

    setStep(2);
  }

  async function confirmSend() {
    setErr("");
    setMsg("");

    const recv = String(recipient || "")
      .trim()
      .toUpperCase();
    const amt = Number(amount);

    if (!SEND_TO_FRIEND_ENDPOINT) {
      setErr("Missing env: VITE_SEND_TO_FRIEND_ENDPOINT");
      return;
    }

    const pinStr = String(tpin || "").trim();
    if (!/^\d{4}$/.test(pinStr)) {
      setErr("Enter a valid 4-digit T-PIN.");
      return;
    }

    setBusy(true);
    try {
      const body = {
        sender_wallet_id: senderWalletId,
        recipient_wallet_id: recv,
        amount: amt,
        note: String(note || "").trim(),
        t_pin: pinStr,
        biometric: false, // desktop
      };

      const res = await fetch(SEND_TO_FRIEND_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const out = await safeJson(res);
      if (!res.ok) {
        setErr(extractMessage(out) || `Transfer failed (${res.status})`);
        return;
      }

      const receipt = out?.receipt || null;
      setMsg(
        receipt
          ? `Transfer successful: ${receipt.amount} → ${receipt.to_account} (Journal: ${receipt.journal_no})`
          : out?.message || "Transfer successful.",
      );

      setStep(3);
      onSuccess?.();
    } catch (e) {
      setErr(e?.message || "Network error transferring.");
    } finally {
      setBusy(false);
    }
  }

  const previewAmt = (() => {
    const n = Number(amount);
    return Number.isFinite(n) && n > 0 ? moneyNu(n) : "—";
  })();

  if (!open) return null;

  return (
    <div className="wlModalOverlay" role="dialog" aria-modal="true">
      <div className="wlModal">
        <div className="wlModalTop">
          <div>
            <div className="wlModalTitle">Send Money</div>
            <div className="wlModalSub">
              From <span className="wlMono">{maskWallet(senderWalletId)}</span>
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
        {msg && step === 3 ? <div className="wlInlineOk">{msg}</div> : null}

        {step === 1 ? (
          <div className="wlForm">
            <div className="wlField">
              <label className="wlLabel">Recipient Wallet ID</label>
              <div className="wlInputRow">
                <input
                  className="wlInput"
                  value={recipient}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    setRecipient(v);
                    setRecipientName("");
                  }}
                  onBlur={() => lookupRecipientName(recipient)}
                  placeholder="TD12345678"
                />
                <button
                  type="button"
                  className="wlBtn wlBtnSecondary"
                  onClick={() => lookupRecipientName(recipient)}
                  disabled={checkingName}
                >
                  {checkingName ? "Checking..." : "Verify"}
                </button>
              </div>

              {recipientName ? (
                <div className="wlHelpOk">
                  Receiver: <b>{recipientName}</b>
                </div>
              ) : null}
            </div>

            <div className="wlField">
              <label className="wlLabel">Amount</label>
              <input
                className="wlInput"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
              />
              <div className="wlHelp">
                You will send: <b>{previewAmt}</b>
              </div>
            </div>

            <div className="wlField">
              <label className="wlLabel">Note (optional)</label>
              <input
                className="wlInput"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Purpose / remarks"
              />
            </div>

            <div className="wlModalActions wlModalActionsBetween">
              <div className="wlLinksRow">
                <button
                  type="button"
                  className="wlLinkBtn"
                  onClick={openForgot}
                >
                  Forgot T-PIN?
                </button>
                <button
                  type="button"
                  className="wlLinkBtn"
                  onClick={openChange}
                >
                  Change T-PIN
                </button>
              </div>

              <div className="wlModalActionsRight">
                <button
                  type="button"
                  className="wlBtn wlBtnGhost"
                  onClick={closeAndReset}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="wlBtn wlBtnPrimary"
                  onClick={continueToTPin}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="wlForm">
            <div className="wlSummary">
              <div className="wlSummaryRow">
                <span>To</span>
                <span className="wlMono">{maskWallet(recipient)}</span>
              </div>
              <div className="wlSummaryRow">
                <span>Amount</span>
                <span>{previewAmt}</span>
              </div>
              {note ? (
                <div className="wlSummaryRow">
                  <span>Note</span>
                  <span className="wlSummaryNote">{note}</span>
                </div>
              ) : null}
            </div>

            <div className="wlField" style={{ marginTop: 12 }}>
              <label className="wlLabel">T-PIN</label>
              <input
                className="wlInput"
                value={tpin}
                onChange={(e) =>
                  setTpin(e.target.value.replace(/[^\d]/g, "").slice(0, 4))
                }
                placeholder="4 digits"
              />
            </div>

            <div className="wlModalActions wlModalActionsBetween">
              <div className="wlLinksRow">
                <button
                  type="button"
                  className="wlLinkBtn"
                  onClick={openForgot}
                >
                  Forgot T-PIN?
                </button>

                <button
                  type="button"
                  className="wlLinkBtn"
                  onClick={openChange}
                >
                  Change T-PIN
                </button>
              </div>

              <div className="wlModalActionsRight">
                <button
                  type="button"
                  className="wlBtn wlBtnSecondary"
                  onClick={() => setStep(1)}
                  disabled={busy}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="wlBtn wlBtnPrimary"
                  onClick={confirmSend}
                  disabled={busy}
                >
                  {busy ? "Sending..." : "Confirm Send"}
                </button>
              </div>
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
