/* eslint-disable react-refresh/only-export-components */
// renderer/src/tabs/components/banners/ui.jsx
import React from "react";

/* ===================== Pills / Buttons ===================== */

export function Pill({ tone = "neutral", children, title }) {
  return (
    <span className={`bnPill ${tone}`} title={title}>
      {children}
    </span>
  );
}

export function PrimaryButton({ className = "", ...props }) {
  return <button className={`bnBtn bnPrimary ${className}`} {...props} />;
}

export function SecondaryButton({ className = "", ...props }) {
  return <button className={`bnBtn bnSecondary ${className}`} {...props} />;
}

export function DangerButton({ className = "", ...props }) {
  return <button className={`bnBtn bnDanger ${className}`} {...props} />;
}

export function GhostButton({ className = "", ...props }) {
  return <button className={`bnBtn bnGhost ${className}`} {...props} />;
}

/* ===================== Toggle Group ===================== */

export function ToggleGroup({ value, onChange, options }) {
  return (
    <div className="bnToggle" role="group" aria-label="Toggle options">
      {Array.isArray(options) ? (
        options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              className={`bnToggleBtn ${active ? "active" : ""}`}
              onClick={() => onChange?.(o.value)}
              aria-pressed={active ? "true" : "false"}
            >
              {o.label}
            </button>
          );
        })
      ) : (
        <div />
      )}
    </div>
  );
}

/* ===================== Modal ===================== */

export function Modal({ open, title, subtitle, onClose, children, footer }) {
  React.useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="bnModalOverlay"
      onMouseDown={(e) => {
        // close only when clicking backdrop (not panel)
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bnModalPanel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="bnModalHeader">
          <div className="bnModalHeaderTxt">
            <div className="bnModalTitle">{title || "Modal"}</div>
            {subtitle ? <div className="bnModalSub">{subtitle}</div> : null}
          </div>

          <button
            type="button"
            className="bnModalClose"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="bnModalBody">{children}</div>

        {footer ? <div className="bnModalFooter">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ===================== Fields ===================== */

export function Input({ label, hint, error, ...props }) {
  return (
    <label className="bnField">
      <div className="bnLabelRow">
        <div className="bnLabel">{label}</div>
        {hint ? <div className="bnHint">{hint}</div> : null}
      </div>
      <input className={`bnInput ${error ? "err" : ""}`} {...props} />
      {error ? <div className="bnErr">{error}</div> : null}
    </label>
  );
}

export function Textarea({ label, hint, error, ...props }) {
  return (
    <label className="bnField">
      <div className="bnLabelRow">
        <div className="bnLabel">{label}</div>
        {hint ? <div className="bnHint">{hint}</div> : null}
      </div>
      <textarea className={`bnTextarea ${error ? "err" : ""}`} {...props} />
      {error ? <div className="bnErr">{error}</div> : null}
    </label>
  );
}

/* ===================== Switch ===================== */

export function Switch({ checked, onChange, label, sub }) {
  return (
    <div className="bnSwitchRow">
      <button
        type="button"
        className={`bnSwitch ${checked ? "on" : ""}`}
        onClick={() => onChange?.(!checked)}
        aria-pressed={checked ? "true" : "false"}
      >
        <span className="bnSwitchDot" />
      </button>

      <div className="bnSwitchTxt">
        <div className="bnSwitchLabel">{label}</div>
        {sub ? <div className="bnSwitchSub">{sub}</div> : null}
      </div>
    </div>
  );
}

/* ===================== Alerts / Empty / Loader ===================== */

export function InlineAlert({ tone = "info", title, children }) {
  return (
    <div className={`bnAlert ${tone}`}>
      <div className="bnAlertTitle">{title}</div>
      <div className="bnAlertBody">{children}</div>
    </div>
  );
}

export function LoaderLine({ show }) {
  if (!show) return null;
  return (
    <div className="bnLoaderLine" aria-label="Loading">
      <div className="bnLoaderBar" />
    </div>
  );
}

export function EmptyState({ title, desc, action }) {
  return (
    <div className="bnEmpty">
      <div className="bnEmptyTitle">{title}</div>
      {desc ? <div className="bnEmptyDesc">{desc}</div> : null}
      {action ? <div className="bnEmptyAct">{action}</div> : null}
    </div>
  );
}

/* ===================== Helpers ===================== */

export function fmtNu(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "Nu. 0.00";
  return `Nu. ${x.toFixed(2)}`;
}

export function daysInclusive(start, end) {
  if (!start || !end) return 0;
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const diff = Math.floor((b.getTime() - a.getTime()) / (24 * 3600 * 1000));
  return diff >= 0 ? diff + 1 : 0;
}

export function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// future means strictly after today (tomorrow onwards)
export function isFutureISODate(iso) {
  if (!iso) return false;
  const t = new Date(`${todayISO()}T00:00:00`).getTime();
  const x = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(x)) return false;
  return x > t;
}
