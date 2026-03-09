// src/tabs/components/wallets/WalletOverviewCard.jsx
// ✅ Update:
// - Replace inline QR card with a simple "Show QR" button
// - Clicking opens a clean minimalist modal that shows QR + user + walletId + disclaimer
// - Download exports PORTRAIT image (QR + user + walletId + disclaimer)
// - Uses real user_name from localStorage merchant_session
// - Withdraw button included (no action yet)

import React, { useMemo, useState, useEffect } from "react";
import { maskWallet } from "./walletUtils";
import QRCode from "qrcode";

/* ---------------- clipboard ---------------- */
function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText)
      return navigator.clipboard.writeText(text);
  } catch {}
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
  } catch {}
  document.body.removeChild(ta);
  return Promise.resolve();
}

/* ---------------- download helper ---------------- */
function downloadDataUrl(filename, dataUrl) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ---------------- session helper ---------------- */
function readMerchantSession() {
  try {
    const raw = localStorage.getItem("merchant_session");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.session ? parsed.session : parsed;
  } catch {
    return null;
  }
}

/* ---------------- canvas helpers ---------------- */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) current = test;
    else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/* ---------------- PORTRAIT export: QR + name + walletId + disclaimer ---------------- */
async function buildQrCardPngPortrait({ qrDataUrl, userName, walletId }) {
  const W = 820;
  const H = 1180;

  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const canvas = document.createElement("canvas");
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const pad = 36;
  const cardX = pad;
  const cardY = pad;
  const cardW = W - pad * 2;
  const cardH = H - pad * 2;
  const r = 26;

  // shadow
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.10)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardH, r);
  ctx.fill();
  ctx.restore();

  // border
  ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, r);
  ctx.stroke();

  // header
  ctx.fillStyle = "#0f172a";
  ctx.font = "900 38px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Wallet QR", cardX + 30, cardY + 74);

  ctx.fillStyle = "rgba(15, 23, 42, 0.62)";
  ctx.font = "600 18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Scan to share wallet details", cardX + 30, cardY + 110);

  // QR box
  const qrBoxSize = 460;
  const qrBoxX = cardX + (cardW - qrBoxSize) / 2;
  const qrBoxY = cardY + 160;

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(15, 23, 42, 0.10)";
  ctx.lineWidth = 2;
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 22);
  ctx.fill();
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 22);
  ctx.stroke();

  const img = await loadImage(qrDataUrl);
  const inner = 410;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    qrBoxX + (qrBoxSize - inner) / 2,
    qrBoxY + (qrBoxSize - inner) / 2,
    inner,
    inner,
  );

  // meta
  const metaX = cardX + 30;
  const metaY = qrBoxY + qrBoxSize + 52;

  ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
  ctx.font = "900 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("USER", metaX, metaY);

  ctx.fillStyle = "#0f172a";
  ctx.font = "900 32px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(String(userName || "—"), metaX, metaY + 42);

  ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
  ctx.font = "900 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("WALLET ID", metaX, metaY + 102);

  ctx.fillStyle = "#0f172a";
  ctx.font =
    "900 26px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
  ctx.fillText(String(walletId || "—"), metaX, metaY + 138);

  // divider
  ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 30, metaY + 184);
  ctx.lineTo(cardX + cardW - 30, metaY + 184);
  ctx.stroke();

  // disclaimer
  const discY = metaY + 230;
  ctx.fillStyle = "#0f172a";
  ctx.font = "900 16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Disclaimer", metaX, discY);

  ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
  ctx.font = "600 16px system-ui, -apple-system, Segoe UI, Roboto, Arial";

  const discText =
    "Share this QR only with trusted parties. It contains your wallet identifier and metadata. Anyone who scans it can read these details.";
  const lines = wrapText(ctx, discText, cardW - 60);

  let yy = discY + 30;
  for (const line of lines) {
    ctx.fillText(line, metaX, yy);
    yy += 24;
    if (yy > cardY + cardH - 40) break;
  }

  return canvas.toDataURL("image/png");
}

