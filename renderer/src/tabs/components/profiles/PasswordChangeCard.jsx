// src/tabs/components/profiles/PasswordChangeCard.jsx
import React from "react";

export default function PasswordChangeCard({
  passwordForm,
  onChange,
  onSubmit,
  changingPassword,
}) {
  return (
    <section className="pfCard">
      <div className="pfCardHead">
        <div>
          <h3 className="pfCardTitle">Change Password</h3>
          <p className="pfCardSub">
            Use a strong password with at least 8 characters.
          </p>
        </div>
      </div>

      <form className="pfForm" onSubmit={onSubmit}>
        <div className="pfFieldGrid single">
          <div className="pfField">
            <label className="pfLabel">Current Password</label>
            <input
              className="pfInput"
              type="password"
              name="current_password"
              value={passwordForm.current_password}
              onChange={onChange}
              placeholder="Enter current password"
              autoComplete="current-password"
            />
          </div>

          <div className="pfField">
            <label className="pfLabel">New Password</label>
            <input
              className="pfInput"
              type="password"
              name="new_password"
              value={passwordForm.new_password}
              onChange={onChange}
              placeholder="Enter new password"
              autoComplete="new-password"
            />
          </div>

          <div className="pfField">
            <label className="pfLabel">Confirm New Password</label>
            <input
              className="pfInput"
              type="password"
              name="confirm_password"
              value={passwordForm.confirm_password}
              onChange={onChange}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="pfActions">
          <button
            className="pfPrimaryBtn"
            type="submit"
            disabled={changingPassword}
          >
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </section>
  );
}
