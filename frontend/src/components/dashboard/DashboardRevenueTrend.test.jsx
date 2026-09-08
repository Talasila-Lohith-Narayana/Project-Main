import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardRevenueTrend from "./DashboardRevenueTrend";

describe("DashboardRevenueTrend Component", () => {
  const mockMonthly = [
    { month: "2018-01", revenue: 1100000, orders: 7000 },
    { month: "2018-02", revenue: 990000, orders: 6500 },
  ];

  it("renders revenue growth trend panel header and description", () => {
    render(<DashboardRevenueTrend monthly={mockMonthly} />);

    expect(screen.getByText("Revenue growth trend")).toBeInTheDocument();
    expect(
      screen.getByText("Monthly historical transaction volume (R$)")
    ).toBeInTheDocument();
  });

  it("renders with default empty monthly array", () => {
    render(<DashboardRevenueTrend />);
    expect(screen.getByText("Revenue growth trend")).toBeInTheDocument();
  });
});
