import React from "react";

export const TIMEFRAME_OPTIONS = [
  { key: "all", label: "All-Time History" },
  { key: "2018", label: "Year 2018" },
  { key: "2017", label: "Year 2017" },
  { key: "2016", label: "Year 2016" },
  { key: "custom", label: "Custom Range" },
];

// Maps a primary timeframe to its default comparison period
export const COMPARISON_PERIODS = {
  "2018": { key: "2017", label: "vs 2017" },
  "2017": { key: "2016", label: "vs 2016" },
  "all": { key: "2017", label: "vs 2017" },
  "2016": null,
  "l6m": { key: "2017", label: "vs H2 2017" },
  "l30d": { key: "l6m", label: "vs Last 6 Months" },
  "custom": null,
};

// Labels for comparison period selection
export const COMPARE_OPTIONS = [
  { key: "2017", label: "2017" },
  { key: "2016", label: "2016" },
  { key: "2018", label: "2018" },
  { key: "all", label: "All-Time" },
];


export const SEGMENT_COLORS = {
  Champions: "#10b981",       // Vibrant Emerald Green (Top tier)
  Engaged: "#0ea5e9",         // Sky Blue (Loyal/Engaged)
  "At Risk": "#f43f5e",        // Rose / Crimson Red (High risk)
  "New / Developing": "#8b5cf6", // Vibrant Indigo / Violet (New potential)
};

export const PAYMENT_ICONS = {
  credit_card: "💳",
  boleto: "📄",
  voucher: "🎟️",
  debit_card: "🏧",
};

export const PAYMENT_COLORS = {
  credit_card: "#10b981",
  boleto: "#f59e0b",
  voucher: "#8b5cf6",
  debit_card: "#3b82f6",
};

export const STATE_COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#64748b",
];

export const SegmentBarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const segmentName = dataPoint.segment;
    const count = Number(dataPoint.count || 0);
    const color = SEGMENT_COLORS[segmentName] || "#38bdf8";

    return (
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: "10px",
          fontSize: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
          minWidth: "150px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color, display: "inline-block" }} />
          <strong style={{ color: "#e2e8f0", fontSize: "13px" }}>
            {segmentName}
          </strong>
        </div>
        <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "12px" }}>
          <span>Customer count:</span>
          <b style={{ color: "#38bdf8", fontFamily: "Space Grotesk" }}>{count.toLocaleString()}</b>
        </div>
      </div>
    );
  }
  return null;
};

export const RevenueTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: "10px",
          fontSize: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          minWidth: "160px",
        }}
      >
        <strong style={{ display: "block", color: "#94a3b8", marginBottom: "4px" }}>
          {label}
        </strong>
        <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: "14px", fontFamily: "Space Grotesk" }}>
          R$ {Number(dataPoint.revenue || 0).toLocaleString()}
        </div>
        <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "11px" }}>
          <span>Order volume:</span>
          <b style={{ color: "#e2e8f0" }}>{Number(dataPoint.orders || 0).toLocaleString()}</b>
        </div>
      </div>
    );
  }
  return null;
};

export const RegionalPieTooltip = ({ active, payload, totalRevenue }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const rev = Number(dataPoint.revenue || 0);
    const pct = totalRevenue > 0 ? ((rev / totalRevenue) * 100).toFixed(1) : "0.0";

    return (
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: "10px",
          fontSize: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          minWidth: "160px",
        }}
      >
        <strong style={{ display: "block", fontSize: "13px", color: "#f8fafc", marginBottom: "4px" }}>
          {dataPoint.name}
        </strong>
        <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: "14px", fontFamily: "Space Grotesk" }}>
          R$ {rev.toLocaleString()}
        </div>
        <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "11px" }}>
          <span>Revenue share:</span>
          <b style={{ color: "#e2e8f0" }}>{pct}%</b>
        </div>
        <div style={{ marginTop: 2, display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "11px" }}>
          <span>Total shoppers:</span>
          <b style={{ color: "#e2e8f0" }}>{Number(dataPoint.customers || 0).toLocaleString()}</b>
        </div>
      </div>
    );
  }
  return null;
};

export const PaymentPieTooltip = ({ active, payload, totalPaymentsValue }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const val = Number(dataPoint.total_value || 0);
    const pct = totalPaymentsValue > 0 ? ((val / totalPaymentsValue) * 100).toFixed(1) : "0.0";
    const formattedName = (dataPoint.type || "").replace(/_/g, " ");
    const icon = PAYMENT_ICONS[dataPoint.type] || "💳";

    return (
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: "10px",
          fontSize: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          minWidth: "160px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: "14px" }}>{icon}</span>
          <strong style={{ fontSize: "13px", color: "#f8fafc", textTransform: "capitalize" }}>
            {formattedName}
          </strong>
        </div>
        <div style={{ color: "#34d399", fontWeight: 700, fontSize: "14px", fontFamily: "Space Grotesk" }}>
          R$ {val.toLocaleString()}
        </div>
        <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "11px" }}>
          <span>Volume share:</span>
          <b style={{ color: "#e2e8f0" }}>{pct}%</b>
        </div>
        <div style={{ marginTop: 2, display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "11px" }}>
          <span>Total transactions:</span>
          <b style={{ color: "#e2e8f0" }}>{Number(dataPoint.count || 0).toLocaleString()}</b>
        </div>
      </div>
    );
  }
  return null;
};
