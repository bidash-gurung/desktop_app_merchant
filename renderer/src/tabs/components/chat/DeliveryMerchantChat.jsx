// src/components/chat/DeliveryMerchantChat.jsx
import React from "react";
import { io } from "socket.io-client";

const DELIVERY_MERCHANT_CHAT_LIST_URL = import.meta.env
  .VITE_DELIVERY_MERCHANT_CHAT_LIST_URL;
const DELIVERY_CHAT_UPLOAD_URL = import.meta.env.VITE_DELIVERY_CHAT_UPLOAD_URL;
const DELIVERY_CHAT_SOCKET_ORIGIN = import.meta.env
  .VITE_DELIVERY_CHAT_SOCKET_ORIGIN;
const DELIVERY_CHAT_SOCKET_PATH = import.meta.env
  .VITE_DELIVERY_CHAT_SOCKET_PATH;
const DELIVERY_DRIVER_DETAILS_URL = import.meta.env
  .VITE_DELIVERY_DRIVER_DETAILS_URL;
const PROFILE_IMAGE_PREFIX = import.meta.env.VITE_PROFILE_IMAGE_PREFIX;

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function extractSession(session) {
  const payload = session?.payload || session || {};
  const user = payload?.user || payload?.data?.user || null;

  const merchantId =
    user?.business_id ??
    payload?.business_id ??
    payload?.data?.business_id ??
    user?.businessId ??
    null;

  const merchantUserId = user?.user_id ?? user?.id ?? null;

  return {
    payload,
    user,
    merchantId: safeNum(merchantId),
    merchantUserId: safeNum(merchantUserId),
  };
}

function buildUrl(template, value, tokenName) {
  if (!template) return "";
  return String(template).replace(
    `:${tokenName}`,
    encodeURIComponent(String(value)),
  );
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

function formatTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
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
  return (
    payload.message ||
    payload.error ||
    payload.msg ||
    payload.details ||
    fallback
  );
}

