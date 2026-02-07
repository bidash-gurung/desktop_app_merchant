// tabs/HomeTab.jsx
import React, { useMemo } from "react";
import HomeItemsGrid from "./components/home/HomeItemsGrid";
import "./css/home.css";

export default function HomeTab({ session }) {
  const user = useMemo(() => {
    return session?.payload?.user || session?.payload?.data?.user || {};
  }, [session]);

  // ✅ This is where business_id comes from (session payload)
  const businessId = user?.business_id || null;
  const ownerType = String(user?.owner_type || "").toLowerCase(); // "mart" | "food" | etc.

  return (
    <div className="homeWrap">
      {/* cards row */}
      <div className="homeCards">
        <StatCard title="Today Sales" value="—" />
        <StatCard title="Active" value="—" />
        <StatCard title="Cancelled" value="—" />
        <StatCard title="Pending" value="—" />
      </div>

      {/* items grid */}
      <HomeItemsGrid
        session={session}
        businessId={businessId}
        ownerType={ownerType}
      />
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="statCard">
      <div className="statTitle">{title}</div>
      <div className="statValue">{value}</div>
    </div>
  );
}
