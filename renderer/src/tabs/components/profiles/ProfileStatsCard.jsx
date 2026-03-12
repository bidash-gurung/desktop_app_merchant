// src/tabs/components/profiles/ProfileStatsCard.jsx
import React from "react";

export default function ProfileStatsCard({ profile }) {
  return (
    <section className="pfCard">
      <div className="pfCardHead">
        <div>
          <h3 className="pfCardTitle">Account Summary</h3>
          <p className="pfCardSub">Quick overview of your profile account.</p>
        </div>
      </div>

      <div className="pfStatsGrid">
        <div className="pfStatBox pfStatBoxFull">
          <div className="pfStatLabel">Points</div>
          <div className="pfStatValue">{Number(profile?.points || 0)}</div>
        </div>

        <div className="pfStatBox">
          <div className="pfStatLabel">Role</div>
          <div className="pfStatValue">{profile?.role || "-"}</div>
        </div>

        <div className="pfStatBox">
          <div className="pfStatLabel">Status</div>
          <div className="pfStatValue">
            {profile?.is_active ? "Active" : "Inactive"}
          </div>
        </div>
      </div>
    </section>
  );
}
