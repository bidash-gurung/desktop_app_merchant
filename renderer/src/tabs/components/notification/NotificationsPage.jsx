// src/tabs/components/notification/NotificationsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import TopTabs from "./TopTabs.jsx";
import Toolbar from "./Toolbar.jsx";
import NotificationCard from "./NotificationCard.jsx";
import NotificationDrawer from "./NotificationDrawer.jsx";
import ReplyModal from "./ReplyModal.jsx";

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
  sendFeedbackReply,
} from "./notificationApi.js";

import { isFeedbackNotification, isUnread } from "./utils.js";

const TAB_ORDERS = "orders";
const TAB_SYSTEM = "system";

export default function NotificationsPage({ session }) {
  const picked = useMemo(() => {
    const fromProp = pickSessionIds(session);
    if (fromProp?.user_id && fromProp?.business_id) return fromProp;
    return getMerchantSessionFromStorage();
  }, [session]);

  const business_id = picked?.business_id;
  const user_id = picked?.user_id;
  const token = picked?.token;

  const [activeTab, setActiveTab] = useState(TAB_ORDERS);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [orders, setOrders] = useState([]);
  const [system, setSystem] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState(null);

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyItem, setReplyItem] = useState(null);

  const ordersUnreadCount = useMemo(
    () => orders.filter((x) => isUnread(x)).length,
    [orders],
  );
  const systemCount = useMemo(() => system.length, [system]);

  const tabs = useMemo(
    () => [
      { key: TAB_ORDERS, label: "Orders", count: ordersUnreadCount },
      { key: TAB_SYSTEM, label: "System", count: systemCount },
    ],
    [ordersUnreadCount, systemCount],
  );

  const canLoad = useMemo(() => {
    return (
      Number.isFinite(business_id) &&
      business_id > 0 &&
      Number.isFinite(user_id) &&
      user_id > 0
    );
  }, [business_id, user_id]);

  const refresh = useCallback(async () => {
    if (!canLoad) {
      setErr("Merchant session not found. Please login again.");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      const [o, s] = await Promise.all([
        listBusinessNotifications({
          business_id,
          token,
          unreadOnly: activeTab === TAB_ORDERS ? unreadOnly : false, // ✅ only apply on Orders
          limit: 200,
          offset: 0,
        }),
        listSystemNotifications({ user_id, token }),
      ]);

      setOrders(Array.isArray(o) ? o : []);
      setSystem(Array.isArray(s) ? s : []);
    } catch (e) {
      setErr(e?.message || "Failed to load notifications.");
    } finally {
      setBusy(false);
    }
  }, [business_id, user_id, token, unreadOnly, canLoad, activeTab]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ✅ when switching to System, disable unreadOnly toggle
  useEffect(() => {
    if (activeTab === TAB_SYSTEM) setUnreadOnly(false);
  }, [activeTab]);

  const openDrawer = useCallback((item) => {
    setDrawerItem(item);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerItem(null);
  }, []);

  const openReply = useCallback((item) => {
    setReplyItem(item);
    setReplyOpen(true);
  }, []);

  const closeReply = useCallback(() => {
    setReplyOpen(false);
    setReplyItem(null);
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
      } catch (e) {
        setErr(e?.message || "Failed to mark as read.");
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  const markAllRead = useCallback(async () => {
    if (!business_id) return;

    setBusy(true);
    setErr("");
    try {
      await markAllNotificationsRead({ businessId: business_id, token });
      setOrders((prev) => prev.map((x) => ({ ...x, is_read: 1 })));
    } catch (e) {
      setErr(e?.message || "Failed to mark all as read.");
    } finally {
      setBusy(false);
    }
  }, [business_id, token]);

  const removeOne = useCallback(
    async (item) => {
      const id = item?.notification_id;
      if (!id) return;

      const ok = window.confirm("Delete this notification?");
      if (!ok) return;

      setBusy(true);
      setErr("");
      try {
        await deleteNotification({ notificationId: id, token });
        setOrders((prev) => prev.filter((x) => x?.notification_id !== id));
      } catch (e) {
        setErr(e?.message || "Failed to delete notification.");
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  const submitReply = useCallback(
    async (text) => {
      const item = replyItem;
      if (!item) return;

      const notification_id = item?.notification_id || item?.id;
      if (!notification_id) {
        setErr("Notification id not found for reply.");
        return;
      }

      setBusy(true);
      setErr("");
      try {
        await sendFeedbackReply({
          notification_id,
          user_id,
          token,
          reply: text,
        });

        closeReply();

        // Optional: mark order notification read after reply
        if (item?.notification_id) {
          await markNotificationRead({
            notificationId: item.notification_id,
            token,
          });
          setOrders((prev) =>
            prev.map((x) =>
              x?.notification_id === item.notification_id
                ? { ...x, is_read: 1 }
                : x,
            ),
          );
        }

        alert("Reply sent successfully.");
      } catch (e) {
        setErr(e?.message || "Failed to send reply.");
      } finally {
        setBusy(false);
      }
    },
    [replyItem, user_id, token, closeReply],
  );

  const list = useMemo(() => {
    return activeTab === TAB_SYSTEM ? system : orders;
  }, [activeTab, system, orders]);

  const emptyText = useMemo(() => {
    if (!canLoad) return "Merchant session missing. Please login again.";
    if (activeTab === TAB_SYSTEM) return "No system notifications.";
    return unreadOnly ? "No unread notifications." : "No notifications.";
  }, [activeTab, unreadOnly, canLoad]);

  const showUnreadToggle = activeTab === TAB_ORDERS;
  const showMarkAllRead = activeTab === TAB_ORDERS;

  return (
    <div className="ntPage">
      <div className="ntContainer">
        <div className="ntSticky">
          <Toolbar
            title="Notifications"
            unreadOnly={showUnreadToggle ? unreadOnly : false}
            onToggleUnread={(v) => setUnreadOnly(!!v)}
            onRefresh={refresh}
            onMarkAllRead={markAllRead}
            busy={busy}
            showMarkAllRead={showMarkAllRead}
          />

          <TopTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

          {err ? <div className="ntError">{err}</div> : null}
        </div>

        <div className="ntScroll">
          {list.length === 0 ? (
            <div className="ntEmpty">{emptyText}</div>
          ) : (
            <div className="ntList">
              {list.map((item, idx) => {
                const kind = activeTab === TAB_SYSTEM ? "system" : "orders";
                const showReply =
                  kind === "orders" && isFeedbackNotification(item);

                return (
                  <NotificationCard
                    key={item?.notification_id || item?.id || idx}
                    item={item}
                    kind={kind}
                    busy={busy}
                    onOpen={() => openDrawer(item)}
                    onMarkRead={markRead}
                    onDelete={removeOne}
                    onReply={() => openReply(item)}
                    showReply={showReply}
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
        onClose={() => {
          setDrawerOpen(false);
          setDrawerItem(null);
        }}
      />

      <ReplyModal
        open={replyOpen}
        item={replyItem}
        busy={busy}
        onClose={() => {
          setReplyOpen(false);
          setReplyItem(null);
        }}
        onSubmit={submitReply}
      />
    </div>
  );
}
