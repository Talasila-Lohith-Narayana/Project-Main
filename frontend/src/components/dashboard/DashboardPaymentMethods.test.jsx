import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPaymentMethods from "./DashboardPaymentMethods";

describe("DashboardPaymentMethods Component", () => {
  const mockPayments = [
    { type: "credit_card", count: 70, total_value: 7000 },
    { type: "boleto", count: 30, total_value: 3000 },
  ];

  it("renders payment methods panel and method breakdown percentages", () => {
    render(<DashboardPaymentMethods payments={mockPayments} />);

    expect(screen.getByText("Payment methods")).toBeInTheDocument();
    expect(screen.getByText(/credit card/i)).toBeInTheDocument();
    expect(screen.getByText(/boleto/i)).toBeInTheDocument();
    expect(screen.getByText("70.0%")).toBeInTheDocument();
    expect(screen.getByText("30.0%")).toBeInTheDocument();
  });

  it("handles fallback payment icon, color, and zero total payment values", () => {
    const customPayments = [
      { type: "other_method", count: null, total_value: null },
      { type: null, count: 0, total_value: 0 },
    ];

    render(<DashboardPaymentMethods payments={customPayments} />);

    expect(screen.getAllByText("0.0%")).toHaveLength(2);
    expect(screen.getByText("other method")).toBeInTheDocument();
  });

  it("renders properly with default empty payments prop", () => {
    render(<DashboardPaymentMethods />);
    expect(screen.getByText("Payment methods")).toBeInTheDocument();
  });
});
