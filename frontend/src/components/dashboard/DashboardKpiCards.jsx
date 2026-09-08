import React from "react";
import {
  Repeat2,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";

export default function DashboardKpiCards({ kpis = {}, repeatRate, navigate }) {
  const metrics = [
    {
      label: "Total Customers",
      value: Number(kpis.customers || 0).toLocaleString(),
      icon: Users,
      badgeText: `${Number(kpis.repeat_customers || 0).toLocaleString()} repeat customers`,
      badgeColor: "blue",
      theme: "blue",
      onClick: () => navigate("/customers"),
      linkHint: "View Directory",
    },
    {
      label: "Gross Revenue",
      value: `R$ ${Number(kpis.revenue || 0).toLocaleString()}`,
      icon: WalletCards,
      badgeText: "Historical marketplace GMV",
      badgeColor: "emerald",
      theme: "emerald",
      onClick: () => navigate("/customers?sort=spend-desc"),
      linkHint: "Top Spenders",
    },
    {
      label: "Total Orders",
      value: Number(kpis.orders || 0).toLocaleString(),
      icon: ShoppingBag,
      badgeText: `${(Number(kpis.orders || 0) / (Number(kpis.customers) || 1)).toFixed(2)} orders / customer`,
      badgeColor: "indigo",
      theme: "indigo",
      onClick: () => navigate("/customers?activity=active"),
      linkHint: "Active Buyers",
    },
    {
      label: "Avg Order Value",
      value: `R$ ${Number(kpis.avg_order_value || 0).toFixed(2)}`,
      icon: TrendingUp,
      badgeText: "Average ticket size per order",
      badgeColor: "amber",
      theme: "amber",
      onClick: () => navigate("/products?sort=price_desc"),
      linkHint: "Premium Catalog",
    },
    {
      label: "Avg Fulfillment",
      value: `${Number(kpis.avg_delivery_days || 0).toFixed(1)} days`,
      icon: Truck,
      badgeText: "Order placement to delivery",
      badgeColor: "teal",
      theme: "teal",
      onClick: () => navigate("/customers"),
      linkHint: "Customer SLAs",
    },
    {
      label: "Repeat Rate",
      value: `${repeatRate}%`,
      icon: Repeat2,
      badgeText: "Multi-order retention",
      badgeColor: "purple",
      theme: "purple",
      onClick: () => navigate("/customers?segment=Champions"),
      linkHint: "Champions",
    },
  ];

  return (
    <div className="kpis">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            className="kpi"
            key={m.label}
            onClick={m.onClick}
            style={{ cursor: "pointer" }}
            title={`Click to jump: ${m.linkHint}`}
          >
            <div className="kpiContent">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="kpiLabel">{m.label}</span>
              </div>
              <b className="kpiValue">{m.value}</b>
              <div className="kpiSub">
                <span className={`metricBadge ${m.badgeColor}`}>{m.badgeText}</span>
              </div>
            </div>
            <div className={`kpiIconWrapper ${m.theme}`}>
              <Icon size={22} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
