import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Panel } from "../States";
import {
  PAYMENT_COLORS,
  PAYMENT_ICONS,
  PaymentPieTooltip,
} from "./dashboardConstants";

export default function DashboardPaymentMethods({ payments = [] }) {
  const totalPaymentsValue = payments.reduce(
    (acc, pm) => acc + Number(pm.total_value || 0),
    0
  );

  const pieData = payments.map((pm) => ({
    name: (pm.type || "").replace(/_/g, " "),
    type: pm.type,
    total_value: Number(pm.total_value || 0),
    count: Number(pm.count || 0),
  }));

  return (
    <Panel title="Payment methods" sub="Transaction share by method">
      <div>
        <div style={{ width: "100%", height: 180, minWidth: 0, minHeight: 180 }}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Tooltip content={<PaymentPieTooltip totalPaymentsValue={totalPaymentsValue} />} />
              <Pie
                data={pieData}
                dataKey="total_value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                stroke="#ffffff"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={`pay-cell-${entry.type}`}
                    fill={PAYMENT_COLORS[entry.type] || "#059669"}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Compact Legend & Payment breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", marginTop: 8 }}>
          {pieData.map((entry) => {
            const pct = totalPaymentsValue > 0
              ? ((entry.total_value / totalPaymentsValue) * 100).toFixed(1)
              : "0.0";
            const icon = PAYMENT_ICONS[entry.type] || "💳";
            return (
              <div
                key={entry.type}
                className="dashLegendItem"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 11,
                  padding: "3px 6px",
                  borderRadius: 6,
                  background: "#f8fafc",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
                  <span style={{ fontSize: 12 }}>{icon}</span>
                  <span style={{ fontWeight: 600, color: "#334155", textTransform: "capitalize" }}>
                    {entry.name}
                  </span>
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
