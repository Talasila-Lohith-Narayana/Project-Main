import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Panel } from "../States";
import { RegionalPieTooltip, STATE_COLORS } from "./dashboardConstants";

export default function DashboardRegionalDistribution({
  topStates = [],
  kpis = {},
  navigate,
}) {
  const totalRevenue = Number(kpis.revenue) || 1;
  const topStatesRev = topStates.reduce((acc, s) => acc + Number(s.revenue || 0), 0);
  const otherRev = Math.max(0, totalRevenue - topStatesRev);

  const pieData = [
    ...topStates.map((s) => ({
      name: `State of ${s.state}`,
      state: s.state,
      revenue: Number(s.revenue || 0),
      customers: Number(s.customers || 0),
    })),
    ...(otherRev > 0
      ? [
        {
          name: "Other States",
          state: "Others",
          revenue: otherRev,
          customers: Math.max(
            0,
            Number(kpis.customers || 0) -
            topStates.reduce((acc, s) => acc + Number(s.customers || 0), 0)
          ),
        },
      ]
      : []),
  ];

  return (
    <Panel title="Regional distribution" sub="Market revenue share · Click state to view">
      <div>
        <div style={{ width: "100%", height: 180, minWidth: 0, minHeight: 180 }}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Tooltip content={<RegionalPieTooltip totalRevenue={totalRevenue} />} />
              <Pie
                data={pieData}
                dataKey="revenue"
                nameKey="state"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                stroke="#ffffff"
                strokeWidth={2}
                isAnimationActive={false}
                style={{ cursor: "pointer" }}
                onClick={(entry) => {
                  if (entry?.state && entry.state !== "Others") {
                    navigate(`/customers?state=${entry.state}`);
                  }
                }}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`state-cell-${index}`}
                    fill={STATE_COLORS[index % STATE_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Compact Legend & Top State breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", marginTop: 8 }}>
          {pieData.slice(0, 6).map((entry, index) => {
            const pct = ((entry.revenue / totalRevenue) * 100).toFixed(1);
            return (
              <div
                key={entry.state}
                className="dashLegendItem"
                onClick={() => {
                  if (entry.state !== "Others") {
                    navigate(`/customers?state=${entry.state}`);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 11,
                  padding: "3px 6px",
                  borderRadius: 6,
                  background: "#f8fafc",
                  cursor: entry.state !== "Others" ? "pointer" : "default",
                }}
                title={entry.state !== "Others" ? `View customers in ${entry.state}` : undefined}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: STATE_COLORS[index % STATE_COLORS.length],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 600, color: "#334155" }}>{entry.state}</span>
                </div>
                <b style={{ color: "#0f172a" }}>{pct}%</b>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
