import React from "react";
import { Star } from "lucide-react";
import { Panel } from "../States";

export default function DashboardReviewSatisfaction({
  ratingsDist = [],
  kpis = {},
  navigate,
}) {
  const totalReviewsCount = ratingsDist.reduce(
    (acc, cur) => acc + Number(cur.count || 0),
    0
  );

  return (
    <Panel title="Review distribution" sub="Customer feedback breakdown">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "6px 0" }}>
        <div
          className="dashSatisfactionBox"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: 10,
          }}
        >
          <div>
            <span style={{ fontSize: 11, color: "#92400e", fontWeight: 600, display: "block" }}>
              OVERALL SATISFACTION
            </span>
            <b style={{ fontSize: 20, color: "#78350f", fontFamily: "Space Grotesk" }}>
              {Number(kpis.avg_rating || 0).toFixed(2)} / 5.0
            </b>
          </div>
          <div style={{ fontSize: 24, color: "#f59e0b" }}>
            {"★".repeat(Math.round(Number(kpis.avg_rating || 0)))}
          </div>
        </div>

        {ratingsDist.map((r) => {
          const pct =
            totalReviewsCount > 0
              ? ((Number(r.count) / totalReviewsCount) * 100).toFixed(1)
              : 0;
          return (
            <div
              className="starRatingRow"
              key={r.stars}
              onClick={() => navigate(`/customers?rating=${r.stars}`)}
              style={{ cursor: "pointer" }}
              title={`View customers with ${r.stars}-star reviews`}
            >
              <div className="starRatingScore">
                <span>{r.stars}</span>
                <Star size={13} fill="#f59e0b" stroke="#f59e0b" />
              </div>
              <div className="starRatingBar">
                <div
                  className="starRatingBarFill"
                  style={{
                    width: `${pct}%`,
                    background: r.stars >= 4 ? "#10b981" : r.stars === 3 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
              <div className="starRatingCount">
                <b>{pct}%</b>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
