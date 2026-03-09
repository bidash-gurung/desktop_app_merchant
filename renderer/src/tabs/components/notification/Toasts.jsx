// src/tabs/components/notification/Toasts.jsx
import React, { useCallback, useMemo, useRef, useState } from "react";

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timers.current.get(id);
    if (tm) clearTimeout(tm);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (type, message, ms = 2600) => {
      const id = uid();
      const toast = {
        id,
        type: type || "info",
        message: String(message || ""),
      };
      setToasts((prev) => [toast, ...prev].slice(0, 4));

      const tm = setTimeout(() => remove(id), ms);
      timers.current.set(id, tm);
      return id;
    },
    [remove],
  );

  const api = useMemo(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m, 3200),
      info: (m) => push("info", m),
      remove,
    }),
    [push, remove],
  );

  return { toasts, toast: api };
}

export default function ToastHost({ toasts, onClose }) {
  if (!toasts?.length) return null;

  return (
    <div className="ntToastHost" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} className={`ntToast ${t.type || "info"}`}>
          <div className="ntToastMsg">{t.message}</div>
          <button
            type="button"
            className="ntToastX"
            onClick={() => onClose?.(t.id)}
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
