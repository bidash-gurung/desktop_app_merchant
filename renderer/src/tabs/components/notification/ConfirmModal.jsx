// src/tabs/components/notification/ConfirmModal.jsx
import React, { useEffect } from "react";

export default function ConfirmModal({
  open,
  title = "Confirm",
  message = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  busy,
  tone = "danger",
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="ntConfirmOverlay" role="dialog" aria-modal="true">
      <div className="ntConfirmBackdrop" onMouseDown={onCancel} />
      <div className="ntConfirmModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ntConfirmHeader">
          <div className="ntConfirmTitle">{title}</div>
          <button className="ntConfirmX" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        {message ? <div className="ntConfirmBody">{message}</div> : null}

        <div className="ntConfirmActions">
          <button
            type="button"
            className="ntBtn ntBtnSoft"
            onClick={onCancel}
            disabled={!!busy}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={`ntBtn ${tone === "danger" ? "ntBtnDanger" : "ntBtnPrimary"}`}
            onClick={onConfirm}
            disabled={!!busy}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
