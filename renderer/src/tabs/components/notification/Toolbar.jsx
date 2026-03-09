// src/tabs/components/notification/Toolbar.jsx
import React from "react";

export default function Toolbar({
  title,
  unreadOnly,
  onToggleUnread,
  onRefresh,
  onMarkAllRead,
  busy,
  showUnreadToggle = true,
  showMarkAllRead = true,
}) {
  return (
    <div className="ntHeader">
      <div>
        <h2 className="ntTitle">{title}</h2>
      </div>

      <div className="ntHeaderRight">
        {showUnreadToggle ? (
          <label className="ntSwitch" title="Show unread only">
            <input
              type="checkbox"
              checked={!!unreadOnly}
              onChange={(e) => onToggleUnread?.(e.target.checked)}
              disabled={!!busy}
            />
            <span className="ntSwitchUi" />
            <span className="ntSwitchText">Unread only</span>
          </label>
        ) : null}

        <button
          type="button"
          className="ntBtn ntBtnSoft"
          onClick={onRefresh}
          disabled={!!busy}
        >
          Refresh
        </button>

        {showMarkAllRead ? (
          <button
            type="button"
            className="ntBtn"
            onClick={onMarkAllRead}
            disabled={!!busy}
          >
            Mark all read
          </button>
        ) : null}
      </div>
    </div>
  );
}
