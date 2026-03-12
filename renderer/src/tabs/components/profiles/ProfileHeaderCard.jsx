// src/tabs/components/profiles/ProfileHeaderCard.jsx
import React from "react";

function formatLastLogin(value) {
  if (!value) return "No login record";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString();
}

function getInitial(name) {
  return (String(name || "").trim()[0] || "U").toUpperCase();
}

export default function ProfileHeaderCard({
  profile,
  previewUrl,
  imagePending,
  savingImage,
  onPickImage,
  onSaveImage,
  onCancelImage,
}) {
  const [isViewerOpen, setIsViewerOpen] = React.useState(false);

  const imageUrl = previewUrl || profile?.profile_image_url || "";
  const fullName = profile?.user_name || "User";

  React.useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsViewerOpen(false);
    };

    if (isViewerOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isViewerOpen]);

  return (
    <>
      <section className="pfHeroCard">
        <div className="pfHeroLeft">
          <div className="pfAvatarWrap">
            {imageUrl ? (
              <button
                type="button"
                className="pfAvatarBtn"
                onClick={() => setIsViewerOpen(true)}
                title="View profile image"
              >
                <img src={imageUrl} alt={fullName} className="pfAvatar" />
                <span className="pfAvatarOverlay">View</span>
              </button>
            ) : (
              <div className="pfAvatarFallback">{getInitial(fullName)}</div>
            )}
          </div>

          <div className="pfHeroMeta">
            <div className="pfEyebrow">Account Profile</div>
            <h2 className="pfHeroName">{fullName}</h2>
            <div className="pfHeroSub">{profile?.role || "Merchant User"}</div>

            <div className="pfStatusRow">
              <span
                className={`pfBadge ${profile?.is_verified ? "ok" : "warn"}`}
              >
                {profile?.is_verified ? "Verified" : "Not Verified"}
              </span>

              <span
                className={`pfBadge ${profile?.is_active ? "ok" : "danger"}`}
              >
                {profile?.is_active ? "Active" : "Inactive"}
              </span>

              <span className="pfBadge neutral">
                Last login: {formatLastLogin(profile?.last_login)}
              </span>
            </div>
          </div>
        </div>

        <div className="pfHeroRight">
          <div className="pfHeroActions">
            <label className="pfUploadBtn">
              <input
                type="file"
                accept="image/*"
                onChange={onPickImage}
                hidden
              />
              Change Photo
            </label>

            {imagePending ? (
              <>
                <button
                  type="button"
                  className="pfPrimaryBtn"
                  onClick={onSaveImage}
                  disabled={savingImage}
                >
                  {savingImage ? "Saving..." : "Save Photo"}
                </button>

                <button
                  type="button"
                  className="pfGhostBtn"
                  onClick={onCancelImage}
                  disabled={savingImage}
                >
                  Cancel
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {isViewerOpen && imageUrl ? (
        <div
          className="pfImageModal"
          onClick={() => setIsViewerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Profile image viewer"
        >
          <div
            className="pfImageModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="pfImageModalClose"
              onClick={() => setIsViewerOpen(false)}
              aria-label="Close image viewer"
              title="Close"
            >
              ×
            </button>

            <img src={imageUrl} alt={fullName} className="pfImageModalImg" />
          </div>
        </div>
      ) : null}
    </>
  );
}
