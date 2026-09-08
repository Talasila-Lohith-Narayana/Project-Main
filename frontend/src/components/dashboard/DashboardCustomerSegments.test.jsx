import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardCustomerSegments from "./DashboardCustomerSegments";

describe("DashboardCustomerSegments Component", () => {
  const mockSegments = [
    { segment: "Champions", count: 1200 },
    { segment: "Engaged", count: 4500 },
    { segment: "At Risk", count: 800 },
    { segment: "New / Developing", count: 89000 },
    { segment: "Custom / Unknown", count: 150 },
  ];

  it("renders customer segments panel title and subtitle", () => {
    render(
      <DashboardCustomerSegments
        segments={mockSegments}
        navigate={vi.fn()}
      />
    );

    expect(screen.getByText("Customer segments")).toBeInTheDocument();
    expect(
      screen.getByText(/Behavior & value clustering/i)
    ).toBeInTheDocument();
  });

  it("renders properly with default empty segments array", () => {
    render(<DashboardCustomerSegments />);
    expect(screen.getByText("Customer segments")).toBeInTheDocument();
  });
});
