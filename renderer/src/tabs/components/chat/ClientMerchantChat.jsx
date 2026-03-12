// src/components/chat/ClientMerchantChat.jsx
import React from "react";
import { io } from "socket.io-client";

const CHAT_SOCKET_ORIGIN = import.meta.env.VITE_CHAT_SOCKET_ORIGIN;
const CHAT_SOCKET_PATH = import.meta.env.VITE_CHAT_SOCKET_PATH;

const MERCHANT_CHAT_CONVERSATIONS_URL = import.meta.env
  .VITE_MERCHANT_CHAT_CONVERSATIONS_URL;
const CHAT_CREATE_CONVERSATION_URL = import.meta.env
  .VITE_CHAT_CREATE_CONVERSATION_URL;
const CHAT_MESSAGES_URL = import.meta.env.VITE_CHAT_MESSAGES_URL;
const CHAT_SEND_MESSAGE_URL = import.meta.env.VITE_CHAT_SEND_MESSAGE_URL;
const CHAT_MARK_READ_URL = import.meta.env.VITE_CHAT_MARK_READ_URL;

const USER_MERCHANT_CHAT_ORIGIN = import.meta.env
  .VITE_USER_MERCHANT_CHAT_ORIGIN;
const PROFILE_IMAGE_PREFIX = import.meta.env.VITE_PROFILE_IMAGE_PREFIX;

