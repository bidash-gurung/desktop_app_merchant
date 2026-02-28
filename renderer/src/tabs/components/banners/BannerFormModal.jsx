// renderer/src/tabs/components/banners/BannerFormModal.jsx
import React from "react";
import {
  Modal,
  Input,
  Textarea,
  Switch,
  PrimaryButton,
  SecondaryButton,
  fmtNu,
  daysInclusive,
  todayISO,
} from "./ui.jsx";
import { getBasePrice, getBannerImageUrl } from "./bannerApi";

function toStr(v) {
  return String(v ?? "").trim();
}

function isFoodMart(v) {
  const s = String(v || "").toLowerCase();
  return s === "food" || s === "mart";
}

function ownerLabel(v) {
  const s = String(v || "").toLowerCase();
  if (s === "food") return "FOOD";
  if (s === "mart") return "MART";
  return "—";
}

/** allow today OR future (>= today) */
function isTodayOrFutureISODate(iso) {
  if (!iso) return false;
  const t = new Date(`${todayISO()}T00:00:00`).getTime();
  const x = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(x)) return false;
  return x >= t;
}

/** Inclusive day set: YYYY-MM-DD */
function daySet(start, end) {
  const set = new Set();
  if (!start || !end) return set;

  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return set;
  if (b.getTime() < a.getTime()) return set;

  const cur = new Date(a);
  while (cur.getTime() <= b.getTime()) {
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, "0");
    const dd = String(cur.getDate()).padStart(2, "0");
    set.add(`${yyyy}-${mm}-${dd}`);
    cur.setDate(cur.getDate() + 1);
  }
  return set;
}

/** Matches backend auto_price: charge only "additional" days not covered previously */
function computeAdditionalDays(prevStart, prevEnd, newStart, newEnd) {
  const prev = daySet(prevStart, prevEnd);
  const next = daySet(newStart, newEnd);

  let added = 0;
  next.forEach((d) => {
    if (!prev.has(d)) added += 1;
  });
  return added;
}

function rangeLabel(s, e) {
  if (!s || !e) return "—";
  return `${s} → ${e}`;
}

