// src/realtime/socket.js
import { io } from "socket.io-client";

let socket = null;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL; // http://grab.newedge.bt
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH; // /orders/socket.io

function normPath(p) {
  if (!p) return "/socket.io";
  const s = String(p).trim();
  return s.startsWith("/") ? s : `/${s}`;
}

export function connectSocket({
  token = null,
  devUserId = null,
  devRole = "merchant",
  businessId = null,
  business_id = null,
  business_ids = null,
} = {}) {
  if (!SOCKET_URL) {
    console.log("[socket] ❌ Missing env VITE_SOCKET_URL");
    return null;
  }

  const path = normPath(SOCKET_PATH);

  // reuse existing connected socket
  if (socket && socket.connected) return socket;

  // if exists but not connected, clean it
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch {
      // Ignore errors during cleanup
    }
    socket = null;
  }

  const bid = business_id ?? businessId ?? null;
  const bids =
    Array.isArray(business_ids) && business_ids.length
      ? business_ids
      : bid
        ? [bid]
        : [];

  // IMPORTANT:
  // Your backend currently runs DEV_NOAUTH=true
  // so it expects: devUserId + devRole
  // (and merchant joins business room using business_id / business_ids)
  const auth = {
    ...(token ? { token } : {}),
    devUserId: devUserId ? Number(devUserId) : undefined,
    devRole: devRole || "merchant",
    ...(bid ? { business_id: Number(bid) } : {}),
    ...(bids.length ? { business_ids: bids.map((x) => Number(x)) } : {}),
  };

  socket = io(SOCKET_URL, {
    path,
    transports: ["websocket"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 2500,
    timeout: 12000,
    auth,
  });

  // basic logs
  socket.on("connect", () => {
    console.log("[socket] ✅ connected", {
      id: socket.id,
      url: SOCKET_URL,
      path,
      transport: socket?.io?.engine?.transport?.name,
      auth: {
        devUserId: auth.devUserId,
        devRole: auth.devRole,
        business_id: auth.business_id,
        business_ids: auth.business_ids,
      },
    });
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] ❌ disconnected", reason);
  });

  socket.on("connect_error", (err) => {
    console.log("[socket] ❌ connect_error", err);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch {
    // Ignore errors during disconnect
  }
  socket = null;
}
