// src/tabs/components/notification/ReplyModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { safeText } from "./utils";

export default function ReplyModal({ open, item, busy, onClose, onSubmit }) {
  const [text, setText] = useState("");

  const header = useMemo(() => {
    if (!item) return "";
    return safeText(item?.title || "Reply");
  }, [item]);

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="ntModalBackdrop" onMouseDown={onClose}>
      <div
        className="ntModal"
        role="dialog"
        aria-modal="true"
        aria-label="Reply"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ntModalHeader">
          <div>
            <div className="ntModalTitle">{header}</div>
            <div className="ntModalSub">
              Reply will be posted to the feedback thread.
            </div>
          </div>

          <button
            type="button"
            className="ntIconBtn"
            onClick={onClose}
            disabled={!!busy}
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="ntModalBody">
          <div className="ntField">
            <label className="ntLabel">Your reply</label>
            <textarea
              className="ntTextarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your reply..."
              rows={6}
              disabled={!!busy}
            />
          </div>
        </div>

        <div className="ntModalFooter">
          <button
            type="button"
            className="ntBtn ntBtnSoft"
            onClick={onClose}
            disabled={!!busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ntBtn ntBtnPrimary"
            onClick={() => onSubmit?.(text)}
            disabled={!!busy || !String(text).trim()}
          >
            Send reply
          </button>
        </div>
      </div>
    </div>
  );
}
