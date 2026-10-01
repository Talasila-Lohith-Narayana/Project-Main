import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import * as ApiModule from "../services/api";

const mockDashboardData = {
  kpis: {
    customers: 96000,
    revenue: 16000000,
    orders: 99000,
    avg_order_value: 160.0,
    avg_delivery_days: 12.0,
    repeat_customers: 3000,
    avg_rating: 4.1,
  },
  top_states: [{ state: "SP", revenue: 5000000, customers: 40000 }],
  monthly: [{ month: "2018-01", revenue: 1000000, orders: 6000 }],
  segments: [{ segment: "High Risk", count: 1200 }],
  payments: [{ type: "credit_card", total_value: 1000000, count: 5000 }],
  ratings_dist: [{ stars: 5, count: 5000 }],
  categories: [{ category: "health_beauty", purchases: 1000 }],
};

describe("Dashboard Page Orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays loading state initially", () => {
    vi.spyOn(ApiModule.dashboardService, "summary").mockReturnValue(
      new Promise(() => {})
    );

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Loading executive analytics...")).toBeInTheDocument();
  });

  it("displays error state when dashboard data fails to load and supports retry", async () => {
    const spy = vi
      .spyOn(ApiModule.dashboardService, "summary")
      .mockRejectedValueOnce(new Error("Database connection lost"))
      .mockResolvedValueOnce(mockDashboardData);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Database connection lost")).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Executive Business Overview")).toBeInTheDocument();
    });
  });

  it("renders full dashboard widgets once data loads and handles time horizon switches", async () => {
    const spy = vi.spyOn(ApiModule.dashboardService, "summary").mockResolvedValue(
      mockDashboardData
    );

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Executive Business Overview")).toBeInTheDocument();
      expect(screen.getByText("Total Customers")).toBeInTheDocument();
      expect(screen.getByText("Revenue growth trend")).toBeInTheDocument();
      expect(screen.getByText("Customer segments")).toBeInTheDocument();
      expect(screen.getByText("Regional distribution")).toBeInTheDocument();
      expect(screen.getByText("Payment methods")).toBeInTheDocument();
      expect(screen.getByText("Review distribution")).toBeInTheDocument();
      expect(screen.getByText("Top product categories")).toBeInTheDocument();
    });

    // Switch timeframe to 2018
    const btn2018 = screen.getByRole("button", { name: "Year 2018" });
    fireEvent.click(btn2018);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ timeframe: "2018" });
    });

    // Switch to Custom Range
    const customBtn = screen.getByRole("button", { name: "Custom Range" });
    fireEvent.click(customBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Apply Range" })).toBeInTheDocument();
    });

    const applyBtn = screen.getByRole("button", { name: "Apply Range" });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        timeframe: "custom",
        start_date: "2017-01-01",
        end_date: "2018-08-31",
      });
    });
  });

  it("handles empty/zero customer metrics gracefully", async () => {
    vi.spyOn(ApiModule.dashboardService, "summary").mockResolvedValue({
      ...mockDashboardData,
      kpis: {
        customers: 0,
        revenue: 0,
        orders: 0,
        repeat_customers: 0,
      },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Executive Business Overview")).toBeInTheDocument();
      expect(screen.getByText("0.0%")).toBeInTheDocument();
    });
  });
});
