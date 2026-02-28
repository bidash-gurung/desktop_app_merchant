// src/tabs/components/notification/TopTabs.jsx
import React from "react";

export default function TopTabs({ tabs, activeKey, onChange }) {
  return (
    <div className="ntTopTabs" role="tablist" aria-label="Notification tabs">
      {tabs.map((t) => {
        const active = t.key === activeKey;
        return (
          <button
            key={t.key}
            type="button"
            className={`ntTabBtn ${active ? "isActive" : ""}`}
            onClick={() => onChange(t.key)}
            role="tab"
            aria-selected={active ? "true" : "false"}
          >
            <span className="ntTabLabel">{t.label}</span>
            {typeof t.count === "number" && (
              <span className={`ntTabCount ${active ? "isActive" : ""}`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
