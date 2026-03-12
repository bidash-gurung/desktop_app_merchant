// src/tabs/components/profiles/ProfileDetailsForm.jsx
import React from "react";

export default function ProfileDetailsForm({
  form,
  onChange,
  onSubmit,
  saving,
}) {
  return (
    <section className="pfCard">
      <div className="pfCardHead">
        <div>
          <h3 className="pfCardTitle">Personal Information</h3>
          <p className="pfCardSub">
            Update your basic account information and profile image.
          </p>
        </div>
      </div>

      <form className="pfForm" onSubmit={onSubmit}>
        <div className="pfFieldGrid">
          <div className="pfField">
            <label className="pfLabel">Full Name</label>
            <input
              className="pfInput"
              type="text"
              name="user_name"
              value={form.user_name}
              onChange={onChange}
              placeholder="Enter full name"
              autoComplete="name"
            />
          </div>

          <div className="pfField">
            <label className="pfLabel">Email Address</label>
            <input
              className="pfInput"
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="Enter email address"
              autoComplete="email"
            />
          </div>

          <div className="pfField">
            <label className="pfLabel">Phone Number</label>
            <input
              className="pfInput"
              type="text"
              name="phone"
              value={form.phone}
              onChange={onChange}
              placeholder="Enter phone number"
              autoComplete="tel"
            />
          </div>

          <div className="pfField">
            <label className="pfLabel">Role</label>
            <input
              className="pfInput pfInputReadonly"
              type="text"
              value={form.role || ""}
              readOnly
            />
          </div>
        </div>

        <div className="pfActions">
          <button className="pfPrimaryBtn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
