// src/tabs/components/notification/FeedbackReplyModal.jsx
import React, { useEffect, useMemo, useState } from "react";

export default function FeedbackReplyModal({
  open,
  title = "Reply to feedback",
  subtitle = "Write a reply that will be visible under this feedback.",
  busy,
  initialValue = "",
  onCancel,
  onSubmit,
}) {
  const [text, setText] = useState(initialValue || "");

  useEffect(() => {
    if (open) setText(initialValue || "");
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const trimmed = useMemo(() => String(text || "").trim(), [text]);
  if (!open) return null;

  return (
    <div className="ntModalOverlay" role="dialog" aria-modal="true">
      <div className="ntModalBackdrop" onMouseDown={onCancel} />
      <div className="ntModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ntModalHeader">
          <div>
            <div className="ntModalTitle">{title}</div>
            {subtitle ? <div className="ntModalSub">{subtitle}</div> : null}
          </div>

          <button className="ntIconBtn" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ntModalBody">
          <textarea
            className="ntTextarea"
            placeholder="Type your reply..."
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!!busy}
          />
        </div>

        <div className="ntModalActions">
          <button
            type="button"
            className="ntBtn ntBtnSoft"
            onClick={onCancel}
            disabled={!!busy}
          >
            Cancel
          </button>

          <button
            type="button"
            className="ntBtn ntBtnPrimary"
            onClick={() => onSubmit?.(trimmed)}
            disabled={!!busy || !trimmed}
          >
            {busy ? "Sending..." : "Send reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
