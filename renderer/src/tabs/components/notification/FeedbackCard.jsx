// src/tabs/components/notification/FeedbackCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  fmtDateTime,
  fmtRelativeTime,
  normalizeFeedback,
  normalizeReply,
  safeText,
  pickFeedbackId,
  normalizeType,
} from "./utils";

import { likeRating, unlikeRating } from "./notificationApi";

/* ---------- local like store ---------- */
const LIKE_STORE_KEY = "fb_like_map_v1";

function loadLikeMap() {
  try {
    const raw = localStorage.getItem(LIKE_STORE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function saveLikeMap(map) {
  try {
    localStorage.setItem(LIKE_STORE_KEY, JSON.stringify(map || {}));
  } catch {
    // ignore
  }
}

function likeKey({ owner_type, rating_id, business_id }) {
  return `${String(owner_type || "")}:${String(business_id || "")}:${String(
    rating_id || "",
  )}`;
}

function Stars({ value }) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const full = Math.max(0, Math.min(5, Math.round(n)));
  return (
    <span className="fbStars" title={`${Number(n).toFixed(1)} / 5`}>
      {"★".repeat(full)}
      {"☆".repeat(5 - full)}
    </span>
  );
}

export default function FeedbackCard({
  item,
  busy,
  token,
  owner_type,
  currentUserId,
  onRefresh,
  onReply,
  onDeleteReply,
  toast,
  onReport, // ✅ NEW: opens ReportModal in parent
}) {
  const fb = useMemo(() => normalizeFeedback(item), [item]);

  const rating_id = useMemo(() => pickFeedbackId(fb), [fb]);
  const apiType = useMemo(
    () => normalizeType(fb.owner_type || owner_type),
    [fb.owner_type, owner_type],
  );

  const replies = useMemo(() => {
    return (fb.replies || [])
      .map(normalizeReply)
      .filter((r) => String(r.message || "").trim());
  }, [fb.replies]);

  const [showReplies, setShowReplies] = useState(false);

  const createdLabel = useMemo(() => {
    const rel = fmtRelativeTime({ hours_ago: fb.hours_ago });
    return rel && rel !== "—" ? rel : fmtDateTime(fb.created_at);
  }, [fb.created_at, fb.hours_ago]);

  /* ---------- like state ---------- */
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(
    Number(fb.likes_count ?? 0) || 0,
  );

  useEffect(() => {
    setLikesCount(Number(fb.likes_count ?? 0) || 0);

    const map = loadLikeMap();
    const key = likeKey({
      owner_type: apiType,
      rating_id,
      business_id: fb.business_id,
    });
    setLiked(!!map[key]);
  }, [fb.likes_count, apiType, rating_id, fb.business_id]);

  const toggleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!rating_id) return toast?.error?.("Rating id missing.");
    if (!token) return toast?.error?.("Session token missing.");
    if (busy) return;

    const key = likeKey({
      owner_type: apiType,
      rating_id,
      business_id: fb.business_id,
    });

    const map = loadLikeMap();

    if (!liked) {
      // optimistic like
      setLiked(true);
      setLikesCount((v) => v + 1);
      map[key] = 1;
      saveLikeMap(map);

      try {
        await likeRating({ type: apiType, rating_id, token });
        toast?.success?.("Liked.");
        onRefresh?.();
      } catch (err) {
        setLiked(false);
        setLikesCount((v) => Math.max(0, v - 1));
        delete map[key];
        saveLikeMap(map);
        toast?.error?.(err?.message || "Failed to like.");
      }
      return;
    }

    // optimistic unlike
    setLiked(false);
    setLikesCount((v) => Math.max(0, v - 1));
    delete map[key];
    saveLikeMap(map);

    try {
      await unlikeRating({ type: apiType, rating_id, token });
      toast?.success?.("Unliked.");
      onRefresh?.();
    } catch (err) {
      setLiked(true);
      setLikesCount((v) => v + 1);
      map[key] = 1;
      saveLikeMap(map);
      toast?.error?.(err?.message || "Failed to unlike.");
    }
  };

  /* ---------- reporting (NO prompt) ---------- */
  const reportThisRating = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!rating_id) return toast?.error?.("Rating id missing.");
    if (!token) return toast?.error?.("Session token missing.");
    if (busy) return;

    onReport?.({
      kind: "rating",
      type: apiType,
      rating_id,
    });
  };

  const reportThisReply = (e, r) => {
    e.preventDefault();
    e.stopPropagation();

    const reply_id = r?.reply_id || r?.id;
    if (!reply_id) return toast?.error?.("Reply id missing.");
    if (!token) return toast?.error?.("Session token missing.");
    if (busy) return;

    onReport?.({
      kind: "reply",
      type: apiType,
      reply_id,
    });
  };

  const canDeleteReply = (r) => {
    const ridOwner = Number(r?.user_id ?? r?.user?.user_id ?? 0);
    const me = Number(currentUserId ?? 0);
    return me > 0 && ridOwner > 0 && me === ridOwner;
  };

  return (
    <div className="ntCard">
      <div className="ntCardTop">
        <div className="ntCardTitleRow">
          <div className="ntCardTitle">
            {fb.user_name ? safeText(fb.user_name) : "Customer Feedback"}

            {fb.rating != null ? (
              <span className="fbRating">
                <Stars value={fb.rating} />
                <span className="fbRatingNum">
                  {Number(fb.rating).toFixed(1)}
                </span>
              </span>
            ) : null}
          </div>

          <div className="ntCardRight">
            <span className="ntPill neutral">Feedback</span>
          </div>
        </div>

        <div className="ntCardMeta">
          <span className="ntMetaItem">Posted: {createdLabel}</span>
          {fb.reply_count ? (
            <span className="ntMetaItem">Replies: {fb.reply_count}</span>
          ) : null}
          <span className="ntMetaItem">Likes: {likesCount}</span>
        </div>
      </div>

      {fb.comment ? <div className="ntCardBody">{fb.comment}</div> : null}

      {/* ✅ actions row with gap */}
      <div
        className="fbActionsRow"
        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        <button
          type="button"
          className={`ntBtn ntBtnSoft fbLikeBtn ${liked ? "isLiked" : ""}`}
          disabled={!!busy || !rating_id}
          onClick={toggleLike}
          title={liked ? "Unlike" : "Like"}
        >
          {liked ? "♥ Liked" : "♡ Like"} ({likesCount})
        </button>

        <button
          type="button"
          className="ntBtn ntBtnSoft fbReportBtn"
          disabled={!!busy || !rating_id}
          onClick={reportThisRating}
          title="Report this feedback"
        >
          Report
        </button>

        <button
          type="button"
          className="ntBtn ntBtnPrimary"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReply?.(fb);
          }}
          disabled={!!busy || !rating_id}
        >
          Reply
        </button>

        <button
          type="button"
          className="ntBtn ntBtnSoft"
          disabled={!!busy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowReplies((v) => !v);
          }}
        >
          {showReplies ? "Hide replies" : "View replies"}
        </button>
      </div>

      {/* Replies */}
      {showReplies ? (
        replies.length ? (
          <div className="fbReplies">
            <div className="fbRepliesTitle">Replies</div>

            {replies.map((r, idx) => {
              const rel = fmtRelativeTime({ hours_ago: r.hours_ago });
              const tsLabel =
                rel && rel !== "—" ? rel : fmtDateTime(r.ts || r.created_at);

              return (
                <div className="fbReplyRow" key={r.reply_id || idx}>
                  <div className="fbReplyText">
                    <div className="fbReplyMsg">{safeText(r.message)}</div>
                    <div className="fbReplyMeta">
                      {r.user_name ? `${safeText(r.user_name)} • ` : ""}
                      {tsLabel}
                    </div>

                    <div
                      className="fbReplyMiniActions"
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 8,
                      }}
                    >
                      <button
                        type="button"
                        className="ntBtn ntBtnSoft fbReplyReport"
                        disabled={!!busy}
                        onClick={(e) => reportThisReply(e, r)}
                        title="Report reply"
                      >
                        Report
                      </button>

                      {canDeleteReply(r) ? (
                        <button
                          type="button"
                          className="ntBtn ntBtnDanger fbReplyDel"
                          disabled={!!busy}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeleteReply?.(r, fb);
                          }}
                          title="Delete your reply"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="fbReplies">
            <div className="fbRepliesTitle">Replies</div>
            <div className="ntEmpty">No replies yet.</div>
          </div>
        )
      ) : null}
    </div>
  );
}
