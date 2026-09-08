import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "../States";
import { RevenueTooltip } from "./dashboardConstants";

export default function DashboardRevenueTrend({ monthly = [] }) {
  return (
    <Panel title="Revenue growth trend" sub="Monthly historical transaction volume (R$)">
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={monthly}
            margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
          >
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2f7d72" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#2f7d72" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line, #f1f5f9)" />
            <XAxis
              dataKey="month"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickMargin={8}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
              tickMargin={8}
            />
            <Tooltip content={<RevenueTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2f7d72"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorRev)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
