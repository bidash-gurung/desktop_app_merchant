import React, { useEffect, useMemo } from "react";
import { fmtDateTime, safeText } from "./utils";

function formatMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `Nu. ${n.toFixed(2)}`;
}

function parseJsonSafe(v) {
  try {
    if (!v) return null;
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return null;
  }
}

function DetailRow({ label, value, tone = "" }) {
  return (
    <div className="ntInfoRow">
      <div className="ntInfoLabel">{label}</div>
      <div className={`ntInfoValue ${tone}`}>{value}</div>
    </div>
  );
}

function WalletUpdateCard({ data }) {
  if (!data) return null;

  return (
    <div className="ntDataCard">
      <div className="ntDataCardTitle">Transaction details</div>

      <div className="ntInfoGrid">
        <DetailRow label="Order ID" value={safeText(data?.order_id)} />
        <DetailRow
          label="Business ID"
          value={data?.business_id ? String(data.business_id) : "—"}
        />
        <DetailRow
          label="Credited amount"
          value={formatMoney(data?.credited_order_amount)}
          tone="success"
        />
        <DetailRow
          label="Platform fee"
          value={formatMoney(data?.debited_platform_fee_merchant)}
          tone="danger"
        />
        <DetailRow
          label="Payment method"
          value={safeText(data?.payment_method)}
        />
      </div>
    </div>
  );
}

export default function NotificationDrawer({ open, item, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const parsedData = useMemo(() => parseJsonSafe(item?.data), [item]);

  if (!open || !item) return null;

  const title = safeText(item?.title, "Notification");
  const message = safeText(item?.body_preview || item?.message, "No message");
  const created = fmtDateTime(
    item?.created_at || item?.sent_at || item?.createdAt,
  );
  const type = safeText(item?.type, item?.order_id ? "order" : "notification");
  const orderId = item?.order_id || parsedData?.order_id || null;

  const isWalletUpdate =
    String(item?.type || "")
      .trim()
      .toLowerCase() === "wallet_update";

  return (
    <div className="ntDrawerOverlay" role="dialog" aria-modal="true">
      <div className="ntDrawerBackdrop" onMouseDown={onClose} />

      <div className="ntDrawerPanel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ntDrawerHeader">
          <div className="ntDrawerHeaderText">
            <div className="ntDrawerTitle">{title}</div>
            <div className="ntDrawerSub">Notification details</div>
          </div>

          <button
            type="button"
            className="ntDrawerClose"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="ntDrawerBody">
          <div className="ntInfoGrid">
            <DetailRow label="Type" value={type} />
            <DetailRow label="Created" value={created} />

            {orderId ? (
              <DetailRow label="Order ID" value={safeText(orderId)} />
            ) : null}

            {"status" in item ? (
              <DetailRow label="Status" value={safeText(item?.status)} />
            ) : null}
          </div>

          <div className="ntDivider" />

          <div className="ntLongText">{message}</div>

          {isWalletUpdate && parsedData ? (
            <>
              <div className="ntDivider" />
              <WalletUpdateCard data={parsedData} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
