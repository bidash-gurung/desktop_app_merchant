// src/tabs/components/notification/TopTabs.jsx
import React from "react";

export default function TopTabs({ tabs = [], activeKey, onChange }) {
  return (
    <div className="ntTopTabs" role="tablist" aria-label="Notification tabs">
      {tabs.map((t) => {
        const isActive = t.key === activeKey;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`ntTabBtn ${isActive ? "isActive" : ""}`}
            onClick={() => onChange?.(t.key)}
          >
            <span className="ntTabLabel">{t.label}</span>
            <span className={`ntTabCount ${isActive ? "isActive" : ""}`}>
              {Number(t.count || 0)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
