// src/tabs/ProfileTab.jsx
import React from "react";
import "./components/profiles/css/profile.css";

import ProfileHeaderCard from "./components/profiles/ProfileHeaderCard";
import ProfileStatsCard from "./components/profiles/ProfileStatsCard";
import ProfileDetailsForm from "./components/profiles/ProfileDetailsForm";
import PasswordChangeCard from "./components/profiles/PasswordChangeCard";
import MerchantBusinessCard, {
  buildBusinessPayload,
} from "./components/profiles/MerchantBusinessCard";
import MapPickerModal from "./components/profiles/MapPickerModal";

import {
  fetchProfile,
  updateProfile,
  changePassword,
  fetchMerchantBusiness,
  updateMerchantBusiness,
  removeSpecialCelebration,
} from "./components/profiles/profileApi";

function extractSession(session) {
  const payload = session?.payload || session || {};
  const user = payload?.user || payload?.data?.user || {};

  const userId = user?.user_id ?? user?.id ?? null;
  const businessId =
    user?.business_id ??
    payload?.business_id ??
    payload?.data?.business_id ??
    user?.businessId ??
    null;

  const token =
    payload?.token?.access_token ||
    payload?.data?.token?.access_token ||
    payload?.access_token ||
    payload?.data?.access_token ||
    null;

  return { user, userId, businessId, token };
}

