// src/tabs/ProfileTab.jsx
import React from "react";
import "./components/profiles/profile.css";

import ProfileHeaderCard from "./components/profiles/ProfileHeaderCard";
import ProfileStatsCard from "./components/profiles/ProfileStatsCard";
import ProfileDetailsForm from "./components/profiles/ProfileDetailsForm";
import PasswordChangeCard from "./components/profiles/PasswordChangeCard";

import {
  fetchProfile,
  updateProfile,
  changePassword,
} from "./components/profiles/profileApi";

function extractSession(session) {
  const payload = session?.payload || session || {};
  const user = payload?.user || payload?.data?.user || {};

  const userId = user?.user_id ?? user?.id ?? null;

  const token =
    payload?.token?.access_token ||
    payload?.data?.token?.access_token ||
    payload?.access_token ||
    payload?.data?.access_token ||
    null;

  return { user, userId, token };
}

function validateEmail(value) {
  const v = String(value || "").trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function ProfileTab({ session }) {
  const { userId, token } = React.useMemo(
    () => extractSession(session),
    [session],
  );

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const [profile, setProfile] = React.useState(null);

  const [form, setForm] = React.useState({
    user_name: "",
    email: "",
    phone: "",
    role: "",
  });

  const [passwordForm, setPasswordForm] = React.useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [selectedFile, setSelectedFile] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [changingPassword, setChangingPassword] = React.useState(false);

  const clearAlerts = React.useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  const loadProfile = React.useCallback(async () => {
    if (!userId) {
      setError("User session is missing user_id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchProfile({ userId, token });
      setProfile(data);
      setForm({
        user_name: data?.user_name || "",
        email: data?.email || "",
        phone: data?.phone || "",
        role: data?.role || "",
      });
    } catch (err) {
      setError(err?.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFormChange = React.useCallback(
    (e) => {
      const { name, value } = e.target;
      clearAlerts();
      setForm((prev) => ({ ...prev, [name]: value }));
    },
    [clearAlerts],
  );

  const handlePasswordChange = React.useCallback(
    (e) => {
      const { name, value } = e.target;
      clearAlerts();
      setPasswordForm((prev) => ({ ...prev, [name]: value }));
    },
    [clearAlerts],
  );

  const handlePickImage = React.useCallback(
    (e) => {
      clearAlerts();

      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be 5MB or below.");
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);

      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setPreviewUrl(url);
    },
    [clearAlerts, previewUrl],
  );

  const handleSaveProfile = React.useCallback(
    async (e) => {
      e.preventDefault();
      clearAlerts();

      const payload = {
        user_name: String(form.user_name || "").trim(),
        email: String(form.email || "").trim(),
        phone: String(form.phone || "").trim(),
      };

      if (
        !payload.user_name &&
        !payload.email &&
        !payload.phone &&
        !selectedFile
      ) {
        setError("Please update at least one field before saving.");
        return;
      }

      if (payload.email && !validateEmail(payload.email)) {
        setError("Please enter a valid email address.");
        return;
      }

      setSaving(true);

      try {
        const res = await updateProfile({
          userId,
          token,
          user_name: payload.user_name,
          email: payload.email,
          phone: payload.phone,
          profile_image_file: selectedFile,
        });

        setSuccess(res?.message || "Profile updated successfully.");
        setSelectedFile(null);

        await loadProfile();

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl("");
        }

        window.dispatchEvent(
          new CustomEvent("merchant:profile-updated", {
            detail: { at: Date.now() },
          }),
        );
      } catch (err) {
        setError(err?.message || "Failed to update profile.");
      } finally {
        setSaving(false);
      }
    },
    [clearAlerts, form, loadProfile, previewUrl, selectedFile, token, userId],
  );

  const handleChangePassword = React.useCallback(
    async (e) => {
      e.preventDefault();
      clearAlerts();

      const current_password = String(passwordForm.current_password || "");
      const new_password = String(passwordForm.new_password || "");
      const confirm_password = String(passwordForm.confirm_password || "");

      if (!current_password || !new_password || !confirm_password) {
        setError("Please fill in all password fields.");
        return;
      }

      if (new_password.length < 8) {
        setError("New password must be at least 8 characters.");
        return;
      }

      if (new_password !== confirm_password) {
        setError("New password and confirm password do not match.");
        return;
      }

      if (current_password === new_password) {
        setError("New password must be different from current password.");
        return;
      }

      setChangingPassword(true);

      try {
        const res = await changePassword({
          userId,
          token,
          current_password,
          new_password,
        });

        setSuccess(res?.message || "Password updated successfully.");
        setPasswordForm({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      } catch (err) {
        setError(err?.message || "Failed to update password.");
      } finally {
        setChangingPassword(false);
      }
    },
    [clearAlerts, passwordForm, token, userId],
  );

  if (loading) {
    return (
      <div className="pfPage">
        <div className="pfLoadingWrap">
          <div className="pfLoadingText">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pfPage">
        <div className="pfEmptyWrap">
          <div className="pfEmptyText">{error || "Profile not available."}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pfPage">
      {success ? <div className="pfNotice success">{success}</div> : null}
      {error ? <div className="pfNotice error">{error}</div> : null}

      <ProfileHeaderCard
        profile={profile}
        previewUrl={previewUrl}
        uploading={saving}
        onPickImage={handlePickImage}
      />

      <div className="pfGrid">
        <div className="pfLeftCol">
          <ProfileDetailsForm
            form={form}
            onChange={handleFormChange}
            onSubmit={handleSaveProfile}
            saving={saving}
          />

          <PasswordChangeCard
            passwordForm={passwordForm}
            onChange={handlePasswordChange}
            onSubmit={handleChangePassword}
            changingPassword={changingPassword}
          />
        </div>

        <div className="pfRightCol">
          <ProfileStatsCard profile={profile} />
        </div>
      </div>
    </div>
  );
}
