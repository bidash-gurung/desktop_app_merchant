// MainScreen.jsx
import React from "react";
import "./css/main.css";

import HomeTab from "./tabs/HomeTab";
import OrdersTab from "./tabs/OrdersTab";
import AddItemsTab from "./tabs/AddItemsTab";
import NotificationsTab from "./tabs/NotificationsTab";
import PayoutsTab from "./tabs/PayoutsTab";

const MERCHANT_LOGO_PREFIX = import.meta.env.VITE_MERCHANT_LOGO;
const PROFILE_IMAGE_PREFIX = import.meta.env.VITE_PROFILE_IMAGE;
const PROFILE_ENDPOINT = import.meta.env.VITE_PROFILE_ENDPOINT; // https://grab.newedge.bt/driver/api/profile/{user_id}

const TABS = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "orders", label: "Orders", icon: OrdersIcon },
  { id: "add", label: "Add Items", icon: AddIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
  { id: "payouts", label: "Payouts", icon: WalletIcon },
];

function joinUrl(prefix, path) {
  if (!path) return "";
  const p = String(path);
  if (p.startsWith("http://") || p.startsWith("https://")) return p;

  const base = (prefix || "").trim();
  if (!base) return p;

  const baseNoSlash = base.endsWith("/") ? base.slice(0, -1) : base;
  const pathSlash = p.startsWith("/") ? p : `/${p}`;
  return `${baseNoSlash}${pathSlash}`;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function extractMessage(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return payload.message || payload.error || payload.msg || "";
}

function buildUrl(base, id) {
  if (!base) return "";
  if (base.includes("{user_id}")) return base.replace("{user_id}", String(id));
  return base.endsWith("/") ? `${base}${id}` : `${base}/${id}`;
}

export default function MainScreen({ session, onLogout }) {
  const [active, setActive] = React.useState("home");

  const [bizLogoBroken, setBizLogoBroken] = React.useState(false);

  // profile image is fetched (not taken from session)
  const [profileBroken, setProfileBroken] = React.useState(false);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileErr, setProfileErr] = React.useState("");
  const [profileImagePath, setProfileImagePath] = React.useState("");

  const payload = session?.payload || session || {};
  const user = payload?.user || payload?.data?.user || null;

  const userId = user?.user_id ?? user?.id ?? null;

  const token =
    payload?.token?.access_token ||
    payload?.data?.token?.access_token ||
    payload?.access_token ||
    payload?.data?.access_token ||
    null;

  const businessName = user?.business_name || "Merchant";
  const businessLogoPath = user?.business_logo || "";
  const address = user?.address || "";

  // ✅ show full name (from session first; falls back to profile API if present)
  const sessionFullName = String(user?.user_name || "").trim();
  const [profileFullName, setProfileFullName] = React.useState("");
  const fullUserName = (sessionFullName || profileFullName || "User").trim();

  const businessLogoUrl =
    !bizLogoBroken && businessLogoPath
      ? joinUrl(MERCHANT_LOGO_PREFIX, businessLogoPath)
      : "";

  const profileUrl =
    !profileBroken && profileImagePath
      ? joinUrl(PROFILE_IMAGE_PREFIX, profileImagePath)
      : "";

  // ✅ fetch profile_image (+ user_name as fallback) from profile endpoint
  React.useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    async function loadProfile() {
      setProfileErr("");
      setProfileBroken(false);

      if (!PROFILE_ENDPOINT) {
        setProfileErr("Missing env: VITE_PROFILE_ENDPOINT");
        setProfileImagePath("");
        return;
      }
      if (!userId) {
        setProfileErr("Missing user_id in session.");
        setProfileImagePath("");
        return;
      }

      const url = buildUrl(PROFILE_ENDPOINT, userId);

      setProfileLoading(true);
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: ctrl.signal,
        });

        const out = await safeJson(res);

        if (!res.ok) {
          if (!alive) return;
          setProfileErr(
            extractMessage(out) || `Profile fetch failed (${res.status})`,
          );
          setProfileImagePath("");
          return;
        }

        const img = out?.profile_image || out?.data?.profile_image || "";
        const nm = String(out?.user_name || out?.data?.user_name || "").trim();

        if (!alive) return;
        setProfileImagePath(String(img || ""));
        if (!sessionFullName && nm) setProfileFullName(nm);
      } catch (e) {
        if (!alive) return;
        if (e?.name === "AbortError") return;
        setProfileErr(e?.message || "Profile network error");
        setProfileImagePath("");
      } finally {
        if (alive) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [PROFILE_ENDPOINT, userId, token, sessionFullName]);

  function renderContent() {
    switch (active) {
      case "home":
        return <HomeTab session={session} />;
      case "orders":
        return <OrdersTab session={session} />;
      case "add":
        return <AddItemsTab session={session} />;
      case "notifications":
        return <NotificationsTab session={session} />;
      case "payouts":
        return <PayoutsTab session={session} />;
      default:
        return <HomeTab session={session} />;
    }
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="side">
        {/* ✅ Only business logo + business name */}
        <div className="sideHeader">
          <div className="sideBrandLogo" title={businessName}>
            {businessLogoUrl ? (
              <img
                className="sideBrandLogoImg"
                src={businessLogoUrl}
                alt={businessName}
                onError={() => setBizLogoBroken(true)}
              />
            ) : (
              <div className="sideBrandLogoFallback">NE</div>
            )}
          </div>

          <div className="sideBrandText">
            <div className="sideBizName">{businessName}</div>
          </div>
        </div>

        <nav className="nav" aria-label="Main navigation">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                type="button"
                title={t.label}
                className={`navBtn ${isActive ? "active" : ""}`}
                onClick={() => setActive(t.id)}
              >
                <span className="navIco">
                  <Icon />
                </span>
                <span className="navTxt">{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sideFooter">
          <button
            type="button"
            className="logout"
            onClick={onLogout}
            title="Logout"
          >
            <span className="navIco">
              <LogoutIcon />
            </span>
            <span className="navTxt">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {/* ✅ Top bar: center address, right = full name then bigger profile */}
        <header className="top">
          <div className="topLeft" />

          <div className="topCenter" title={address}>
            {address ? (
              <div className="topAddress">
                <span className="pin" aria-hidden="true">
                  <PinIcon />
                </span>
                <span className="addrText">{address}</span>
              </div>
            ) : (
              <div className="topAddress muted"> </div>
            )}
          </div>

          <div className="topRight">
            {/* ✅ full name */}
            <div className="topUserName" title={fullUserName}>
              {fullUserName}
            </div>

            {/* ✅ bigger avatar */}
            <div className="topProfile topProfileLg" title={fullUserName}>
              {profileLoading ? (
                <div
                  className="topProfileFallback"
                  aria-label="Loading profile"
                >
                  …
                </div>
              ) : profileUrl ? (
                <img
                  className="topProfileImg"
                  src={profileUrl}
                  alt={fullUserName}
                  onError={() => setProfileBroken(true)}
                />
              ) : (
                <div className="topProfileFallback">
                  {(fullUserName?.trim()?.[0] || "U").toUpperCase()}
                </div>
              )}
            </div>

            {profileErr ? <span className="srOnly">{profileErr}</span> : null}
          </div>
        </header>

        <div className="panel">{renderContent()}</div>
      </main>
    </div>
  );
}

/* ---------- icons ---------- */
function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function OrdersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path d="M7 7h14v14H7V7Z" stroke="currentColor" strokeWidth="2" />
      <path d="M3 3h14v14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function AddIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M10 19a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3H17a2 2 0 0 0 0 4h4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M21 10h-4a2 2 0 0 0 0 4h4"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M3 12h11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 9l-3 3 3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 11.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