function validateEmail(value) {
  const v = String(value || "").trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function ProfileTab({ session }) {
  const { userId, businessId, token } = React.useMemo(
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

  const [selectedImageFile, setSelectedImageFile] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [savingInfo, setSavingInfo] = React.useState(false);
  const [savingImage, setSavingImage] = React.useState(false);
  const [changingPassword, setChangingPassword] = React.useState(false);

  const [business, setBusiness] = React.useState(null);
  const [businessForm, setBusinessForm] = React.useState({
    business_name: "",
    latitude: "",
    longitude: "",
    address: "",
    delivery_option: "",
    complementary: "0",
    complementary_details: "",
    opening_time: "",
    closing_time: "",
    holidays: "",
    special_celebration: "",
    special_celebration_discount_percentage: "",
    min_amount_for_fd: "",
    business_logo_url: "",
    license_image_url: "",
  });
  const [pendingLogoFile, setPendingLogoFile] = React.useState(null);
  const [pendingLicenseFile, setPendingLicenseFile] = React.useState(null);
  const [pendingLogoPreview, setPendingLogoPreview] = React.useState("");
  const [pendingLicensePreview, setPendingLicensePreview] = React.useState("");
  const [savingBusiness, setSavingBusiness] = React.useState(false);
  const [removingCelebration, setRemovingCelebration] = React.useState(false);
  const [mapPickerOpen, setMapPickerOpen] = React.useState(false);

  const clearAlerts = React.useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  const emitProfileUpdated = React.useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("merchant:profile-updated", {
        detail: { at: Date.now() },
      }),
    );
  }, []);

  const loadProfile = React.useCallback(async () => {
    if (!userId) {
      setError("User session is missing user_id.");
      setLoading(false);
      return;
    }

    const data = await fetchProfile({ userId, token });
    setProfile(data);
    setForm({
      user_name: data?.user_name || "",
      email: data?.email || "",
      phone: data?.phone || "",
      role: data?.role || "",
    });
  }, [userId, token]);

  const loadBusiness = React.useCallback(async () => {
    if (!businessId) return;

    const data = await fetchMerchantBusiness({ businessId, token });
    setBusiness(data);
    setBusinessForm({
      business_name: data?.business_name || "",
      latitude: data?.latitude ?? "",
      longitude: data?.longitude ?? "",
      address: data?.address || "",
      delivery_option: data?.delivery_option || "",
      complementary:
        String(data?.complementary) === "1" || data?.complementary === true
          ? "1"
          : "0",
      complementary_details: data?.complementary_details || "",
      opening_time: data?.opening_time || "",
      closing_time: data?.closing_time || "",
      holidays: Array.isArray(data?.holidays) ? data.holidays.join(", ") : "",
      special_celebration: data?.special_celebration || "",
      special_celebration_discount_percentage:
        data?.special_celebration_discount_percentage ?? "",
      min_amount_for_fd: data?.min_amount_for_fd ?? "",
      business_logo_url: data?.business_logo_url || "",
      license_image_url: data?.license_image_url || "",
    });
  }, [businessId, token]);

  React.useEffect(() => {
    let alive = true;

    async function bootstrap() {
      setLoading(true);
      setError("");
      try {
        await loadProfile();
        await loadBusiness();
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "Failed to load profile.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      alive = false;
    };
  }, [loadProfile, loadBusiness]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (pendingLogoPreview) URL.revokeObjectURL(pendingLogoPreview);
      if (pendingLicensePreview) URL.revokeObjectURL(pendingLicensePreview);
    };
  }, [previewUrl, pendingLogoPreview, pendingLicensePreview]);

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

  const handleBusinessChange = React.useCallback(
    (e) => {
      const { name, value } = e.target;
      clearAlerts();
      setBusinessForm((prev) => ({ ...prev, [name]: value }));
    },
    [clearAlerts],
  );

  const handleMapApply = React.useCallback(
    ({ latitude, longitude, address }) => {
      clearAlerts();
      setBusinessForm((prev) => ({
        ...prev,
        latitude: latitude || prev.latitude,
        longitude: longitude || prev.longitude,
        address: address || prev.address,
      }));
      setMapPickerOpen(false);
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
      setSelectedImageFile(file);
      setPreviewUrl(url);
    },
    [clearAlerts, previewUrl],
  );

  const handlePickBusinessLogo = React.useCallback(
    (e) => {
      clearAlerts();
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("Please select a valid logo image.");
        return;
      }

      if (pendingLogoPreview) URL.revokeObjectURL(pendingLogoPreview);
      const url = URL.createObjectURL(file);
      setPendingLogoFile(file);
      setPendingLogoPreview(url);
    },
    [clearAlerts, pendingLogoPreview],
  );

  const handlePickLicense = React.useCallback(
    (e) => {
      clearAlerts();
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("Please select a valid license image.");
        return;
      }

      if (pendingLicensePreview) URL.revokeObjectURL(pendingLicensePreview);
      const url = URL.createObjectURL(file);
      setPendingLicenseFile(file);
      setPendingLicensePreview(url);
    },
    [clearAlerts, pendingLicensePreview],
  );

  const handleSaveInfo = React.useCallback(
    async (e) => {
      e.preventDefault();
      clearAlerts();

      const payload = {
        user_name: String(form.user_name || "").trim(),
        email: String(form.email || "").trim(),
        phone: String(form.phone || "").trim(),
      };

      if (payload.email && !validateEmail(payload.email)) {
        setError("Please enter a valid email address.");
        return;
      }

      setSavingInfo(true);
      try {
        const res = await updateProfile({
          userId,
          token,
          user_name: payload.user_name,
          email: payload.email,
          phone: payload.phone,
        });

        setSuccess(res?.message || "Profile information updated successfully.");
        await loadProfile();
        emitProfileUpdated();
      } catch (err) {
        setError(err?.message || "Failed to update profile information.");
      } finally {
        setSavingInfo(false);
      }
    },
    [clearAlerts, emitProfileUpdated, form, loadProfile, token, userId],
  );

  const handleSaveImage = React.useCallback(async () => {
    clearAlerts();

    if (!selectedImageFile) {
      setError("Please choose a profile image first.");
      return;
    }

    setSavingImage(true);
    try {
      const res = await updateProfile({
        userId,
        token,
        profile_image_file: selectedImageFile,
      });

      setSuccess(res?.message || "Profile photo updated successfully.");
      setSelectedImageFile(null);

      await loadProfile();
      emitProfileUpdated();

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
      }
    } catch (err) {
      setError(err?.message || "Failed to update profile photo.");
    } finally {
      setSavingImage(false);
    }
  }, [
    clearAlerts,
    emitProfileUpdated,
    loadProfile,
    previewUrl,
    selectedImageFile,
    token,
    userId,
  ]);

  const handleCancelImageSelection = React.useCallback(() => {
    clearAlerts();
    setSelectedImageFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
  }, [clearAlerts, previewUrl]);

  const handleSaveBusiness = React.useCallback(async () => {
    clearAlerts();

    if (!businessId) {
      setError("Business ID is missing.");
      return;
    }

    const fields = buildBusinessPayload(businessForm);

    setSavingBusiness(true);
    try {
      const res = await updateMerchantBusiness({
        businessId,
        token,
        fields,
        business_logo_file: pendingLogoFile || undefined,
        license_image_file: pendingLicenseFile || undefined,
      });

      setSuccess(res?.message || "Business details updated successfully.");
      await loadBusiness();

      setPendingLogoFile(null);
      setPendingLicenseFile(null);

      if (pendingLogoPreview) {
        URL.revokeObjectURL(pendingLogoPreview);
        setPendingLogoPreview("");
      }
      if (pendingLicensePreview) {
        URL.revokeObjectURL(pendingLicensePreview);
        setPendingLicensePreview("");
      }
    } catch (err) {
      setError(err?.message || "Failed to update business details.");
    } finally {
      setSavingBusiness(false);
    }
  }, [
    businessForm,
    businessId,
    clearAlerts,
    loadBusiness,
    pendingLicenseFile,
    pendingLicensePreview,
    pendingLogoFile,
    pendingLogoPreview,
    token,
  ]);

  const handleRemoveCelebration = React.useCallback(async () => {
    clearAlerts();

    if (!businessId) {
      setError("Business ID is missing.");
      return;
    }

    setRemovingCelebration(true);
    try {
      const res = await removeSpecialCelebration({ businessId, token });
      setSuccess(res?.message || "Special celebration removed successfully.");
      await loadBusiness();
    } catch (err) {
      setError(err?.message || "Failed to remove special celebration.");
    } finally {
      setRemovingCelebration(false);
    }
  }, [businessId, clearAlerts, loadBusiness, token]);

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
        imagePending={!!selectedImageFile}
        savingImage={savingImage}
        onPickImage={handlePickImage}
        onSaveImage={handleSaveImage}
        onCancelImage={handleCancelImageSelection}
      />

      <div className="pfGrid">
        <div className="pfLeftCol">
          <ProfileDetailsForm
            form={form}
            onChange={handleFormChange}
            onSubmit={handleSaveInfo}
            saving={savingInfo}
          />

          {business ? (
            <MerchantBusinessCard
              form={{
                ...businessForm,
                business_logo_url: businessForm.business_logo_url,
                license_image_url: businessForm.license_image_url,
              }}
              onChange={handleBusinessChange}
              onPickLogo={handlePickBusinessLogo}
              onPickLicense={handlePickLicense}
              onSave={handleSaveBusiness}
              onRemoveCelebration={handleRemoveCelebration}
              onOpenMapPicker={() => setMapPickerOpen(true)}
              saving={savingBusiness}
              removingCelebration={removingCelebration}
              pendingLogo={pendingLogoPreview}
              pendingLicense={pendingLicensePreview}
            />
          ) : null}
        </div>

        <div className="pfRightCol">
          <ProfileStatsCard profile={profile} />

          <PasswordChangeCard
            passwordForm={passwordForm}
            onChange={handlePasswordChange}
            onSubmit={handleChangePassword}
            changingPassword={changingPassword}
          />
        </div>
      </div>

      <MapPickerModal
        open={mapPickerOpen}
        initialLat={businessForm.latitude}
        initialLng={businessForm.longitude}
        onClose={() => setMapPickerOpen(false)}
        onApply={handleMapApply}
      />
    </div>
  );
}
