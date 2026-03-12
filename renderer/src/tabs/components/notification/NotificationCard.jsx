import React, { useMemo } from "react";
import { fmtDateTime, isUnread, safeText, toneFromType } from "./utils";

function Pill({ tone = "neutral", text }) {
  return <span className={`ntPill ${tone}`}>{text}</span>;
}

export default function NotificationCard({
  item,
  kind, // "general" | "orders" | "system"
  busy,
  onOpen,
  onMarkRead,
  onDelete,
  onReply,
  showReply = false,
}) {
  const tone = useMemo(() => toneFromType(item), [item]);
  const unread = useMemo(() => isUnread(item), [item]);

  const title = safeText(item?.title, "Notification");
  const body = safeText(item?.body_preview || item?.message, "");
  const created = fmtDateTime(
    item?.created_at || item?.sent_at || item?.createdAt,
  );

  const orderId =
    item?.order_id ||
    (() => {
      try {
        const raw = item?.data;
        if (!raw) return null;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return parsed?.order_id || null;
      } catch {
        return null;
      }
    })();

  const rightLabel =
    kind === "general" ? "General" : kind === "system" ? "System" : "Order";

  const canMarkRead = (kind === "general" || kind === "orders") && unread;
  const canDelete = kind === "general" || kind === "orders";

  return (
    <div className={`ntCard ${unread ? "isUnread" : ""}`}>
      <div className="ntCardTop">
        <div className="ntCardTitleRow">
          <div className="ntCardTitle">{title}</div>

          <div className="ntCardRight">
            {kind === "general" || kind === "orders" ? (
              unread ? (
                <Pill tone="warn" text="Unread" />
              ) : (
                <Pill tone="neutral" text="Read" />
              )
            ) : null}

            <Pill tone={tone} text={rightLabel} />
          </div>
        </div>

        <div className="ntCardMeta">
          <span className="ntMetaItem">Date: {created}</span>

          {orderId ? (
            <span className="ntMetaItem">Order: {safeText(orderId)}</span>
          ) : null}
        </div>
      </div>

      {body ? <div className="ntCardBody">{body}</div> : null}

      <div className="ntCardActions">
        <button
          type="button"
          className="ntBtn ntBtnSoft"
          onClick={() => onOpen?.(item)}
          disabled={!!busy}
        >
          View
        </button>

        {canMarkRead ? (
          <button
            type="button"
            className="ntBtn"
            onClick={() => onMarkRead?.(item)}
            disabled={!!busy}
          >
            Mark read
          </button>
        ) : null}

        {showReply ? (
          <button
            type="button"
            className="ntBtn ntBtnPrimary"
            onClick={() => onReply?.(item)}
            disabled={!!busy}
          >
            Reply
          </button>
        ) : null}

        {canDelete ? (
          <button
            type="button"
            className="ntBtn ntBtnDanger"
            onClick={() => onDelete?.(item)}
            disabled={!!busy}
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}