function buildUrl(template, value, tokenName) {
  if (!template) return "";
  return String(template).replace(
    `:${tokenName}`,
    encodeURIComponent(String(value)),
  );
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function extractSession(session) {
  const payload = session?.payload || session || {};
  const user = payload?.user || payload?.data?.user || null;

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

  const merchantName =
    user?.user_name || user?.name || user?.merchant_name || "Merchant";

  return {
    payload,
    user,
    userId: safeNum(userId),
    businessId: safeNum(businessId),
    token,
    merchantName,
  };
}

function authHeaders({ userId, businessId, token }, extra = {}) {
  return {
    ...extra,
    "x-user-type": "MERCHANT",
    "x-user-id": String(userId || ""),
    "x-business-id": String(businessId || ""),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function extractMessage(payload, fallback = "Something went wrong") {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  return payload.message || payload.error || payload.msg || fallback;
}

function formatTime(ts) {
  const n = Number(ts || 0);
  if (!n) return "";
  try {
    return new Date(n).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function joinUrl(prefix, path) {
  if (!path) return "";
  const p = String(path).trim();
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;

  const base = String(prefix || "").trim();
  if (!base) return p;

  const baseNoSlash = base.endsWith("/") ? base.slice(0, -1) : base;
  const pathWithSlash = p.startsWith("/") ? p : `/${p}`;
  return `${baseNoSlash}${pathWithSlash}`;
}

function normalizeChatImageUrl(url) {
  if (!url) return "";
  const s = String(url).trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const base = String(USER_MERCHANT_CHAT_ORIGIN || "").replace(/\/+$/, "");
  return base ? `${base}${s.startsWith("/") ? s : `/${s}`}` : s;
}

function normalizeProfileImageUrl(url) {
  if (!url) return "";
  return joinUrl(PROFILE_IMAGE_PREFIX, url);
}

function normalizeConversationRow(row) {
  const lastAt = Number(row?.last_message_at || 0);
  return {
    conversation_id: String(row?.conversation_id || ""),
    order_id: row?.order_id || "",
    customer_id: row?.customer_id ?? null,
    business_id: row?.business_id ?? null,
    customer_name: row?.customer_name || "Customer",
    customer_profile_image: row?.customer_profile_image || "",
    customer_profile_image_url: normalizeProfileImageUrl(
      row?.customer_profile_image || "",
    ),
    merchant_business_name: row?.merchant_business_name || "",
    merchant_business_logo: row?.merchant_business_logo || "",
    merchant_business_logo_url: normalizeProfileImageUrl(
      row?.merchant_business_logo || "",
    ),
    last_message_at: lastAt,
    last_message_type: row?.last_message_type || "",
    last_message_body: row?.last_message_body || "",
    last_message_media_url: row?.last_message_media_url || "",
    unread_count: Number(row?.unread_count || 0),
  };
}

function normalizeMessageRow(row) {
  return {
    id: String(row?.id || `${Date.now()}-${Math.random()}`),
    sender_type: row?.sender_type || "",
    sender_id: Number(row?.sender_id || 0),
    message_type: row?.message_type || "TEXT",
    body: row?.body || "",
    media_url: normalizeChatImageUrl(row?.media_url || ""),
    ts: Number(row?.ts || Date.now()),
  };
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m20 20-3.5-3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 11a8 8 0 1 1-2.34-5.66"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 4v5h-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21.44 11.05 12 20.5a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.2a2 2 0 1 1-2.82-2.83l8.49-8.48"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M22 2 11 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="m22 2-7 20-4-9-9-4 20-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Avatar({ name, imageUrl, large = false }) {
  const [broken, setBroken] = React.useState(false);
  const initial =
    String(name || "U")
      .trim()
      .charAt(0)
      .toUpperCase() || "U";

  if (imageUrl && !broken) {
    return (
      <div className={`globalChatAvatar ${large ? "lg" : ""} hasImage`}>
        <img
          src={imageUrl}
          alt={name || "User"}
          className="globalChatAvatarImg"
          onError={() => setBroken(true)}
        />
      </div>
    );
  }

  return (
    <div className={`globalChatAvatar ${large ? "lg" : ""}`}>{initial}</div>
  );
}

export default function ClientMerchantChat({ session }) {
  const auth = React.useMemo(() => extractSession(session), [session]);

  const [clientConversations, setClientConversations] = React.useState([]);
  const [conversationsLoading, setConversationsLoading] = React.useState(false);
  const [conversationsError, setConversationsError] = React.useState("");

  const [selectedConversationId, setSelectedConversationId] =
    React.useState("");
  const [messages, setMessages] = React.useState([]);
  const [messagesMeta, setMessagesMeta] = React.useState(null);
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [messagesError, setMessagesError] = React.useState("");

  const [orderIdInput, setOrderIdInput] = React.useState("");
  const [creatingConversation, setCreatingConversation] = React.useState(false);

  const [messageText, setMessageText] = React.useState("");
  const [selectedImageFile, setSelectedImageFile] = React.useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const [search, setSearch] = React.useState("");

  const socketRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const messagesEndRef = React.useRef(null);

  const filteredConversations = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientConversations;
    return clientConversations.filter((item) => {
      return (
        String(item.customer_name || "")
          .toLowerCase()
          .includes(q) ||
        String(item.order_id || "")
          .toLowerCase()
          .includes(q) ||
        String(item.last_message_body || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [clientConversations, search]);

  const selectedConversation = React.useMemo(() => {
    return (
      clientConversations.find(
        (item) =>
          String(item.conversation_id) === String(selectedConversationId),
      ) || null
    );
  }, [clientConversations, selectedConversationId]);

  const scrollMessagesToBottom = React.useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView?.({
        behavior: "smooth",
        block: "end",
      });
    });
  }, []);

  const refreshConversations = React.useCallback(async () => {
    if (!MERCHANT_CHAT_CONVERSATIONS_URL) {
      setConversationsError(
        "Missing env: VITE_MERCHANT_CHAT_CONVERSATIONS_URL",
      );
      return;
    }
    if (!auth.userId || !auth.businessId) {
      setConversationsError(
        "Missing merchant user_id or business_id in session.",
      );
      return;
    }

    setConversationsLoading(true);
    setConversationsError("");

    try {
      const res = await fetch(MERCHANT_CHAT_CONVERSATIONS_URL, {
        method: "GET",
        headers: authHeaders(auth),
      });

      const out = await safeJson(res);

      if (!res.ok) {
        throw new Error(
          extractMessage(out, `Failed to load conversations (${res.status})`),
        );
      }

      const rows = Array.isArray(out?.rows)
        ? out.rows.map(normalizeConversationRow)
        : [];

      rows.sort((a, b) => b.last_message_at - a.last_message_at);

      setClientConversations(rows);

      if (!selectedConversationId && rows.length) {
        setSelectedConversationId(String(rows[0].conversation_id));
      } else if (
        selectedConversationId &&
        !rows.some(
          (r) => String(r.conversation_id) === String(selectedConversationId),
        )
      ) {
        setSelectedConversationId(rows[0]?.conversation_id || "");
      }
    } catch (e) {
      setConversationsError(e?.message || "Failed to load conversations.");
    } finally {
      setConversationsLoading(false);
    }
  }, [auth, selectedConversationId]);

  const markConversationRead = React.useCallback(
    async (conversationId, lastReadMessageId = "") => {
      if (!conversationId || !CHAT_MARK_READ_URL) return;
      try {
        const url = buildUrl(
          CHAT_MARK_READ_URL,
          conversationId,
          "conversationId",
        );

        await fetch(url, {
          method: "POST",
          headers: authHeaders(auth, {
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ lastReadMessageId }),
        });

        setClientConversations((prev) =>
          prev.map((item) =>
            String(item.conversation_id) === String(conversationId)
              ? { ...item, unread_count: 0 }
              : item,
          ),
        );
      } catch {
        // ignore
      }
    },
    [auth],
  );

  const loadMessages = React.useCallback(
    async (conversationId) => {
      if (!conversationId) {
        setMessages([]);
        setMessagesMeta(null);
        return;
      }
      if (!CHAT_MESSAGES_URL) {
        setMessagesError("Missing env: VITE_CHAT_MESSAGES_URL");
        return;
      }
      if (!auth.userId || !auth.businessId) {
        setMessagesError("Missing merchant user_id or business_id in session.");
        return;
      }

      setMessagesLoading(true);
      setMessagesError("");

      try {
        const url = buildUrl(
          CHAT_MESSAGES_URL,
          conversationId,
          "conversationId",
        );

        const res = await fetch(url, {
          method: "GET",
          headers: authHeaders(auth),
        });

        const out = await safeJson(res);

        if (!res.ok) {
          throw new Error(
            extractMessage(out, `Failed to load messages (${res.status})`),
          );
        }

        const rows = Array.isArray(out?.rows)
          ? out.rows.map(normalizeMessageRow).sort((a, b) => a.ts - b.ts)
          : [];

        setMessages(rows);
        setMessagesMeta(out?.meta || null);

        await markConversationRead(
          conversationId,
          rows[rows.length - 1]?.id || "",
        );
        setTimeout(scrollMessagesToBottom, 80);
      } catch (e) {
        setMessagesError(e?.message || "Failed to load messages.");
      } finally {
        setMessagesLoading(false);
      }
    },
    [auth, markConversationRead, scrollMessagesToBottom],
  );

  const createConversationFromOrder = React.useCallback(async () => {
    const orderId = String(orderIdInput || "").trim();
    if (!orderId) return;

    if (!CHAT_CREATE_CONVERSATION_URL) {
      setConversationsError("Missing env: VITE_CHAT_CREATE_CONVERSATION_URL");
      return;
    }

    setCreatingConversation(true);
    setConversationsError("");

    try {
      const url = buildUrl(CHAT_CREATE_CONVERSATION_URL, orderId, "orderId");

      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(auth, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          business_id: auth.businessId,
        }),
      });

      const out = await safeJson(res);

      if (!res.ok) {
        throw new Error(
          extractMessage(out, `Failed to create conversation (${res.status})`),
        );
      }

      const cid = String(out?.conversation_id || "");
      if (!cid) throw new Error("conversation_id not returned from server.");

      setOrderIdInput("");
      await refreshConversations();
      setSelectedConversationId(cid);
      await loadMessages(cid);
    } catch (e) {
      setConversationsError(e?.message || "Failed to create/get conversation.");
    } finally {
      setCreatingConversation(false);
    }
  }, [auth, orderIdInput, refreshConversations, loadMessages]);

  const handleImagePickClick = React.useCallback(() => {
    fileInputRef.current?.click?.();
  }, []);

  const handleImageSelected = React.useCallback((e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setSelectedImageFile(file);

    try {
      const preview = URL.createObjectURL(file);
      setSelectedImagePreview(preview);
    } catch {
      setSelectedImagePreview("");
    }

    e.target.value = "";
  }, []);

  React.useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        try {
          URL.revokeObjectURL(selectedImagePreview);
        } catch {
          console.warn(
            "Failed to revoke object URL on cleanup:",
            selectedImagePreview,
          );
        }
      }
    };
  }, [selectedImagePreview]);

  const clearSelectedImage = React.useCallback(() => {
    if (selectedImagePreview) {
      try {
        URL.revokeObjectURL(selectedImagePreview);
      } catch {
        console.warn(
          "Failed to revoke object URL on clear:",
          selectedImagePreview,
        );
      }
    }
    setSelectedImagePreview("");
    setSelectedImageFile(null);
  }, [selectedImagePreview]);

  const sendMessage = React.useCallback(async () => {
    const conversationId = String(selectedConversationId || "");
    const body = String(messageText || "").trim();
    const hasImage = !!selectedImageFile;

    if (!conversationId) return;
    if (!body && !hasImage) return;
    if (!CHAT_SEND_MESSAGE_URL) {
      setMessagesError("Missing env: VITE_CHAT_SEND_MESSAGE_URL");
      return;
    }

    setSending(true);
    setMessagesError("");

    try {
      const url = buildUrl(
        CHAT_SEND_MESSAGE_URL,
        conversationId,
        "conversationId",
      );

      let res;
      if (hasImage) {
        const fd = new FormData();
        if (body) fd.append("body", body);
        fd.append("chat_image", selectedImageFile);

        res = await fetch(url, {
          method: "POST",
          headers: authHeaders(auth),
          body: fd,
        });
      } else {
        res = await fetch(url, {
          method: "POST",
          headers: authHeaders(auth, {
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ body }),
        });
      }

      const out = await safeJson(res);

      if (!res.ok) {
        throw new Error(
          extractMessage(out, `Failed to send message (${res.status})`),
        );
      }

      const sent = normalizeMessageRow(out?.message || {});
      setMessages((prev) => {
        const exists = prev.some((m) => String(m.id) === String(sent.id));
        return exists ? prev : [...prev, sent];
      });

      setClientConversations((prev) =>
        prev
          .map((item) =>
            String(item.conversation_id) === String(conversationId)
              ? {
                  ...item,
                  last_message_at: sent.ts,
                  last_message_type: sent.message_type,
                  last_message_body:
                    sent.message_type === "TEXT"
                      ? sent.body || ""
                      : sent.body || "[image]",
                  last_message_media_url: sent.media_url || "",
                }
              : item,
          )
          .sort((a, b) => b.last_message_at - a.last_message_at),
      );

      setMessageText("");
      clearSelectedImage();
      setTimeout(scrollMessagesToBottom, 60);
      await markConversationRead(conversationId, sent.id);
      await refreshConversations();
    } catch (e) {
      setMessagesError(e?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }, [
    auth,
    selectedConversationId,
    messageText,
    selectedImageFile,
    clearSelectedImage,
    scrollMessagesToBottom,
    markConversationRead,
    refreshConversations,
  ]);

  React.useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  React.useEffect(() => {
    if (!selectedConversationId) return;
    loadMessages(selectedConversationId);
  }, [selectedConversationId, loadMessages]);

  React.useEffect(() => {
    if (!CHAT_SOCKET_ORIGIN || !CHAT_SOCKET_PATH) return;
    if (!auth.userId || !auth.businessId) return;

    const socket = io(CHAT_SOCKET_ORIGIN, {
      path: CHAT_SOCKET_PATH,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
    console.log("[client chat] socket config", {
      origin: CHAT_SOCKET_ORIGIN,
      path: CHAT_SOCKET_PATH,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[client chat] socket connected", socket.id);
      if (selectedConversationId) {
        socket.emit("chat:join", {
          conversationId: String(selectedConversationId),
        });
      }
    });

    socket.on("connect_error", (err) => {
      console.log("[client chat] connect_error", {
        message: err?.message,
        description: err?.description,
        context: err?.context,
        type: err?.type,
      });
    });

    socket.on("chat:new_message", async ({ conversationId, message }) => {
      const cid = String(conversationId || "");
      const incoming = normalizeMessageRow(message || {});
      if (!cid || !incoming?.id) return;

      setClientConversations((prev) => {
        const exists = prev.some((x) => String(x.conversation_id) === cid);
        let next = exists
          ? prev.map((item) =>
              String(item.conversation_id) === cid
                ? {
                    ...item,
                    last_message_at: incoming.ts,
                    last_message_type: incoming.message_type,
                    last_message_body:
                      incoming.message_type === "TEXT"
                        ? incoming.body || ""
                        : incoming.body || "[image]",
                    last_message_media_url: incoming.media_url || "",
                    unread_count:
                      String(selectedConversationId) === cid
                        ? 0
                        : Number(item.unread_count || 0) + 1,
                  }
                : item,
            )
          : prev;

        next = [...next].sort((a, b) => b.last_message_at - a.last_message_at);
        return next;
      });

      if (String(selectedConversationId) === cid) {
        setMessages((prev) => {
          const exists = prev.some((m) => String(m.id) === String(incoming.id));
          return exists ? prev : [...prev, incoming];
        });

        setTimeout(scrollMessagesToBottom, 50);
        await markConversationRead(cid, incoming.id);
      } else {
        await refreshConversations();
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[client chat] socket disconnected", reason);
    });

    return () => {
      try {
        socket.disconnect();
      } catch {
        console.warn("[client chat] Failed to disconnect socket cleanly.");
      }
      socketRef.current = null;
    };
  }, [
    auth,
    selectedConversationId,
    scrollMessagesToBottom,
    markConversationRead,
    refreshConversations,
  ]);

  React.useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (selectedConversationId) {
      socket.emit("chat:join", {
        conversationId: String(selectedConversationId),
      });
    }

    return () => {
      if (selectedConversationId) {
        try {
          socket.emit("chat:leave", {
            conversationId: String(selectedConversationId),
          });
        } catch {
          console.warn(
            "[client chat] Failed to emit chat:leave for conversation",
            selectedConversationId,
          );
        }
      }
    };
  }, [selectedConversationId]);

  const selectedConversationName =
    messagesMeta?.customerName ||
    selectedConversation?.customer_name ||
    "Customer";

  const selectedConversationProfile =
    selectedConversation?.customer_profile_image_url || "";

  return (
    <>
      <div className="globalChatCreateRow">
        <input
          type="text"
          className="globalChatOrderInput"
          placeholder="Enter order ID to create/get chat"
          value={orderIdInput}
          onChange={(e) => setOrderIdInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") createConversationFromOrder();
          }}
        />
        <button
          type="button"
          className="globalChatPrimaryBtn"
          onClick={createConversationFromOrder}
          disabled={creatingConversation || !String(orderIdInput).trim()}
        >
          {creatingConversation ? "Opening..." : "Open Chat"}
        </button>
        <button
          type="button"
          className="globalChatGhostBtn"
          onClick={refreshConversations}
          title="Refresh conversations"
        >
          <RefreshIcon />
        </button>
      </div>

      <div className="globalChatSearch">
        <span className="globalChatSearchIcon">
          <SearchIcon />
        </span>
        <input
          type="text"
          className="globalChatSearchInput"
          placeholder="Search by customer, order ID, or last message"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="globalChatBody">
        <div className="globalChatList">
          {conversationsLoading ? (
            <div className="globalChatEmpty">Loading conversations...</div>
          ) : conversationsError ? (
            <div className="globalChatErrorBox">{conversationsError}</div>
          ) : filteredConversations.length ? (
            filteredConversations.map((item) => {
              const isActive =
                String(item.conversation_id) === String(selectedConversationId);

              return (
                <button
                  key={item.conversation_id}
                  type="button"
                  className={`globalChatListItem ${isActive ? "active" : ""}`}
                  onClick={() =>
                    setSelectedConversationId(item.conversation_id)
                  }
                >
                  <Avatar
                    name={item.customer_name}
                    imageUrl={item.customer_profile_image_url}
                  />

                  <div className="globalChatMeta">
                    <div className="globalChatMetaTop">
                      <span className="globalChatName">
                        {item.customer_name || "Customer"}
                      </span>
                      <span className="globalChatTime">
                        {formatTime(item.last_message_at)}
                      </span>
                    </div>

                    <div className="globalChatOrderPill">
                      Order #{item.order_id || "-"}
                    </div>

                    <div className="globalChatMetaBottom">
                      <span className="globalChatLastMessage">
                        {item.last_message_body ||
                          (item.last_message_type === "IMAGE"
                            ? "[image]"
                            : "No messages yet")}
                      </span>

                      {item.unread_count > 0 ? (
                        <span className="globalChatUnread">
                          {item.unread_count}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="globalChatEmpty">No client chats found.</div>
          )}
        </div>

        <div className="globalChatPreview">
          {selectedConversationId ? (
            <>
              <div className="globalChatPreviewTop">
                <div className="globalChatPreviewProfile">
                  <Avatar
                    name={selectedConversationName}
                    imageUrl={selectedConversationProfile}
                    large
                  />

                  <div>
                    <div className="globalChatPreviewName">
                      {selectedConversationName}
                    </div>
                    <div className="globalChatPreviewRole">
                      Order #{selectedConversation?.order_id || "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="globalChatMessages">
                {messagesLoading ? (
                  <div className="globalChatEmpty">Loading messages...</div>
                ) : messagesError ? (
                  <div className="globalChatErrorBox">{messagesError}</div>
                ) : messages.length ? (
                  messages.map((msg) => {
                    const isMe =
                      String(msg.sender_type).toUpperCase() === "MERCHANT" &&
                      Number(msg.sender_id) === Number(auth.userId);

                    return (
                      <div
                        key={msg.id}
                        className={`msgRow ${isMe ? "me" : "other"}`}
                      >
                        <div className="msgBubble">
                          {msg.body ? (
                            <div className="msgText">{msg.body}</div>
                          ) : null}

                          {msg.media_url ? (
                            <a
                              href={msg.media_url}
                              target="_blank"
                              rel="noreferrer"
                              className="msgImageLink"
                            >
                              <img
                                src={msg.media_url}
                                alt="chat attachment"
                                className="msgImage"
                              />
                            </a>
                          ) : null}

                          <div className="msgTime">{formatTime(msg.ts)}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="globalChatEmpty">No messages yet.</div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {selectedImagePreview ? (
                <div className="globalChatImagePreviewBar">
                  <div className="globalChatImagePreviewCard">
                    <img
                      src={selectedImagePreview}
                      alt="Selected preview"
                      className="globalChatImagePreview"
                    />
                    <button
                      type="button"
                      className="globalChatImageRemove"
                      onClick={clearSelectedImage}
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="globalChatComposer">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleImageSelected}
                />

                <button
                  type="button"
                  className="globalChatAttachBtn"
                  onClick={handleImagePickClick}
                  title="Attach image"
                >
                  <ClipIcon />
                </button>

                <input
                  type="text"
                  className="globalChatComposerInput"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />

                <button
                  type="button"
                  className="globalChatSend"
                  onClick={sendMessage}
                  disabled={
                    sending ||
                    (!String(messageText).trim() && !selectedImageFile)
                  }
                  title="Send"
                >
                  {sending ? "..." : <SendIcon />}
                </button>
              </div>
            </>
          ) : (
            <div className="globalChatPreviewEmpty">
              Select a conversation or enter an order ID to open a new chat.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
