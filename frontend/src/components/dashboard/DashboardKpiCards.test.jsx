import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardKpiCards from "./DashboardKpiCards";

describe("DashboardKpiCards Component", () => {
  const mockKpis = {
    customers: 96096,
    revenue: 16008872,
    orders: 99441,
    avg_order_value: 160.98,
    avg_delivery_days: 12.5,
    repeat_customers: 2997,
  };

  const mockRepeatRate = "3.1";
  const mockNavigate = vi.fn();

  it("renders all 6 executive KPI card titles correctly", () => {
    render(
      <DashboardKpiCards
        kpis={mockKpis}
        repeatRate={mockRepeatRate}
        navigate={mockNavigate}
      />
    );

    expect(screen.getByText("Total Customers")).toBeInTheDocument();
    expect(screen.getByText("Gross Revenue")).toBeInTheDocument();
    expect(screen.getByText("Total Orders")).toBeInTheDocument();
    expect(screen.getByText("Avg Order Value")).toBeInTheDocument();
    expect(screen.getByText("Avg Fulfillment")).toBeInTheDocument();
    expect(screen.getByText("Repeat Rate")).toBeInTheDocument();
  });

  it("displays properly formatted and localized metric values", () => {
    render(
      <DashboardKpiCards
        kpis={mockKpis}
        repeatRate={mockRepeatRate}
        navigate={mockNavigate}
      />
    );

    expect(screen.getByText("96,096")).toBeInTheDocument();
    expect(screen.getByText("R$ 16,008,872")).toBeInTheDocument();
    expect(screen.getByText("99,441")).toBeInTheDocument();
    expect(screen.getByText("R$ 160.98")).toBeInTheDocument();
    expect(screen.getByText("12.5 days")).toBeInTheDocument();
    expect(screen.getByText("3.1%")).toBeInTheDocument();
  });

  it("navigates to customer directory when clicking Total Customers card", () => {
    render(
      <DashboardKpiCards
        kpis={mockKpis}
        repeatRate={mockRepeatRate}
        navigate={mockNavigate}
      />
    );

    const customerCard = screen.getByTitle("Click to jump: View Directory");
    fireEvent.click(customerCard);

    expect(mockNavigate).toHaveBeenCalledWith("/customers");
  });

  it("navigates to top spenders when clicking Gross Revenue card", () => {
    render(
      <DashboardKpiCards
        kpis={mockKpis}
        repeatRate={mockRepeatRate}
        navigate={mockNavigate}
      />
    );

    const revenueCard = screen.getByTitle("Click to jump: Top Spenders");
    fireEvent.click(revenueCard);

    expect(mockNavigate).toHaveBeenCalledWith("/customers?sort=spend-desc");
  });

  it("navigates to remaining views when clicking other KPI cards", () => {
    render(
      <DashboardKpiCards
        kpis={mockKpis}
        repeatRate={mockRepeatRate}
        navigate={mockNavigate}
      />
    );

    // Total Orders
    fireEvent.click(screen.getByTitle("Click to jump: Active Buyers"));
    expect(mockNavigate).toHaveBeenCalledWith("/customers?activity=active");

    // Avg Order Value
    fireEvent.click(screen.getByTitle("Click to jump: Premium Catalog"));
    expect(mockNavigate).toHaveBeenCalledWith("/products?sort=price_desc");

    // Repeat Rate
    fireEvent.click(screen.getByTitle("Click to jump: Champions"));
    expect(mockNavigate).toHaveBeenCalledWith("/customers?segment=Champions");
  });

  it("handles empty or default kpi props gracefully", () => {
    render(
      <DashboardKpiCards
        repeatRate="0.0"
        navigate={mockNavigate}
      />
    );

    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });
});
