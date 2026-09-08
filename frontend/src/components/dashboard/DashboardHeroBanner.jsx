import React from "react";
import { Calendar } from "lucide-react";
import { TIMEFRAME_OPTIONS } from "./dashboardConstants";

export default function DashboardHeroBanner({
  data,
  timeframe,
  setTimeframe,
  customRange,
  setCustomRange,
  handleApplyCustom,
  load,
}) {
  return (
    <div className="dashHeroBanner">
      <div style={{ flex: 1, paddingRight: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 11,
              background: "rgba(56, 189, 248, 0.2)",
              color: "#38bdf8",
              padding: "2px 8px",
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            EXECUTIVE INTELLIGENCE
          </span>
        </div>
        <h2>Executive Business Overview</h2>
        <p>
          Real-time analytics across Brazil's marketplace: customer value, order growth,
          regional demand, and satisfaction signals.
        </p>

        {/* Timeframe Horizon Filter Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#94a3b8",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginRight: 2,
            }}
          >
            <Calendar size={13} /> Time Horizon:
          </span>
          {TIMEFRAME_OPTIONS.map((opt) => {
            const isActive = timeframe === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setTimeframe(opt.key);
                  if (opt.key === "custom") {
                    load("custom", customRange);
                  }
                }}
                style={{
                  background: isActive ? "#38bdf8" : "rgba(255, 255, 255, 0.08)",
                  color: isActive ? "#0f172a" : "#cbd5e1",
                  border: isActive ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 6,
                  padding: "4px 9px",
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Manual Date Input Controls - Active when 'Custom Range' tab is selected */}
        {timeframe === "custom" && (
          <form
            onSubmit={handleApplyCustom}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              padding: "8px 12px",
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 500 }}>From:</span>
            <input
              type="date"
              min="2016-09-01"
              max="2018-10-31"
              value={customRange.startDate}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, startDate: e.target.value }))}
              style={{
                background: "#0f172a",
                color: "#f8fafc",
                border: "1px solid #334155",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 11,
                outline: "none",
              }}
            />
            <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 500 }}>To:</span>
            <input
              type="date"
              min="2016-09-01"
              max="2018-10-31"
              value={customRange.endDate}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, endDate: e.target.value }))}
              style={{
                background: "#0f172a",
                color: "#f8fafc",
                border: "1px solid #334155",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 11,
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                background: "#0284c7",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Apply Range
            </button>
          </form>
        )}
      </div>

      <div className="dashHeroStats">
        <div className="dashHeroStatItem">
          <span>Market Reach</span>
          <b>{data?.top_states?.length || 27} States</b>
        </div>
        <div className="dashHeroStatItem">
          <span>Product Catalog</span>
          <b style={{ color: "#38bdf8" }}>73 Categories</b>
        </div>
      </div>
    </div>
  );
}
