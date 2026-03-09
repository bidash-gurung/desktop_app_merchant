// src/tabs/components/notification/FeedbackSummary.jsx
import React, { useMemo } from "react";

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function FeedbackSummary({ totals }) {
  const avg = n(totals?.avg_rating);
  const totalRatings = n(totals?.total_ratings);
  const totalComments = n(totals?.total_comments);

  const by = totals?.by_stars || {};
  const s5 = n(by[5] ?? by["5"]);
  const s4 = n(by[4] ?? by["4"]);
  const s3 = n(by[3] ?? by["3"]);
  const s2 = n(by[2] ?? by["2"]);
  const s1 = n(by[1] ?? by["1"]);

  const maxBar = Math.max(1, s1, s2, s3, s4, s5);

  const rows = useMemo(
    () => [
      { label: "5★", v: s5 },
      { label: "4★", v: s4 },
      { label: "3★", v: s3 },
      { label: "2★", v: s2 },
      { label: "1★", v: s1 },
    ],
    [s1, s2, s3, s4, s5],
  );

  return (
    <div className="fbSummary">
      <div className="fbSummaryLeft">
        <div className="fbAvg">
          {avg ? String(avg).replace(/\.0+$/, "") : 0}
        </div>
        <div className="fbAvgLabel">Average rating</div>

        <div className="fbSummaryCounts">
          <div className="fbCount">
            <div className="fbCountN">{totalRatings}</div>
            <div className="fbCountL">Total ratings</div>
          </div>

          <div className="fbCount">
            <div className="fbCountN">{totalComments}</div>
            <div className="fbCountL">Total comments</div>
          </div>
        </div>
      </div>

      <div className="fbSummaryRight">
        {rows.map((r) => {
          const pct = Math.round((r.v / maxBar) * 100);
          return (
            <div className="fbStarRow" key={r.label}>
              <div className="fbStarLabel">{r.label}</div>
              <div className="fbStarBar" aria-hidden="true">
                <div className="fbStarFill" style={{ width: `${pct}%` }} />
              </div>
              <div className="fbStarCount">{r.v}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
