// renderer/src/tabs/components/banners/BannerCard.jsx
import React from "react";
import { Pill, GhostButton, SecondaryButton, DangerButton } from "./ui.jsx";
import { getBannerImageUrl } from "./bannerApi";

function safeText(v) {
  const s = String(v ?? "").trim();
  return s ? s : "—";
}

function dateText(v) {
  if (!v) return "—";
  return String(v).slice(0, 10);
}

export default function BannerCard({ item, onEdit, onDelete, busy }) {
  const img = getBannerImageUrl(item?.banner_image);

  const active = Number(item?.is_active) === 1;
  const owner = String(item?.owner_type || "").toLowerCase();

  const inWindow =
    (!item?.start_date || new Date(item.start_date) <= new Date()) &&
    (!item?.end_date || new Date(item.end_date) >= new Date());

  const statusTone =
    active && inWindow ? "success" : active ? "warn" : "neutral";
  const statusText =
    active && inWindow ? "Active" : active ? "Scheduled/Expired" : "Inactive";

  return (
    <div className="bnCard">
      <div className="bnCardImg">
        {img ? (
          <img src={img} alt={safeText(item?.title)} />
        ) : (
          <div className="bnCardImgPh">No image</div>
        )}
      </div>

      <div className="bnCardBody">
        <div className="bnCardTop">
          <div className="bnCardTitle">{safeText(item?.title)}</div>
          <div className="bnCardBadges">
            <Pill
              tone={
                owner === "food"
                  ? "food"
                  : owner === "mart"
                    ? "mart"
                    : "neutral"
              }
            >
              {(owner || "—").toUpperCase()}
            </Pill>
            <Pill tone={statusTone}>{statusText}</Pill>
          </div>
        </div>

        <div className="bnCardDesc">{safeText(item?.description)}</div>

        <div className="bnCardMeta">
          <div className="bnMetaRow">
            <span className="bnMetaLbl">Start</span>
            <span className="bnMetaVal">{dateText(item?.start_date)}</span>
          </div>
          <div className="bnMetaRow">
            <span className="bnMetaLbl">End</span>
            <span className="bnMetaVal">{dateText(item?.end_date)}</span>
          </div>
        </div>

        <div className="bnCardActions">
          <SecondaryButton disabled={busy} onClick={() => onEdit?.(item)}>
            Edit
          </SecondaryButton>
          <DangerButton disabled={busy} onClick={() => onDelete?.(item)}>
            Delete
          </DangerButton>

          <div className="bnCardSpacer" />

          <GhostButton
            disabled={busy}
            onClick={() => {
              try {
                navigator.clipboard?.writeText(String(item?.id ?? ""));
              } catch {
                console.warn("Failed to copy banner id");
              }
            }}
            title="Copy banner id"
          >
            #{item?.id}
          </GhostButton>
        </div>
      </div>
    </div>
  );
}
