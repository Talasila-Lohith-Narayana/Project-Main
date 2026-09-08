import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardRegionalDistribution from "./DashboardRegionalDistribution";

describe("DashboardRegionalDistribution Component", () => {
  const mockStates = [
    { state: "SP", revenue: 5000000, customers: 40000 },
    { state: "RJ", revenue: 2000000, customers: 15000 },
  ];

  const mockKpis = {
    revenue: 10000000,
    customers: 80000,
  };

  it("renders regional distribution title and state abbreviations in legend", () => {
    const mockNavigate = vi.fn();

    render(
      <DashboardRegionalDistribution
        topStates={mockStates}
        kpis={mockKpis}
        navigate={mockNavigate}
      />
    );

    expect(screen.getByText("Regional distribution")).toBeInTheDocument();
    expect(screen.getByText("SP")).toBeInTheDocument();
    expect(screen.getByText("RJ")).toBeInTheDocument();
    expect(screen.getByText("Others")).toBeInTheDocument();
    expect(screen.getByText("50.0%")).toBeInTheDocument();
    expect(screen.getByText("20.0%")).toBeInTheDocument();
  });

  it("navigates to customer state filter on legend item click", () => {
    const mockNavigate = vi.fn();

    render(
      <DashboardRegionalDistribution
        topStates={mockStates}
        kpis={mockKpis}
        navigate={mockNavigate}
      />
    );

    const spLegend = screen.getByTitle("View customers in SP");
    fireEvent.click(spLegend);

    expect(mockNavigate).toHaveBeenCalledWith("/customers?state=SP");

    // Clicking Others legend item should not navigate
    const othersLegend = screen.getByText("Others");
    fireEvent.click(othersLegend);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("handles when top states account for 100% of revenue (no others)", () => {
    const fullStates = [{ state: "SP", revenue: 1000, customers: 10 }];
    render(
      <DashboardRegionalDistribution
        topStates={fullStates}
        kpis={{ revenue: 1000, customers: 10 }}
        navigate={vi.fn()}
      />
    );

    expect(screen.queryByText("Others")).not.toBeInTheDocument();
    expect(screen.getByText("100.0%")).toBeInTheDocument();
  });

  it("renders properly with default empty props", () => {
    render(<DashboardRegionalDistribution />);
    expect(screen.getByText("Regional distribution")).toBeInTheDocument();
  });
});
