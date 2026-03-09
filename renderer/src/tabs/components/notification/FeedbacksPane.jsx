// src/tabs/components/notification/FeedbacksPane.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import FeedbackCard from "./FeedbackCard";
import FeedbackReplyModal from "./FeedbackReplyModal";
import ToastHost, { useToasts } from "./Toasts";
import ConfirmModal from "./ConfirmModal";
import {
  listFeedbacksWithMeta,
  sendFeedbackReply,
  likeFeedback,
  unlikeFeedback,
  deleteFeedbackReply,
} from "./notificationApi";
import { safeText } from "./utils";

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function FeedbackSummary({ meta }) {
  const totals = meta?.totals || null;
  if (!totals) return null;

  const avg = Number(totals.avg_rating ?? 0) || 0;
  const totalRatings = Number(totals.total_ratings ?? 0) || 0;
  const totalComments = Number(totals.total_comments ?? 0) || 0;

  const by = totals.by_stars || {};
  const c1 = Number(by["1"] ?? 0) || 0;
  const c2 = Number(by["2"] ?? 0) || 0;
  const c3 = Number(by["3"] ?? 0) || 0;
  const c4 = Number(by["4"] ?? 0) || 0;
  const c5 = Number(by["5"] ?? 0) || 0;

  const max = Math.max(1, c1, c2, c3, c4, c5);

  const rows = [
    { star: 5, count: c5, pct: clamp01(c5 / max) },
    { star: 4, count: c4, pct: clamp01(c4 / max) },
    { star: 3, count: c3, pct: clamp01(c3 / max) },
    { star: 2, count: c2, pct: clamp01(c2 / max) },
    { star: 1, count: c1, pct: clamp01(c1 / max) },
  ];

  return (
    <div className="fbSummary">
      <div className="fbSummaryLeft">
        <div className="fbAvg">{avg.toFixed(1)}</div>
        <div className="fbAvgLabel">Average rating</div>

        <div className="fbSummaryCounts">
          <div className="fbCount">
            <div className="fbCountN">{totalRatings}</div>
            <div className="fbCountL">Total ratings</div>
          </div>

          <div className="fbCount">
            <div className="fbCountN">{totalComments}</div>
            <div className="fbCountL">Total comments</div>
          </div>
        </div>
      </div>

      <div className="fbSummaryRight">
        {rows.map((r) => (
          <div key={r.star} className="fbStarRow">
            <div className="fbStarLabel">{r.star}★</div>
            <div className="fbStarBar">
              <div
                className="fbStarFill"
                style={{ width: `${r.pct * 100}%` }}
              />
            </div>
            <div className="fbStarCount">{r.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeedbacksPane({ session }) {
  const { toasts, toast } = useToasts();

  const token = session?.token || null;
  const business_id = session?.business_id || null;
  const owner_type = session?.owner_type || "food";

  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);

  // reply modal
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);

  // delete reply confirm
  const [delOpen, setDelOpen] = useState(false);
  const [delTarget, setDelTarget] = useState(null); // { reply, fb }

  const canLoad = !!token && !!business_id;

  const load = useCallback(async () => {
    if (!canLoad) return;
    setBusy(true);
    try {
      const out = await listFeedbacksWithMeta({ business_id, token });
      setRows(out.rows || []);
      setMeta(out.meta || null);
    } catch (e) {
      toast.error(safeText(e?.message, "Failed to load feedbacks"));
    } finally {
      setBusy(false);
    }
  }, [canLoad, business_id, token, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const headerText = useMemo(() => {
    const totals = meta?.totals;
    if (!totals) return "Customer ratings & replies";
    const avg = Number(totals.avg_rating ?? 0) || 0;
    const tr = Number(totals.total_ratings ?? 0) || 0;
    const tc = Number(totals.total_comments ?? 0) || 0;
    return `Average: ${avg.toFixed(1)} • Ratings: ${tr} • Comments: ${tc}`;
  }, [meta]);

  return (
    <>
      <ToastHost toasts={toasts} onClose={toast.remove} />

      <div className="ntHeader">
        <div>
          <h2 className="ntTitle">Feedback</h2>
          <div className="ntSub">{headerText}</div>
        </div>

        <div className="ntHeaderRight">
          <button
            className="ntBtn ntBtnSoft"
            onClick={load}
            disabled={!!busy || !canLoad}
          >
            {busy ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ✅ visual totals summary */}
      <FeedbackSummary meta={meta} />

      {!canLoad ? (
        <div className="ntEmpty">Missing session/token/business_id.</div>
      ) : rows?.length ? (
        <div className="ntList">
          {rows.map((it) => (
            <FeedbackCard
              key={it?.id ?? JSON.stringify(it)}
              item={it}
              busy={busy}
              onReply={(fb) => {
                // ✅ NO confirm modal here
                setReplyTarget(fb);
                setReplyOpen(true);
              }}
              onDeleteReply={(reply, fb) => {
                if (!reply?.reply_id) return;
                setDelTarget({ reply, fb });
                setDelOpen(true);
              }}
              onToggleLike={async (fb, nextLiked) => {
                if (!fb?.id) return;
                const t = fb?.owner_type || owner_type;

                if (nextLiked) {
                  await likeFeedback({
                    rating_id: fb.id,
                    owner_type: t,
                    token,
                  });
                  toast.success("Liked");
                } else {
                  await unlikeFeedback({
                    rating_id: fb.id,
                    owner_type: t,
                    token,
                  });
                  toast.info("Unliked");
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="ntEmpty">
          {busy ? "Loading..." : "No feedback yet."}
        </div>
      )}

      {/* ✅ Reply modal */}
      <FeedbackReplyModal
        open={replyOpen}
        busy={busy}
        onCancel={() => {
          if (busy) return;
          setReplyOpen(false);
          setReplyTarget(null);
        }}
        onSubmit={async (text) => {
          if (!replyTarget?.id) return;

          setBusy(true);
          try {
            await sendFeedbackReply({
              rating_id: replyTarget.id,
              owner_type: replyTarget?.owner_type || owner_type,
              token,
              reply: text,
            });
            toast.success("Reply sent");
            setReplyOpen(false);
            setReplyTarget(null);
            await load();
          } catch (e) {
            toast.error(safeText(e?.message, "Failed to send reply"));
          } finally {
            setBusy(false);
          }
        }}
      />

      {/* ✅ Confirm only for delete reply */}
      <ConfirmModal
        open={delOpen}
        title="Delete reply?"
        message="This will permanently remove the reply."
        confirmText={busy ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        busy={busy}
        tone="danger"
        onCancel={() => {
          if (busy) return;
          setDelOpen(false);
          setDelTarget(null);
        }}
        onConfirm={async () => {
          if (!delTarget?.reply?.reply_id) return;

          setBusy(true);
          try {
            await deleteFeedbackReply({
              reply_id: delTarget.reply.reply_id,
              owner_type: delTarget?.fb?.owner_type || owner_type,
              token,
            });
            toast.success("Reply deleted");
            setDelOpen(false);
            setDelTarget(null);
            await load();
          } catch (e) {
            toast.error(safeText(e?.message, "Failed to delete reply"));
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
