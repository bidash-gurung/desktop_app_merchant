// src/tabs/components/notification/NotificationDrawer.jsx
import React, { useEffect } from "react";
import { fmtDateTime, safeText } from "./utils";

export default function NotificationDrawer({ open, item, onClose }) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    // lock body scroll (panel still scrolls, but prevents weird page shifts)
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !item) return null;

  const title = safeText(item?.title, "Notification");
  const message = safeText(item?.body_preview || item?.message, "No message");
  const created = fmtDateTime(
    item?.created_at || item?.sent_at || item?.createdAt,
  );
  const type = safeText(item?.type, item?.order_id ? "order" : "system");
  const orderId = safeText(item?.order_id, "");

  return (
    <div className="ntDrawerOverlay" role="dialog" aria-modal="true">
      {/* backdrop */}
      <div className="ntDrawerBackdrop" onMouseDown={onClose} />

      {/* panel */}
      <div className="ntDrawerPanel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ntDrawerHeader">
          <div className="ntDrawerHeaderText">
            <div className="ntDrawerTitle">{title}</div>
            <div className="ntDrawerSub">Details</div>
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
          <div className="ntKV">
            <div className="ntK">Type</div>
            <div className="ntV">{type}</div>
          </div>

          <div className="ntKV">
            <div className="ntK">Created</div>
            <div className="ntV">{created}</div>
          </div>

          {orderId ? (
            <div className="ntKV">
              <div className="ntK">Order ID</div>
              <div className="ntV">{orderId}</div>
            </div>
          ) : null}

          <div className="ntDivider" />

          <div className="ntLongText">{message}</div>
        </div>
      </div>
    </div>
  );
}
