// src/tabs/components/notification/ReplyModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { pickFeedbackId } from "./utils.js";

export default function ReplyModal({ open, item, busy, onClose, onSubmit }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  const feedbackId = useMemo(() => pickFeedbackId(item), [item]);
  const count = useMemo(() => String(text || "").trim().length, [text]);

  useEffect(() => {
    if (!open) return;
    setText("");
    setErr("");

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    if (!feedbackId) {
      setErr("Feedback id not found.");
      return;
    }
    const msg = String(text || "").trim();
    if (!msg) {
      setErr("Reply message is empty.");
      return;
    }
    if (msg.length > 1000) {
      setErr("Reply is too long (max 1000 chars).");
      return;
    }
    setErr("");
    await onSubmit?.(msg);
  };

  return (
    <div className="ntModalOverlay" role="dialog" aria-modal="true">
      <div className="ntModalBackdrop" onMouseDown={onClose} />
      <div className="ntModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ntModalHeader">
          <div>
            <div className="ntModalTitle">Reply</div>
            <div className="ntModalSub">
              Replying to feedback #{feedbackId || "—"}
            </div>
          </div>

          <button className="ntIconBtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ntModalBody">
          <textarea
            className={`ntTextarea ${err ? "isInvalid" : ""}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your reply…"
            rows={5}
            disabled={!!busy}
          />

          <div className="ntHelpRow">
            <div className={`ntHelpText ${err ? "isErr" : ""}`}>
              {err || "Max 1000 characters."}
            </div>
            <div className="ntHelpCount">{count}/1000</div>
          </div>
        </div>

        <div className="ntModalActions">
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
            onClick={submit}
            disabled={!!busy}
          >
            Send Reply
          </button>
        </div>
      </div>
    </div>
  );
}
