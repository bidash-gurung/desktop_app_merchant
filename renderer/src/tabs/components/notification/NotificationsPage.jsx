// src/tabs/components/notification/NotificationsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import TopTabs from "./TopTabs.jsx";
import Toolbar from "./Toolbar.jsx";
import NotificationCard from "./NotificationCard.jsx";
import FeedbackCard from "./FeedbackCard.jsx";
import NotificationDrawer from "./NotificationDrawer.jsx";
import ReplyModal from "./ReplyModal.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import ReportModal from "./ReportModal.jsx";
import ToastHost, { useToasts } from "./Toasts.jsx";

import {
  pickSessionIds,
  getMerchantSessionFromStorage,
} from "./merchantSession.js";

import {
  deleteNotification,
  listBusinessNotifications,
  listSystemNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  listFeedbacksWithMeta,
  sendFeedbackReply,
  deleteFeedbackReply,
  reportFeedback,
  reportFeedbackReply,
} from "./notificationApi.js";

import { isUnread, pickFeedbackId, normalizeType } from "./utils.js";

const TAB_ORDERS = "orders";
const TAB_SYSTEM = "system";
const TAB_FEEDBACKS = "feedbacks";

function toPosInt(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function FeedbackTotals({ meta }) {
  const totals = meta?.totals;
  if (!totals) return null;

  const avg = Number(totals.avg_rating ?? 0);
  const totalRatings = Number(totals.total_ratings ?? 0);
  const totalComments = Number(totals.total_comments ?? 0);
  const by = totals.by_stars || {};
  const max = Math.max(1, totalRatings);

  const rows = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: Number(by[s] ?? by[String(s)] ?? 0),
  }));

  return (
    <div className="fbSummary">
      <div className="fbSummaryLeft">
        <div className="fbAvg">{avg ? avg.toFixed(1) : "0.0"}</div>
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
        {rows.map((r) => {
          const pct = Math.round((r.count / max) * 100);
          return (
            <div key={r.star} className="fbStarRow">
              <div className="fbStarLabel">{r.star}★</div>
              <div className="fbStarBar">
                <div className="fbStarFill" style={{ width: `${pct}%` }} />
              </div>
              <div className="fbStarCount">{r.count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function NotificationsPage({ session }) {
  const { toasts, toast } = useToasts();

  const picked = useMemo(() => {
    const fromProp = pickSessionIds(session);
    if (fromProp?.user_id && fromProp?.business_id) return fromProp;
    return getMerchantSessionFromStorage();
  }, [session]);

  const business_id = toPosInt(picked?.business_id);
  const user_id = toPosInt(picked?.user_id);
  const token = picked?.token;
  const owner_type_session = picked?.owner_type || "food";

  const [activeTab, setActiveTab] = useState(TAB_ORDERS);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [orders, setOrders] = useState([]);
  const [system, setSystem] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackMeta, setFeedbackMeta] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState(null);

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState(""); // "delete_notification" | "delete_reply"
  const [confirmPayload, setConfirmPayload] = useState(null);

  // ✅ report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  // reportTarget: { kind:"rating"|"reply", type:"food|mart", rating_id? , reply_id? }

  const canLoad = useMemo(() => {
    return (
      Number.isFinite(business_id) &&
      business_id > 0 &&
      Number.isFinite(user_id) &&
      user_id > 0
    );
  }, [business_id, user_id]);

  const ordersUnreadCount = useMemo(
    () => orders.filter((x) => isUnread(x)).length,
    [orders],
  );

  const tabs = useMemo(
    () => [
      { key: TAB_ORDERS, label: "Orders", count: ordersUnreadCount },
      { key: TAB_SYSTEM, label: "System", count: system.length },
      { key: TAB_FEEDBACKS, label: "Feedbacks", count: feedbacks.length },
    ],
    [ordersUnreadCount, system.length, feedbacks.length],
  );

  const refresh = useCallback(async () => {
    if (!canLoad) {
      const m = "Merchant session not found. Please login again.";
      setErr(m);
      toast.error(m);
      return;
    }

    setBusy(true);
    setErr("");
    try {
      const [o, s, f] = await Promise.all([
        listBusinessNotifications({
          business_id,
          token,
          unreadOnly: activeTab === TAB_ORDERS ? unreadOnly : false,
          limit: 200,
          offset: 0,
        }),
        listSystemNotifications({ user_id, token }),
        listFeedbacksWithMeta({ business_id, token }),
      ]);

      setOrders(Array.isArray(o) ? o : []);
      setSystem(Array.isArray(s) ? s : []);
      setFeedbacks(Array.isArray(f?.rows) ? f.rows : []);
      setFeedbackMeta(f?.meta || null);
    } catch (e) {
      const m = e?.message || "Failed to load notifications.";
      setErr(m);
      toast.error(m);
    } finally {
      setBusy(false);
    }
  }, [business_id, user_id, token, unreadOnly, canLoad, activeTab, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (activeTab !== TAB_ORDERS) setUnreadOnly(false);
  }, [activeTab]);

  const openDrawer = useCallback((item) => {
    setDrawerItem(item);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerItem(null);
  }, []);

  const openReplyForFeedback = useCallback((fb) => {
    setConfirmOpen(false);
    setConfirmKind("");
    setConfirmPayload(null);
    setReplyTarget(fb);
    setReplyOpen(true);
  }, []);

  const closeReply = useCallback(() => {
    setReplyOpen(false);
    setReplyTarget(null);
  }, []);

  const markRead = useCallback(
    async (item) => {
      const id = item?.notification_id;
      if (!id) return;

      setBusy(true);
      setErr("");
      try {
        await markNotificationRead({ notificationId: id, token });
        setOrders((prev) =>
          prev.map((x) =>
            x?.notification_id === id ? { ...x, is_read: 1 } : x,
          ),
        );
        toast.success("Marked as read.");
      } catch (e) {
        const m = e?.message || "Failed to mark as read.";
        setErr(m);
        toast.error(m);
      } finally {
        setBusy(false);
      }
    },
    [token, toast],
  );

  const markAllRead = useCallback(async () => {
    if (!business_id) return;

    setBusy(true);
    setErr("");
    try {
      await markAllNotificationsRead({ businessId: business_id, token });
      setOrders((prev) => prev.map((x) => ({ ...x, is_read: 1 })));
      toast.success("All notifications marked as read.");
    } catch (e) {
      const m = e?.message || "Failed to mark all as read.";
      setErr(m);
      toast.error(m);
    } finally {
      setBusy(false);
    }
  }, [business_id, token, toast]);

  /* ===================== Delete confirm flows ===================== */

  const askDeleteNotification = useCallback((item) => {
    const id = item?.notification_id || item?.id;
    if (!id) return;
    setConfirmKind("delete_notification");
    setConfirmPayload({ id });
    setConfirmOpen(true);
  }, []);

  const askDeleteReply = useCallback(
    (reply, fb) => {
      const reply_id = Number(reply?.reply_id || reply?.id || 0);
      if (!reply_id) return;

      const rating_id = pickFeedbackId(fb);
      const type = normalizeType(fb?.owner_type || owner_type_session);

      setConfirmKind("delete_reply");
      setConfirmPayload({ reply_id, rating_id, type });
      setConfirmOpen(true);
    },
    [owner_type_session],
  );

  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
    setConfirmKind("");
    setConfirmPayload(null);
  }, []);

  const confirmAction = useCallback(async () => {
    if (!confirmKind) return;

    setBusy(true);
    setErr("");
    try {
      if (confirmKind === "delete_notification") {
        const id = confirmPayload?.id;
        await deleteNotification({ notificationId: id, token });

        // delete from both safely (system uses id)
        setOrders((prev) =>
          prev.filter((x) => x?.notification_id !== id && x?.id !== id),
        );
        setSystem((prev) =>
          prev.filter((x) => x?.notification_id !== id && x?.id !== id),
        );

        toast.success("Notification deleted.");
      }

      if (confirmKind === "delete_reply") {
        const reply_id = confirmPayload?.reply_id;
        const type = confirmPayload?.type;
        await deleteFeedbackReply({ reply_id, owner_type: type, token });
        toast.success("Reply deleted.");
        await refresh();
      }

      closeConfirm();
    } catch (e) {
      const m = e?.message || "Action failed.";
      setErr(m);
      toast.error(m);
    } finally {
      setBusy(false);
    }
  }, [confirmKind, confirmPayload, token, refresh, closeConfirm, toast]);

  /* ===================== Reply submit ===================== */

  const submitFeedbackReply = useCallback(
    async (text) => {
      const t = replyTarget;
      const rating_id = pickFeedbackId(t);
      const type = normalizeType(t?.owner_type || owner_type_session);

      if (!rating_id) return toast.error("Feedback id not found.");

      const msg = String(text || "").trim();
      if (!msg) return toast.error("Reply text is required.");

      setBusy(true);
      setErr("");
      try {
        await sendFeedbackReply({
          rating_id,
          owner_type: type,
          token,
          text: msg,
        });
        closeReply();
        toast.success("Reply sent successfully.");
        await refresh();
      } catch (e) {
        const m = e?.message || "Failed to send reply.";
        setErr(m);
        toast.error(m);
      } finally {
        setBusy(false);
      }
    },
    [replyTarget, token, owner_type_session, closeReply, refresh, toast],
  );

  /* ===================== Report modal flow ===================== */

  const openReport = useCallback((payload) => {
    setReportTarget(payload || null);
    setReportOpen(true);
  }, []);

  const closeReport = useCallback(() => {
    setReportOpen(false);
    setReportTarget(null);
  }, []);

  const submitReport = useCallback(
    async (reason) => {
      const r = String(reason || "").trim();
      if (r.length < 3) return toast.error("Please enter a valid reason.");

      if (!reportTarget) return;

      setBusy(true);
      setErr("");
      try {
        if (reportTarget.kind === "rating") {
          await reportFeedback({
            type: reportTarget.type,
            rating_id: reportTarget.rating_id,
            reason: r,
            token,
          });
          toast.success("Feedback reported.");
        } else {
          await reportFeedbackReply({
            type: reportTarget.type,
            reply_id: reportTarget.reply_id,
            reason: r,
            token,
          });
          toast.success("Reply reported.");
        }

        closeReport();
        await refresh();
      } catch (e) {
        const m = e?.message || "Failed to submit report.";
        setErr(m);
        toast.error(m);
      } finally {
        setBusy(false);
      }
    },
    [reportTarget, token, refresh, closeReport, toast],
  );

  const showUnreadToggle = activeTab === TAB_ORDERS;
  const showMarkAllRead = activeTab === TAB_ORDERS;

  const list = useMemo(() => {
    if (activeTab === TAB_SYSTEM) return system;
    if (activeTab === TAB_FEEDBACKS) return feedbacks;
    return orders;
  }, [activeTab, system, feedbacks, orders]);

  const emptyText = useMemo(() => {
    if (!canLoad) return "Merchant session missing. Please login again.";
    if (activeTab === TAB_SYSTEM) return "No system notifications.";
    if (activeTab === TAB_FEEDBACKS) return "No feedbacks found.";
    return unreadOnly ? "No unread notifications." : "No notifications.";
  }, [activeTab, unreadOnly, canLoad]);

  const confirmTitle = useMemo(() => {
    if (confirmKind === "delete_notification") return "Delete notification?";
    if (confirmKind === "delete_reply") return "Delete reply?";
    return "Confirm";
  }, [confirmKind]);

  const confirmMessage = useMemo(() => {
    if (confirmKind === "delete_notification")
      return "This action cannot be undone.";
    if (confirmKind === "delete_reply") return "This action cannot be undone.";
    return "";
  }, [confirmKind]);

  const confirmVisible =
    confirmOpen &&
    (confirmKind === "delete_notification" || confirmKind === "delete_reply");

  return (
    <div className="ntPage">
      <ToastHost toasts={toasts} onClose={toast.remove} />

      <div className="ntContainer">
        <div className="ntSticky">
          <Toolbar
            title="Notifications"
            unreadOnly={unreadOnly}
            onToggleUnread={(v) => setUnreadOnly(!!v)}
            onRefresh={refresh}
            onMarkAllRead={markAllRead}
            busy={busy}
            showUnreadToggle={showUnreadToggle}
            showMarkAllRead={showMarkAllRead}
          />

          <TopTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

          {err ? <div className="ntError">{err}</div> : null}
        </div>

        <div className="ntScroll">
          {list.length === 0 ? (
            <div className="ntEmpty">{emptyText}</div>
          ) : activeTab === TAB_FEEDBACKS ? (
            <>
              <FeedbackTotals meta={feedbackMeta} />

              <div className="ntList">
                {feedbacks.map((fb, idx) => (
                  <FeedbackCard
                    key={fb?.rating_id || fb?.notification_id || fb?.id || idx}
                    item={fb}
                    busy={busy}
                    token={token}
                    owner_type={owner_type_session}
                    currentUserId={user_id}
                    onRefresh={refresh}
                    onReply={openReplyForFeedback}
                    onDeleteReply={(reply) => askDeleteReply(reply, fb)}
                    toast={toast}
                    onReport={openReport} // ✅ IMPORTANT
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="ntList">
              {list.map((item, idx) => {
                const kind = activeTab === TAB_SYSTEM ? "system" : "orders";
                return (
                  <NotificationCard
                    key={item?.notification_id || item?.id || idx}
                    item={item}
                    kind={kind}
                    busy={busy}
                    onOpen={() => openDrawer(item)}
                    onMarkRead={kind === "orders" ? markRead : undefined}
                    onDelete={() => askDeleteNotification(item)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <NotificationDrawer
        open={drawerOpen}
        item={drawerItem}
        onClose={closeDrawer}
      />

      <ReplyModal
        open={replyOpen}
        item={replyTarget}
        busy={busy}
        onClose={closeReply}
        onSubmit={submitFeedbackReply}
      />

      {/* ✅ REPORT MODAL (no prompt) */}
      <ReportModal
        open={reportOpen}
        busy={busy}
        title={
          reportTarget?.kind === "reply" ? "Report reply" : "Report feedback"
        }
        placeholder="Please describe why you are reporting..."
        confirmText="Submit report"
        cancelText="Cancel"
        onCancel={closeReport}
        onSubmit={submitReport}
      />

      <ConfirmModal
        open={confirmVisible}
        busy={busy}
        title={confirmTitle}
        message={confirmMessage}
        confirmText="Confirm"
        cancelText="Cancel"
        tone="danger"
        onCancel={closeConfirm}
        onConfirm={confirmAction}
      />
    </div>
  );
}
