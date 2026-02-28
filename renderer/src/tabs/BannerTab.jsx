// src/tabs/BannerTab.jsx
import React from "react";
import BannerPage from "./components/banners/BannerPage";
import "./components/banners/css/banners.css";

export default function BannerTab({ session }) {
  return <BannerPage session={session} />;
}
