import React from "react";
import ClientMerchantChat from "./chat/ClientMerchantChat";
import DeliveryMerchantChat from "./chat/DeliveryMerchantChat";

function ChatBubbleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 18H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6l-5 4v-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function GlobalChatWidget({ session }) {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("client");

  return (
    <>
      <button
        type="button"
        className={`globalChatFab ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title={open ? "Close chats" : "Open chats"}
        aria-label={open ? "Close chats" : "Open chats"}
      >
        <span className="globalChatFabIcon">
          <ChatBubbleIcon />
        </span>
      </button>

      {open ? (
        <div className="globalChatPanel" role="dialog" aria-label="Chats">
          <div className="globalChatHeader">
            <div className="globalChatHeaderText">
              <div className="globalChatTitle">Messages</div>
              <div className="globalChatSubtitle">
                Client and delivery conversations
              </div>
            </div>

            <button
              type="button"
              className="globalChatClose"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              title="Close"
            >
              ×
            </button>
          </div>

          <div className="globalChatTabs">
            <button
              type="button"
              className={`globalChatTab ${activeTab === "client" ? "active" : ""}`}
              onClick={() => setActiveTab("client")}
            >
              Client
            </button>
            <button
              type="button"
              className={`globalChatTab ${activeTab === "delivery" ? "active" : ""}`}
              onClick={() => setActiveTab("delivery")}
            >
              Delivery
            </button>
          </div>

          {activeTab === "client" ? (
            <ClientMerchantChat session={session} />
          ) : (
            <DeliveryMerchantChat session={session} />
          )}
        </div>
      ) : null}
    </>
  );
}
