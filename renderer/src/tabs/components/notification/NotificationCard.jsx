// src/tabs/components/notification/NotificationCard.jsx
import React, { useMemo } from "react";
import { fmtDateTime, isUnread, safeText, toneFromType } from "./utils";

function Pill({ tone = "neutral", text }) {
  return <span className={`ntPill ${tone}`}>{text}</span>;
}

export default function NotificationCard({
  item,
  kind, // "orders" | "system"
  busy,
  onOpen,
  onMarkRead,
  onDelete,
  onReply,
  showReply = false,
}) {
  const tone = useMemo(() => toneFromType(item), [item]);

  const unread = kind === "orders" ? isUnread(item) : false;

  const title = safeText(item?.title);
  const body = safeText(item?.body_preview || item?.message, "");
  const created = fmtDateTime(
    item?.created_at || item?.sent_at || item?.createdAt,
  );

  return (
    <div className={`ntCard ${unread ? "isUnread" : ""}`}>
      <div className="ntCardTop">
        <div className="ntCardTitleRow">
          <div className="ntCardTitle">{title}</div>

          <div className="ntCardRight">
            {/* ✅ ONLY orders show unread/read */}
            {kind === "orders" ? (
              unread ? (
                <Pill tone="warn" text="Unread" />
              ) : (
                <Pill tone="neutral" text="Read" />
              )
            ) : null}

            {/* type pill */}
            <Pill tone={tone} text={kind === "system" ? "System" : "Order"} />
          </div>
        </div>

        <div className="ntCardMeta">
          <span className="ntMetaItem">Date: {created}</span>

          {kind === "orders" && item?.order_id ? (
            <span className="ntMetaItem">Order: {safeText(item.order_id)}</span>
          ) : null}

          {/* ✅ Removed ID for both system + order */}
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

        {/* ✅ Orders only actions */}
        {kind === "orders" && unread ? (
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

        {/* ✅ Orders only: delete */}
        {kind === "orders" ? (
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