export default function WalletOverviewCard({
  wallet,
  balanceText,
  onSendMoney,
}) {
  const walletId = wallet?.wallet_id || "";
  const status = String(wallet?.status || "—").toUpperCase();

  const [showId, setShowId] = useState(false);
  const [copied, setCopied] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrBusy, setQrBusy] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);

  // ✅ merchant_session from localStorage
  const merchantSession = useMemo(() => readMerchantSession(), []);

  const sessionUserName = useMemo(() => {
    const s = merchantSession;
    const name =
      s?.user_name ||
      s?.username ||
      s?.name ||
      s?.full_name ||
      s?.merchant_name ||
      s?.merchant?.name ||
      s?.merchantName ||
      "";
    return String(name || "");
  }, [merchantSession]);

  const sessionUserId = useMemo(() => {
    const s = merchantSession;
    return (
      s?.user_id ?? s?.id ?? s?.uid ?? s?.merchant_id ?? s?.merchant?.id ?? null
    );
  }, [merchantSession]);

  const statusTone =
    status === "ACTIVE" ? "ok" : status === "INACTIVE" ? "warn" : "muted";

  const accountDisplay = useMemo(() => {
    if (!walletId) return "—";
    return showId ? walletId : maskWallet(walletId);
  }, [walletId, showId]);

  const qrValue = useMemo(() => {
    return JSON.stringify({
      kind: "user_wallet",
      walletId: walletId || null,
      userName: sessionUserName || null,
      userId: sessionUserId,
    });
  }, [walletId, sessionUserName, sessionUserId]);

  async function onCopy() {
    if (!walletId) return;
    await copyToClipboard(walletId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  }

  // Generate QR when modal opens (lighter + cleaner)
  useEffect(() => {
    let cancelled = false;

    async function makeQr() {
      if (!qrOpen) return;
      if (!walletId) {
        setQrDataUrl("");
        return;
      }

      setQrBusy(true);
      try {
        const url = await QRCode.toDataURL(qrValue, {
          errorCorrectionLevel: "M",
          margin: 1,
          scale: 8,
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrDataUrl("");
      } finally {
        if (!cancelled) setQrBusy(false);
      }
    }

    makeQr();
    return () => {
      cancelled = true;
    };
  }, [qrOpen, walletId, qrValue]);

  // ESC to close modal
  useEffect(() => {
    if (!qrOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setQrOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qrOpen]);

  async function onDownloadQrImage() {
    if (!qrDataUrl || !walletId) return;

    setDlBusy(true);
    try {
      const png = await buildQrCardPngPortrait({
        qrDataUrl,
        userName: sessionUserName || "—",
        walletId,
      });
      downloadDataUrl(`wallet-qr-${walletId}.png`, png);
    } catch {
      downloadDataUrl(`wallet-qr-${walletId}.png`, qrDataUrl);
    } finally {
      setDlBusy(false);
    }
  }

  return (
    <>
      <section className="wlCard wlCardWide">
        <div className="wlCardTop">
          <div>
            <div className="wlCardTitle">Account Details</div>
            <div className="wlCardSub">
              Your wallet account number and balance.
            </div>
          </div>

          <span className={`wlPill ${statusTone}`}>{status}</span>
        </div>

        <div className="wlAccountRow wlAccountRowMinimal">
          {/* LEFT */}
          <div className="wlAccountBlock">
            <div className="wlAccountLabel">Account Number</div>

            <div className="wlAccountValueRow">
              <div className="wlAccountValue wlMono">{accountDisplay}</div>

              <button
                type="button"
                className="wlIconBtn"
                onClick={() => setShowId((s) => !s)}
                title={showId ? "Hide" : "Show"}
                aria-label={
                  showId ? "Hide account number" : "Show account number"
                }
              >
                <EyeIcon open={showId} />
              </button>

              <button
                type="button"
                className="wlIconBtn"
                onClick={onCopy}
                title="Copy"
                aria-label="Copy account number"
              >
                <CopyIcon />
              </button>

              {copied ? <span className="wlCopied">Copied</span> : null}
            </div>
          </div>

          {/* RIGHT (minimal) */}
          <div className="wlAccountRight">
            <button
              type="button"
              className="wlBtn wlBtnSecondary wlQrOpenBtn"
              onClick={() => setQrOpen(true)}
              disabled={!walletId}
              title="Show QR"
            >
              Show QR
            </button>

            <div className="wlBalanceMini wlBalanceMiniMinimal">
              <div className="wlBalanceLabel">Available Balance</div>
              <div className="wlBalanceValueSm">{balanceText}</div>
            </div>
          </div>
        </div>

        <div className="wlActionsRow wlActionsRowMinimal">
          <button
            type="button"
            className="wlBtn wlBtnPrimary"
            onClick={onSendMoney}
          >
            Send Money
          </button>

          <button
            type="button"
            className="wlBtn wlBtnSecondary"
            onClick={() => {}}
            title="Withdraw (coming soon)"
          >
            Withdraw
          </button>

          <div className="wlHint wlHintInline">
            Transfers require T-PIN. You will be prompted after entering
            recipient and amount.
          </div>
        </div>
      </section>

      {/* ✅ QR Modal */}
      {qrOpen ? (
        <div
          className="wlModalOverlay"
          onMouseDown={() => setQrOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="wlModal wlQrModal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="wlModalTop wlQrModalTop">
              <div>
                <div className="wlModalTitle">Wallet QR</div>
                <div className="wlModalSub">Scan to share wallet details</div>
              </div>

              <div className="wlQrModalTopRight">
                <button
                  type="button"
                  className="wlBtn wlBtnSecondary wlQrDlBtn"
                  onClick={onDownloadQrImage}
                  disabled={!qrDataUrl || qrBusy || dlBusy}
                  title="Download QR image"
                >
                  {dlBusy ? "Preparing..." : "Download"}
                </button>

                <button
                  type="button"
                  className="wlIconBtn"
                  onClick={() => setQrOpen(false)}
                  aria-label="Close"
                  title="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="wlQrModalBody">
              <div className="wlQrModalQr">
                {qrBusy ? (
                  <div className="wlQrLoading">Generating…</div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Wallet QR"
                    className="wlQrModalImg"
                    draggable={false}
                  />
                ) : (
                  <div className="wlQrLoading">QR unavailable</div>
                )}
              </div>

              <div className="wlQrModalMeta">
                <div className="wlQrMetaName" title={sessionUserName || ""}>
                  {sessionUserName || "—"}
                </div>
                <div className="wlQrMetaId wlMono" title={walletId || ""}>
                  {walletId || "—"}
                </div>

                <div className="wlQrDisclaimer wlQrDisclaimerMinimal">
                  Disclaimer: Share this QR only with trusted parties. It
                  contains your wallet identifier and metadata. Anyone who scans
                  it can read these details.
                </div>
              </div>
            </div>

            <div className="wlModalActions wlQrModalActions">
              <button
                type="button"
                className="wlBtn wlBtnGhost"
                onClick={() => setQrOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10.6 10.6a2.8 2.8 0 0 0 3.8 3.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.3 6.9C3.8 8.8 2 12 2 12s3.5 7 10 7c2 0 3.7-.5 5.2-1.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 5.4A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 4.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path d="M9 9h10v12H9V9Z" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
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
        d="M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