function Avatar({ name, imageUrl, large = false }) {
  const [broken, setBroken] = React.useState(false);
  const initial =
    String(name || "D")
      .trim()
      .charAt(0)
      .toUpperCase() || "D";

  if (imageUrl && !broken) {
    return (
      <div className={`globalChatAvatar ${large ? "lg" : ""} hasImage`}>
        <img
          src={imageUrl}
          alt={name || "Driver"}
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

function normalizeThread(row) {
  const last = row?.last_message || {};
  return {
    ride_id: Number(row?.ride_id || 0),
    request_id: Number(row?.request_id || row?.ride_id || 0),
    started_at: row?.started_at || "",
    last_message_at: row?.last_message_at || last?.created_at || "",
    total_messages: Number(row?.total_messages || 0),
    unread: Number(row?.unread || 0),
    peer: row?.peer || null,
    last_message: {
      id: Number(last?.id || 0),
      request_id: Number(last?.request_id || row?.ride_id || 0),
      sender_type: last?.sender_type || "",
      sender_id: safeNum(last?.sender_id),
      message: last?.message || "",
      attachments: last?.attachments ?? null,
      created_at: last?.created_at || "",
    },
  };
}

function normalizeHistoryMessage(msg) {
  return {
    id: Number(msg?.id || 0),
    request_id: Number(msg?.request_id || 0),
    sender_type: msg?.sender_type || "",
    sender_id: safeNum(msg?.sender_id),
    message: msg?.message || "",
    attachments: msg?.attachments ?? null,
    created_at: msg?.created_at || "",
  };
}

function attachmentToUrl(att) {
  if (!att) return "";
  if (typeof att === "string") return att;
  if (Array.isArray(att)) return attachmentToUrl(att[0]);
  if (typeof att === "object") {
    return att.url || att.uri || att.path || "";
  }
  return "";
}

export default function DeliveryMerchantChat({ session }) {
  const auth = React.useMemo(() => extractSession(session), [session]);

  const [threads, setThreads] = React.useState([]);
  const [loadingThreads, setLoadingThreads] = React.useState(false);
  const [threadError, setThreadError] = React.useState("");

  const [selectedRideId, setSelectedRideId] = React.useState("");
  const [messages, setMessages] = React.useState([]);
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [messagesError, setMessagesError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [messageText, setMessageText] = React.useState("");
  const [selectedImageFile, setSelectedImageFile] = React.useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const [driverDetailsMap, setDriverDetailsMap] = React.useState({});

  const socketRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const messagesEndRef = React.useRef(null);

  const scrollMessagesToBottom = React.useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView?.({
        behavior: "smooth",
        block: "end",
      });
    });
  }, []);

  const fetchDriverDetails = React.useCallback(async (driverId) => {
    const did = Number(driverId || 0);
    if (!did || !DELIVERY_DRIVER_DETAILS_URL) return null;

    try {
      const url = buildUrl(DELIVERY_DRIVER_DETAILS_URL, did, "driverId");
      const res = await fetch(url);
      const out = await safeJson(res);

      if (!res.ok || !out?.ok) return null;

      const details = out?.details || {};
      return {
        driver_id: did,
        user_id: safeNum(details?.user_id),
        user_name: String(details?.user_name || "").trim() || `Driver #${did}`,
        profile_image: String(details?.profile_image || "").trim(),
        profile_image_url: details?.profile_image
          ? joinUrl(PROFILE_IMAGE_PREFIX, details.profile_image)
          : "",
      };
    } catch {
      return null;
    }
  }, []);

  const hydrateDriverDetails = React.useCallback(
    async (rows) => {
      const ids = [
        ...new Set(
          rows
            .map((item) => Number(item?.peer?.id || 0))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      ];

      const missing = ids.filter((id) => !driverDetailsMap[id]);
      if (!missing.length) return;

      const results = await Promise.all(
        missing.map((id) => fetchDriverDetails(id)),
      );

      setDriverDetailsMap((prev) => {
        const next = { ...prev };
        for (const item of results) {
          if (item?.driver_id) next[item.driver_id] = item;
        }
        return next;
      });
    },
    [driverDetailsMap, fetchDriverDetails],
  );

  const filteredThreads = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;

    return threads.filter((item) => {
      const driverId = Number(item?.peer?.id || 0);
      const driverInfo = driverDetailsMap[driverId];
      const driverName = String(driverInfo?.user_name || "").toLowerCase();
      const rideId = item?.ride_id ? String(item.ride_id) : "";
      const lastMsg = item?.last_message?.message || "";

      return (
        driverName.includes(q) ||
        rideId.toLowerCase().includes(q) ||
        lastMsg.toLowerCase().includes(q) ||
        String(driverId).includes(q)
      );
    });
  }, [threads, search, driverDetailsMap]);

  const selectedThread = React.useMemo(() => {
    return (
      threads.find((t) => String(t.ride_id) === String(selectedRideId)) || null
    );
  }, [threads, selectedRideId]);

  const selectedDriverId = Number(selectedThread?.peer?.id || 0);
  const selectedDriverInfo = driverDetailsMap[selectedDriverId] || null;
  const selectedDriverName =
    selectedDriverInfo?.user_name ||
    (selectedDriverId ? `Driver #${selectedDriverId}` : "Driver");
  const selectedDriverProfile = selectedDriverInfo?.profile_image_url || "";

  const refreshThreads = React.useCallback(async () => {
    if (!DELIVERY_MERCHANT_CHAT_LIST_URL) {
      setThreadError("Missing env: VITE_DELIVERY_MERCHANT_CHAT_LIST_URL");
      return;
    }
    if (!auth.merchantId) {
      setThreadError("Missing merchant business_id in session.");
      return;
    }

    setLoadingThreads(true);
    setThreadError("");

    try {
      const url = `${DELIVERY_MERCHANT_CHAT_LIST_URL}?merchant_id=${encodeURIComponent(
        auth.merchantId,
      )}&limit=50`;

      const res = await fetch(url);
      const out = await safeJson(res);

      if (!res.ok || !out?.ok) {
        throw new Error(
          extractMessage(out, `Failed to load delivery chats (${res.status})`),
        );
      }

      const next = Array.isArray(out?.threads)
        ? out.threads.map(normalizeThread)
        : [];

      setThreads(next);

      if (!selectedRideId && next.length) {
        setSelectedRideId(String(next[0].ride_id));
      } else if (
        selectedRideId &&
        !next.some((x) => String(x.ride_id) === String(selectedRideId))
      ) {
        setSelectedRideId(next[0]?.ride_id ? String(next[0].ride_id) : "");
      }

      hydrateDriverDetails(next);
    } catch (e) {
      setThreadError(e?.message || "Failed to load delivery chats.");
    } finally {
      setLoadingThreads(false);
    }
  }, [auth.merchantId, selectedRideId, hydrateDriverDetails]);

  const loadHistory = React.useCallback(
    async (rideId) => {
      const socket = socketRef.current;
      if (!socket || !rideId) {
        setMessages([]);
        return;
      }

      setMessagesLoading(true);
      setMessagesError("");

      socket.emit(
        "chat:history",
        {
          request_id: Number(rideId),
          limit: 50,
        },
        (ack) => {
          if (!ack?.ok) {
            setMessagesError(ack?.error || "Failed to load delivery messages.");
            setMessagesLoading(false);
            return;
          }

          const rows = Array.isArray(ack?.messages)
            ? ack.messages.map(normalizeHistoryMessage)
            : [];

          setMessages(rows);
          setMessagesLoading(false);

          const lastId = rows[rows.length - 1]?.id || 0;
          if (lastId) {
            socket.emit("chat:read", {
              request_id: Number(rideId),
              last_seen_id: lastId,
            });
          }

          setTimeout(scrollMessagesToBottom, 80);
        },
      );
    },
    [scrollMessagesToBottom],
  );

  React.useEffect(() => {
    if (!DELIVERY_CHAT_SOCKET_ORIGIN || !DELIVERY_CHAT_SOCKET_PATH) return;
    if (!auth.merchantId) return;

    const socket = io(DELIVERY_CHAT_SOCKET_ORIGIN, {
      path: DELIVERY_CHAT_SOCKET_PATH,
      transports: ["polling", "websocket"],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      auth: {
        role: "merchant",
        merchant_id: String(auth.merchantId),
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[delivery chat] socket connected", socket.id);
      if (selectedRideId) {
        socket.emit("chat:join", { request_id: Number(selectedRideId) });
      }
    });

    socket.on("connect_error", (err) => {
      console.log("[delivery chat] connect_error", {
        message: err?.message,
        description: err?.description,
        context: err?.context,
        type: err?.type,
      });
    });

    socket.on("chat:new", async ({ message }) => {
      const incoming = normalizeHistoryMessage(message || {});
      if (!incoming?.request_id) return;

      setThreads((prev) => {
        const rid = String(incoming.request_id);
        const next = prev.map((item) =>
          String(item.ride_id) === rid
            ? {
                ...item,
                last_message_at: incoming.created_at,
                last_message: incoming,
                unread:
                  String(selectedRideId) === rid
                    ? 0
                    : Number(item.unread || 0) + 1,
              }
            : item,
        );

        next.sort((a, b) => {
          return (
            new Date(b.last_message_at || 0).getTime() -
            new Date(a.last_message_at || 0).getTime()
          );
        });

        return next;
      });

      if (String(selectedRideId) === String(incoming.request_id)) {
        setMessages((prev) => {
          const exists = prev.some((m) => Number(m.id) === Number(incoming.id));
          return exists ? prev : [...prev, incoming];
        });

        setTimeout(scrollMessagesToBottom, 50);

        socket.emit("chat:read", {
          request_id: Number(incoming.request_id),
          last_seen_id: Number(incoming.id),
        });
      } else {
        await refreshThreads();
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[delivery chat] socket disconnected", reason);
    });

    return () => {
      try {
        socket.disconnect();
      } catch {
        console.warn("Failed to disconnect socket cleanly.");
      }
      socketRef.current = null;
    };
  }, [auth.merchantId, selectedRideId, scrollMessagesToBottom, refreshThreads]);

  React.useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  React.useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedRideId) return;

    socket.emit("chat:join", { request_id: Number(selectedRideId) }, () => {
      loadHistory(selectedRideId);
    });

    return () => {
      try {
        socket.emit("chat:leave", { request_id: Number(selectedRideId) });
      } catch {
        console.warn("Failed to leave chat room for ride_id:", selectedRideId);
      }
    };
  }, [selectedRideId, loadHistory]);

  React.useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        try {
          URL.revokeObjectURL(selectedImagePreview);
        } catch {
          console.warn(
            "Failed to revoke object URL on unmount:",
            selectedImagePreview,
          );
        }
      }
    };
  }, [selectedImagePreview]);

  React.useEffect(() => {
    if (threads.length) {
      hydrateDriverDetails(threads);
    }
  }, [threads, hydrateDriverDetails]);

  React.useEffect(() => {
    if (selectedDriverId && !driverDetailsMap[selectedDriverId]) {
      fetchDriverDetails(selectedDriverId).then((item) => {
        if (!item?.driver_id) return;
        setDriverDetailsMap((prev) => ({
          ...prev,
          [item.driver_id]: item,
        }));
      });
    }
  }, [selectedDriverId, driverDetailsMap, fetchDriverDetails]);

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

  const clearSelectedImage = React.useCallback(() => {
    if (selectedImagePreview) {
      try {
        URL.revokeObjectURL(selectedImagePreview);
      } catch {
        console.warn("Failed to revoke object URL:", selectedImagePreview);
      }
    }
    setSelectedImagePreview("");
    setSelectedImageFile(null);
  }, [selectedImagePreview]);

  const uploadImage = React.useCallback(async () => {
    if (!selectedImageFile) return "";

    if (!DELIVERY_CHAT_UPLOAD_URL) {
      throw new Error("Missing env: VITE_DELIVERY_CHAT_UPLOAD_URL");
    }

    const fd = new FormData();
    fd.append("file", selectedImageFile);

    const res = await fetch(DELIVERY_CHAT_UPLOAD_URL, {
      method: "POST",
      body: fd,
    });

    const out = await safeJson(res);

    if (!res.ok || !out?.ok || !out?.url) {
      throw new Error(extractMessage(out, "Failed to upload image."));
    }

    return out.url;
  }, [selectedImageFile]);

  const sendMessage = React.useCallback(async () => {
    const socket = socketRef.current;
    const rideId = Number(selectedRideId || 0);
    const text = String(messageText || "").trim();
    const hasImage = !!selectedImageFile;

    if (!socket || !rideId) return;
    if (!text && !hasImage) return;

    setSending(true);
    setMessagesError("");

    try {
      let attachments = null;

      if (hasImage) {
        const uploadedUrl = await uploadImage();
        attachments = uploadedUrl ? [uploadedUrl] : null;
      }

      socket.emit(
        "chat:send",
        {
          request_id: rideId,
          message: text,
          attachments,
          temp_id: `${Date.now()}-${Math.random()}`,
        },
        (ack) => {
          if (!ack?.ok) {
            setMessagesError(ack?.error || "Failed to send delivery message.");
            setSending(false);
            return;
          }

          const sent = normalizeHistoryMessage(ack?.message || {});
          setMessages((prev) => {
            const exists = prev.some((m) => Number(m.id) === Number(sent.id));
            return exists ? prev : [...prev, sent];
          });

          setThreads((prev) =>
            prev
              .map((item) =>
                Number(item.ride_id) === rideId
                  ? {
                      ...item,
                      last_message_at: sent.created_at,
                      last_message: sent,
                      unread: 0,
                    }
                  : item,
              )
              .sort(
                (a, b) =>
                  new Date(b.last_message_at || 0).getTime() -
                  new Date(a.last_message_at || 0).getTime(),
              ),
          );

          setMessageText("");
          clearSelectedImage();
          setSending(false);
          setTimeout(scrollMessagesToBottom, 50);

          socket.emit("chat:read", {
            request_id: rideId,
            last_seen_id: Number(sent.id),
          });
        },
      );
    } catch (e) {
      setMessagesError(e?.message || "Failed to send delivery message.");
      setSending(false);
    }
  }, [
    selectedRideId,
    messageText,
    selectedImageFile,
    uploadImage,
    clearSelectedImage,
    scrollMessagesToBottom,
  ]);

  return (
    <>
      <div className="globalChatSearch">
        <span className="globalChatSearchIcon">
          <SearchIcon />
        </span>
        <input
          type="text"
          className="globalChatSearchInput"
          placeholder="Search by ride ID, driver name, or message"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="globalChatGhostBtn"
          onClick={refreshThreads}
          title="Refresh delivery chats"
        >
          <RefreshIcon />
        </button>
      </div>

      <div className="globalChatBody">
        <div className="globalChatList">
          {loadingThreads ? (
            <div className="globalChatEmpty">Loading delivery chats...</div>
          ) : threadError ? (
            <div className="globalChatErrorBox">{threadError}</div>
          ) : filteredThreads.length ? (
            filteredThreads.map((item) => {
              const isActive = String(item.ride_id) === String(selectedRideId);
              const driverId = Number(item?.peer?.id || 0);
              const driverInfo = driverDetailsMap[driverId] || null;
              const driverName =
                driverInfo?.user_name ||
                (driverId ? `Driver #${driverId}` : "Driver");
              const driverProfile = driverInfo?.profile_image_url || "";
              const lastText =
                item?.last_message?.message ||
                (attachmentToUrl(item?.last_message?.attachments)
                  ? "[image]"
                  : "No messages yet");

              return (
                <button
                  key={item.ride_id}
                  type="button"
                  className={`globalChatListItem ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedRideId(String(item.ride_id))}
                >
                  <Avatar name={driverName} imageUrl={driverProfile} />

                  <div className="globalChatMeta">
                    <div className="globalChatMetaTop">
                      <span className="globalChatName">{driverName}</span>
                      <span className="globalChatTime">
                        {formatTime(item.last_message_at)}
                      </span>
                    </div>

                    <div className="globalChatOrderPill">
                      Ride #{item.ride_id}
                    </div>

                    <div className="globalChatMetaBottom">
                      <span className="globalChatLastMessage">{lastText}</span>
                      {item.unread > 0 ? (
                        <span className="globalChatUnread">{item.unread}</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="globalChatEmpty">No delivery chats found.</div>
          )}
        </div>

        <div className="globalChatPreview">
          {selectedThread ? (
            <>
              <div className="globalChatPreviewTop">
                <div className="globalChatPreviewProfile">
                  <Avatar
                    name={selectedDriverName}
                    imageUrl={selectedDriverProfile}
                    large
                  />

                  <div>
                    <div className="globalChatPreviewName">
                      {selectedDriverName}
                    </div>
                    <div className="globalChatPreviewRole">
                      Ride #{selectedThread.ride_id}
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
                      String(msg.sender_type).toLowerCase() === "merchant" &&
                      Number(msg.sender_id) === Number(auth.merchantId);

                    const imageUrl = attachmentToUrl(msg.attachments);
                    const finalImageUrl = imageUrl
                      ? joinUrl("https://grab.newedge.bt/grablike", imageUrl)
                      : "";

                    return (
                      <div
                        key={`${msg.request_id}-${msg.id}`}
                        className={`msgRow ${isMe ? "me" : "other"}`}
                      >
                        <div className="msgBubble">
                          {msg.message ? (
                            <div className="msgText">{msg.message}</div>
                          ) : null}

                          {finalImageUrl ? (
                            <a
                              href={finalImageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="msgImageLink"
                            >
                              <img
                                src={finalImageUrl}
                                alt="delivery attachment"
                                className="msgImage"
                              />
                            </a>
                          ) : null}

                          <div className="msgTime">
                            {formatTime(msg.created_at)}
                          </div>
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
              Select a delivery chat to view messages.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
