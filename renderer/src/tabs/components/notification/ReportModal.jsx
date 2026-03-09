// src/tabs/components/notification/ReportModal.jsx
import React, { useEffect, useMemo, useState } from "react";

export default function ReportModal({
  open,
  busy,
  title = "Report",
  placeholder = "Write reason...",
  confirmText = "Submit",
  cancelText = "Cancel",
  onCancel,
  onSubmit,
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const canSubmit = useMemo(
    () => String(reason || "").trim().length >= 3,
    [reason],
  );

  if (!open) return null;

  return (
    <div className="ntModalOverlay" role="dialog" aria-modal="true">
      <div className="ntModal">
        <div className="ntModalHeader">
          <div className="ntModalTitle">{title}</div>
        </div>

        <div className="ntModalBody">
          <label className="ntLabel">Reason</label>
          <textarea
            className="ntTextarea"
            placeholder={placeholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            disabled={!!busy}
          />
          <div className="ntHint">Minimum 3 characters.</div>
        </div>

        <div className="ntModalFooter" style={{ display: "flex", gap: 10 }}>
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
            className="ntBtn ntBtnDanger"
            onClick={() => onSubmit?.(String(reason || "").trim())}
            disabled={!!busy || !canSubmit}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
