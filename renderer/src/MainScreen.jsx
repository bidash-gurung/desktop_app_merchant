import React from "react";
import "./css/main.css";

import HomeTab from "./tabs/HomeTab";
import OrdersTab from "./tabs/OrdersTab";
import AddItemsTab from "./tabs/AddItemsTab";
import NotificationsTab from "./tabs/NotificationsTab";
import PayoutsTab from "./tabs/PayoutsTab";

const TABS = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "orders", label: "Orders", icon: OrdersIcon },
  { id: "add", label: "Add Items", icon: AddIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
  { id: "payouts", label: "Payouts", icon: WalletIcon },
];

export default function MainScreen({ session, onLogout }) {
  const [active, setActive] = React.useState("home");

  const user = session?.payload?.user || session?.payload?.data?.user || null;
  const businessName = user?.business_name || user?.businessName || "Merchant";

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
    <div className="appShell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brandRow">
          <div className="brandLogoBox">
            <img className="brandLogo" src="/logo/logo.png" alt="Logo" />
          </div>
          <div className="brandText">
            <div className="brandTitle">Merchant Desktop</div>
            <div className="brandSub">{businessName}</div>
          </div>
        </div>

        <nav className="nav">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                className={`navItem ${isActive ? "active" : ""}`}
                onClick={() => setActive(t.id)}
                type="button"
              >
                <span className="navIcon">
                  <Icon />
                </span>
                <span className="navLabel">{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebarFooter">
          <button className="logoutBtn" onClick={onLogout} type="button">
            <span className="navIcon">
              <LogoutIcon />
            </span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="mainArea">
        <div className="topBar">
          <div className="topTitle">
            {TABS.find((t) => t.id === active)?.label}
          </div>
          <div className="topRight">
            <div className="chip">
              <span className="chipDot" />
              Online
            </div>
          </div>
        </div>

        <div className="content">{renderContent()}</div>
      </main>
    </div>
  );
}

/* ---------- icons (inline SVG) ---------- */
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
