// src/tabs/NotificationsTab.jsx
import React from "react";
import { NotificationsPage } from "./components/notification";
import "./components/notification/css/notifications.css";

export default function NotificationsTab({ session }) {
  return <NotificationsPage session={session} />;
}