export default function BannerFormModal({
  open,
  onClose,
  mode, // "create" | "edit"
  initial,
  session,
  userId,
  businessId,
  onSubmit, // async(formData) -> response
}) {
  const isEdit = mode === "edit";

  const [owner_type, setOwnerType] = React.useState(
    initial?.owner_type || "food",
  );
  const [title, setTitle] = React.useState(initial?.title || "");
  const [description, setDescription] = React.useState(
    initial?.description || "",
  );
  const [is_active, setIsActive] = React.useState(
    initial?.is_active != null ? Number(initial.is_active) === 1 : true,
  );

  const [start_date, setStartDate] = React.useState(
    initial?.start_date ? String(initial.start_date).slice(0, 10) : todayISO(),
  );
  const [end_date, setEndDate] = React.useState(
    initial?.end_date ? String(initial.end_date).slice(0, 10) : todayISO(),
  );

  const [file, setFile] = React.useState(null);
  const [clearImage, setClearImage] = React.useState(false);
  const [filePreview, setFilePreview] = React.useState(null);

  const [basePerDay, setBasePerDay] = React.useState(null);
  const [baseErr, setBaseErr] = React.useState("");

  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // ✅ Confirmation modal state
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmInfo, setConfirmInfo] = React.useState(null);

  // snapshots for edit diff
  const initStart = String(initial?.start_date || "").slice(0, 10);
  const initEnd = String(initial?.end_date || "").slice(0, 10);
  const initActive =
    initial?.is_active != null ? Number(initial.is_active) === 1 : false;

  React.useEffect(() => {
    if (!open) return;

    setOwnerType(
      isFoodMart(initial?.owner_type) ? String(initial.owner_type) : "food",
    );
    setTitle(initial?.title || "");
    setDescription(initial?.description || "");
    setIsActive(
      initial?.is_active != null ? Number(initial.is_active) === 1 : true,
    );

    setStartDate(
      initial?.start_date
        ? String(initial.start_date).slice(0, 10)
        : todayISO(),
    );
    setEndDate(
      initial?.end_date ? String(initial.end_date).slice(0, 10) : todayISO(),
    );

    setFile(null);
    setClearImage(false);
    setFilePreview(null);

    setErr("");
    setConfirmOpen(false);
    setConfirmInfo(null);
  }, [open, initial]);

  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    const ctrl = new AbortController();

    (async () => {
      try {
        setBaseErr("");
        const out = await getBasePrice({ session, signal: ctrl.signal });
        if (!alive) return;
        setBasePerDay(Number(out.amount_per_day));
      } catch (e) {
        if (!alive) return;
        setBaseErr(e?.message || "Failed to fetch base price");
        setBasePerDay(null);
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [open, session]);

  const totalDays = daysInclusive(start_date, end_date);
  const canAuto = basePerDay != null && totalDays > 0;
  const computedAutoFull = canAuto ? Number(basePerDay) * Number(totalDays) : 0;

  const datesChanged =
    isEdit &&
    (String(start_date || "") !== initStart ||
      String(end_date || "") !== initEnd);

  const activeChanged = isEdit && Boolean(is_active) !== Boolean(initActive);

  function validate() {
    if (!businessId) return "Missing business_id in session.";
    if (!userId) return "Missing user_id in session.";
    if (!isFoodMart(owner_type)) return "owner_type must be food or mart.";
    if (!toStr(title)) return "Title is required.";
    if (!start_date || !end_date)
      return "Start date and End date are required.";
    if (totalDays <= 0) return "End date must be on/after start date.";

    // activation rule: today or future
    if (Boolean(is_active) === true) {
      const creatingActive = !isEdit;
      const activatingNow =
        isEdit && !initActive && Boolean(is_active) === true;

      if (
        (creatingActive || activatingNow) &&
        !isTodayOrFutureISODate(start_date)
      ) {
        return "To activate this banner, please select a start date of today or a future date.";
      }
    }

    if (!isEdit && !file) return "Please upload a banner image to continue.";
    if (!canAuto)
      return "Pricing is not available yet (base price or dates missing).";

    return "";
  }

  function buildFormPayload() {
    const form = {
      business_id: String(businessId),
      title: toStr(title),
      description: toStr(description),
      owner_type: String(owner_type).toLowerCase(),
      is_active: is_active ? "1" : "0",
      start_date,
      end_date,
      user_id: String(userId),
    };

    if (file) form.banner_image = file;
    else if (isEdit && clearImage) form.banner_image = "";

    return form;
  }

  function computeChargePreview() {
    if (!canAuto) return { shouldConfirm: false, amount: 0, days: 0 };

    // CREATE: charge full range
    if (!isEdit) {
      return {
        shouldConfirm: true,
        amount: Number(computedAutoFull),
        days: Number(totalDays || 0),
        mode: "create",
      };
    }

    // EDIT: confirmation only when datesChanged AND additional days > 0
    if (!datesChanged) {
      return { shouldConfirm: false, amount: 0, days: 0, mode: "edit" };
    }

    const addDays = computeAdditionalDays(
      initStart,
      initEnd,
      start_date,
      end_date,
    );
    const amount = addDays > 0 ? Number(addDays) * Number(basePerDay) : 0;

    return {
      shouldConfirm: amount > 0,
      amount,
      days: addDays,
      mode: "edit",
    };
  }

  async function doSubmitConfirmed() {
    setErr("");

    const form = buildFormPayload();

    if (!isEdit) {
      form.total_amount = String(Number(computedAutoFull));
    } else {
      if (datesChanged) form.auto_price = "true";
      void activeChanged;
    }

    setBusy(true);
    try {
      const out = await onSubmit?.(form);
      onClose?.(out);
    } catch (e) {
      setErr(e?.message || "Failed to save banner.");
      // if submit fails, bring the form back so they can retry
      setConfirmOpen(false);
      setConfirmInfo(null);
    } finally {
      setBusy(false);
    }
  }

  function onSaveClick() {
    setErr("");
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    const preview = computeChargePreview();

    if (preview.shouldConfirm) {
      const note =
        preview.mode === "create"
          ? "This amount will be deducted now to publish your banner."
          : "Additional days will be charged and deducted from your wallet.";

      setConfirmInfo({
        amount: preview.amount,
        days: preview.days,
        range: rangeLabel(start_date, end_date),
        note,
      });

      // ✅ Hide form and show confirmation only
      setConfirmOpen(true);
      return;
    }

    // no charge -> save directly
    doSubmitConfirmed();
  }

  // ✅ When confirmation is open, DO NOT render the form modal at all
  if (confirmOpen) {
    return (
      <Modal
        open={true}
        onClose={() => (!busy ? setConfirmOpen(false) : null)}
        title="Confirm payment"
        subtitle="Please review the deduction before saving."
        footer={
          <div className="bnFormFooter">
            <SecondaryButton
              disabled={busy}
              onClick={() => setConfirmOpen(false)}
            >
              Back
            </SecondaryButton>
            <PrimaryButton disabled={busy} onClick={doSubmitConfirmed}>
              {busy ? "Processing..." : "Confirm & Save"}
            </PrimaryButton>
          </div>
        }
      >
        <div className="bnAlert warn" style={{ marginBottom: 12 }}>
          <div className="bnAlertTitle">Wallet deduction</div>
          <div className="bnAlertBody">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Amount</span>
              <b>{fmtNu(confirmInfo?.amount)}</b>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 6,
              }}
            >
              <span>Days charged</span>
              <b>{confirmInfo?.days ?? 0}</b>
            </div>
            <div style={{ marginTop: 10, opacity: 0.9 }}>
              <div>
                <b>Date range</b>: {confirmInfo?.range || "—"}
              </div>
              <div style={{ marginTop: 6 }}>{confirmInfo?.note}</div>
            </div>
          </div>
        </div>

        <div className="bnMuted">If you go back, no changes will be saved.</div>
      </Modal>
    );
  }

  // Normal form modal
  return (
    <Modal
      open={open}
      onClose={() => (!busy ? onClose?.() : null)}
      title={isEdit ? "Edit banner" : "Create banner"}
      subtitle={
        <span className="bnModalSubtitleRow">
          <span className="bnTypePill">{ownerLabel(owner_type)}</span>
          <span className="bnSubText">
            Pricing is calculated automatically from base price × days.
          </span>
        </span>
      }
      footer={
        <div className="bnFormFooter">
          <SecondaryButton disabled={busy} onClick={() => onClose?.()}>
            Cancel
          </SecondaryButton>
          <PrimaryButton disabled={busy} onClick={onSaveClick}>
            {busy ? "Saving..." : isEdit ? "Save changes" : "Create banner"}
          </PrimaryButton>
        </div>
      }
    >
      {err ? (
        <div className="bnAlert danger" style={{ marginBottom: 12 }}>
          <div className="bnAlertTitle">Error</div>
          <div className="bnAlertBody">{err}</div>
        </div>
      ) : null}

      {baseErr ? (
        <div className="bnAlert warn" style={{ marginBottom: 12 }}>
          <div className="bnAlertTitle">Pricing</div>
          <div className="bnAlertBody">{baseErr}</div>
        </div>
      ) : null}

      <div className="bnGrid2 bnGridTight">
        <div className="bnInlineCard">
          <Switch
            checked={is_active}
            onChange={setIsActive}
            label="Active"
            sub="Turn off to hide it"
          />
        </div>

        <div className="bnInlineCard bnInlineInfo">
          <div className="bnInlineInfoTitle">Note</div>
          <div className="bnInlineInfoSub">
            Pricing is calculated automatically from base price × days.
          </div>
        </div>
      </div>

      <div className="bnGrid2 bnGridTight">
        <Input
          label="Start date"
          type="date"
          value={start_date}
          onChange={(e) => setStartDate(e.target.value)}
          hint="Required"
        />
        <Input
          label="End date"
          type="date"
          value={end_date}
          onChange={(e) => setEndDate(e.target.value)}
          hint="Required"
        />
      </div>

      <Input
        label="Title"
        placeholder="e.g., Weekend Offer"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <Textarea
        label="Description"
        placeholder="Short description shown in the app…"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* Image */}
      <div className="bnUpload bnUploadCompact">
        <div className="bnUploadTop">
          <div className="bnLabel">Banner image</div>
          {isEdit ? (
            <label className="bnCheck">
              <input
                type="checkbox"
                checked={clearImage}
                onChange={(e) => setClearImage(e.target.checked)}
                disabled={!!file}
              />
              <span>Clear existing</span>
            </label>
          ) : null}
        </div>

        {isEdit && initial?.banner_image && !file && !clearImage ? (
          <div className="bnExistingImage">
            <div className="bnExistingImageLabel">Current image</div>
            <div className="bnImagePreview bnImagePreviewCompact">
              <img
                src={getBannerImageUrl(initial.banner_image)}
                alt="Current banner"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          </div>
        ) : null}

        {file ? (
          <div className="bnExistingImage">
            <div className="bnExistingImageLabel">New image preview</div>
            <div className="bnImagePreview bnImagePreviewCompact">
              <img
                src={filePreview}
                alt="New banner"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          </div>
        ) : null}

        <input
          className="bnFile"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setFile(f);
            if (f) {
              setClearImage(false);
              const reader = new FileReader();
              reader.onload = (event) => setFilePreview(event.target.result);
              reader.readAsDataURL(f);
            } else {
              setFilePreview(null);
            }
          }}
        />

        <div className="bnUploadHint">
          Field name: <b>banner_image</b> • JPG, PNG, GIF, WebP
        </div>
      </div>

      {/* Pricing preview */}
      <div className="bnPriceBox bnPriceCompact">
        <div className="bnPriceTop">
          <div>
            <div className="bnPriceTitle">Pricing</div>
            <div className="bnPriceSub">
              Base per day:{" "}
              {basePerDay != null ? (
                <b>{fmtNu(basePerDay)}</b>
              ) : (
                <span className="bnMuted">—</span>
              )}
              {" · "}
              Days: <b>{totalDays || 0}</b>
            </div>
          </div>
          <div className="bnPricePill">AUTO</div>
        </div>

        <div className="bnPriceAuto">
          <div className="bnPriceRow">
            <span>Computed (full range)</span>
            <span className="bnPriceVal">
              {canAuto ? fmtNu(computedAutoFull) : "—"}
            </span>
          </div>
          <div className="bnMuted" style={{ marginTop: 6 }}>
            Create charges full range. Edit charges only additional days.
          </div>
        </div>
      </div>
    </Modal>
  );
}
