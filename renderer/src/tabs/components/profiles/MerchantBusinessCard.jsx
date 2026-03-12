// src/tabs/components/profiles/MerchantBusinessCard.jsx
import React from "react";

function boolToYesNo(v) {
  return String(v) === "1" || v === true ? "1" : "0";
}

function normalizeListInput(value) {
  return String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function MerchantBusinessCard({
  form,
  onChange,
  onPickLogo,
  onPickLicense,
  onSave,
  onRemoveCelebration,
  onOpenMapPicker,
  saving,
  removingCelebration,
  pendingLogo,
  pendingLicense,
}) {
  const [viewer, setViewer] = React.useState({
    open: false,
    src: "",
    title: "",
  });

  const openViewer = React.useCallback((src, title) => {
    if (!src) return;
    setViewer({ open: true, src, title });
  }, []);

  const closeViewer = React.useCallback(() => {
    setViewer({ open: false, src: "", title: "" });
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeViewer();
    };
    if (viewer.open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewer.open, closeViewer]);

  return (
    <>
      <section className="pfCard">
        <div className="pfCardHead">
          <div>
            <h3 className="pfCardTitle">Business Details</h3>
            <p className="pfCardSub">
              Manage merchant business information, images, timings and special
              celebration.
            </p>
          </div>
        </div>

        <form
          className="pfForm"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="pfBizMediaGrid">
            <div className="pfMediaCard">
              <div className="pfMediaHead">
                <div className="pfMediaTitle">Business Logo</div>
                <label className="pfSmallBtn">
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onPickLogo}
                  />
                  Change Logo
                </label>
              </div>

              <button
                type="button"
                className="pfMediaPreview"
                onClick={() =>
                  openViewer(
                    pendingLogo || form.business_logo_url,
                    "Business Logo",
                  )
                }
              >
                {pendingLogo || form.business_logo_url ? (
                  <img
                    src={pendingLogo || form.business_logo_url}
                    alt="Business logo"
                    className="pfMediaImg"
                  />
                ) : (
                  <div className="pfMediaEmpty">No logo</div>
                )}
              </button>
            </div>

            <div className="pfMediaCard">
              <div className="pfMediaHead">
                <div className="pfMediaTitle">License Image</div>
                <label className="pfSmallBtn">
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onPickLicense}
                  />
                  Change License
                </label>
              </div>

              <button
                type="button"
                className="pfMediaPreview"
                onClick={() =>
                  openViewer(
                    pendingLicense || form.license_image_url,
                    "License Image",
                  )
                }
              >
                {pendingLicense || form.license_image_url ? (
                  <img
                    src={pendingLicense || form.license_image_url}
                    alt="License"
                    className="pfMediaImg"
                  />
                ) : (
                  <div className="pfMediaEmpty">No license image</div>
                )}
              </button>
            </div>
          </div>

          <div className="pfFieldGrid">
            <div className="pfField">
              <label className="pfLabel">Business Name</label>
              <input
                className="pfInput"
                name="business_name"
                value={form.business_name}
                onChange={onChange}
                placeholder="Enter business name"
              />
            </div>

            <div className="pfField pfFieldFull">
              <label className="pfLabel">Address</label>
              <div className="pfInputWithAction">
                <input
                  className="pfInput"
                  name="address"
                  value={form.address}
                  onChange={onChange}
                  placeholder="Enter business address"
                />
                <button
                  type="button"
                  className="pfSmallBtn pfInlineActionBtn"
                  onClick={onOpenMapPicker}
                >
                  Pick From Map
                </button>
              </div>
            </div>

            <div className="pfField">
              <label className="pfLabel">Latitude</label>
              <input
                className="pfInput"
                name="latitude"
                value={form.latitude}
                onChange={onChange}
                placeholder="Latitude"
              />
            </div>

            <div className="pfField">
              <label className="pfLabel">Longitude</label>
              <input
                className="pfInput"
                name="longitude"
                value={form.longitude}
                onChange={onChange}
                placeholder="Longitude"
              />
            </div>

            <div className="pfField">
              <label className="pfLabel">Opening Time</label>
              <input
                className="pfInput"
                type="time"
                name="opening_time"
                value={form.opening_time}
                onChange={onChange}
              />
            </div>

            <div className="pfField">
              <label className="pfLabel">Closing Time</label>
              <input
                className="pfInput"
                type="time"
                name="closing_time"
                value={form.closing_time}
                onChange={onChange}
              />
            </div>

            <div className="pfField">
              <label className="pfLabel">Delivery Option</label>
              <select
                className="pfInput"
                name="delivery_option"
                value={form.delivery_option}
                onChange={onChange}
              >
                <option value="">Select</option>
                <option value="DELIVERY">Self Delivery</option>
                <option value="PICKUP">Tabdhey Delivery</option>
                <option value="BOTH">Both</option>
              </select>
            </div>

            <div className="pfField">
              <label className="pfLabel">Minimum Amount For FD</label>
              <input
                className="pfInput"
                name="min_amount_for_fd"
                value={form.min_amount_for_fd}
                onChange={onChange}
                placeholder="Enter minimum amount"
              />
            </div>

            <div className="pfField">
              <label className="pfLabel">Complementary</label>
              <select
                className="pfInput"
                name="complementary"
                value={boolToYesNo(form.complementary)}
                onChange={onChange}
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>

            <div className="pfField">
              <label className="pfLabel">Complementary Details</label>
              <input
                className="pfInput"
                name="complementary_details"
                value={form.complementary_details}
                onChange={onChange}
                placeholder="Enter complementary details"
              />
            </div>

            <div className="pfField pfFieldFull">
              <label className="pfLabel">Holidays</label>
              <input
                className="pfInput"
                name="holidays"
                value={form.holidays}
                onChange={onChange}
                placeholder="Example: Saturday, Sunday"
              />
            </div>
          </div>

          <div className="pfSectionDivider" />

          <div className="pfCardHead pfCardHeadCompact">
            <div>
              <h4 className="pfSectionTitle">Special Celebration</h4>
              <p className="pfCardSub">
                Add or remove a special celebration and discount percentage.
              </p>
            </div>

            <button
              type="button"
              className="pfGhostBtn"
              onClick={onRemoveCelebration}
              disabled={removingCelebration}
            >
              {removingCelebration ? "Removing..." : "Remove Celebration"}
            </button>
          </div>

          <div className="pfFieldGrid">
            <div className="pfField">
              <label className="pfLabel">Special Celebration</label>
              <input
                className="pfInput"
                name="special_celebration"
                value={form.special_celebration}
                onChange={onChange}
                placeholder="Example: Losar Offer"
              />
            </div>

            <div className="pfField">
              <label className="pfLabel">Discount Percentage</label>
              <input
                className="pfInput"
                name="special_celebration_discount_percentage"
                value={form.special_celebration_discount_percentage}
                onChange={onChange}
                placeholder="Example: 10"
              />
            </div>
          </div>

          <div className="pfActions">
            <button className="pfPrimaryBtn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Business Details"}
            </button>
          </div>
        </form>
      </section>

      {viewer.open ? (
        <div className="pfImageModal" onClick={closeViewer}>
          <div
            className="pfImageModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="pfImageModalClose"
              onClick={closeViewer}
            >
              ×
            </button>
            <img
              src={viewer.src}
              alt={viewer.title}
              className="pfImageModalImg"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

export function buildBusinessPayload(form) {
  return {
    business_name: String(form.business_name || "").trim(),
    latitude: String(form.latitude || "").trim(),
    longitude: String(form.longitude || "").trim(),
    address: String(form.address || "").trim(),
    delivery_option: String(form.delivery_option || "").trim(),
    complementary: String(form.complementary || "0"),
    complementary_details: String(form.complementary_details || "").trim(),
    opening_time: String(form.opening_time || "").trim(),
    closing_time: String(form.closing_time || "").trim(),
    holidays: normalizeListInput(form.holidays),
    special_celebration: String(form.special_celebration || "").trim(),
    special_celebration_discount_percentage: String(
      form.special_celebration_discount_percentage || "",
    ).trim(),
    min_amount_for_fd: String(form.min_amount_for_fd || "").trim(),
  };
}
