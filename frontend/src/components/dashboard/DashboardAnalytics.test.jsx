import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DashboardAnalytics from "./DashboardAnalytics";
import { analyticsService } from "../../services/api";

describe("DashboardAnalytics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders segment, CLV, and cohort analytics when requests succeed", async () => {
    vi.spyOn(analyticsService, "valueBySegment").mockResolvedValue([
      {
        segment_label: "Loyal",
        customers: 125,
        avg_clv: 640,
      },
    ]);
    vi.spyOn(analyticsService, "clvDistribution").mockResolvedValue([
      { bin_start: 0, bin_end: 500, customers: 90 },
    ]);
    vi.spyOn(analyticsService, "cohortRetention").mockResolvedValue({
      cohorts: ["2017-01", "2017-02"],
      months: ["M0", "M1"],
      values: [
        [100, 70],
        [100, 50],
      ],
    });
    vi.spyOn(analyticsService, "deliveryPerformance").mockResolvedValue({
      summary: { avg_delivery_days: 12.4, on_time_pct: 88.2, late_pct: 11.8 },
    });
    vi.spyOn(analyticsService, "activeCampaigns").mockResolvedValue({
      active_campaigns: 4,
      customers_targeted: 850,
      high_priority_customers: 210,
      campaigns: [],
    });

    render(<DashboardAnalytics />);

    expect(await screen.findByText("Loyal")).toBeInTheDocument();
    expect(screen.getByText("125 customers")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?640 avg\. CLV/)).toBeInTheDocument();
    expect(screen.getByText("M1")).toBeInTheDocument();
    expect(screen.getByText("60.0%")).toBeInTheDocument();
    expect(screen.getByText("12.4 days")).toBeInTheDocument();
    expect(screen.getByText("88.2%")).toBeInTheDocument();
    expect(screen.getByText("850")).toBeInTheDocument();
  });

  it("shows an isolated error and retries the failed analytics request", async () => {
    const valueBySegment = vi
      .spyOn(analyticsService, "valueBySegment")
      .mockRejectedValueOnce(new Error("Analytics temporarily unavailable"))
      .mockResolvedValueOnce([]);
    vi.spyOn(analyticsService, "clvDistribution").mockResolvedValue([]);
    vi.spyOn(analyticsService, "cohortRetention").mockResolvedValue({
      cohorts: [],
      months: [],
      values: [],
    });
    vi.spyOn(analyticsService, "deliveryPerformance").mockResolvedValue({ summary: {} });
    vi.spyOn(analyticsService, "activeCampaigns").mockResolvedValue({});

    render(<DashboardAnalytics />);

    expect(await screen.findByText("Analytics temporarily unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry Value by customer segment" }));

    await waitFor(() => {
      expect(valueBySegment).toHaveBeenCalledTimes(2);
      expect(screen.getByText("No segment profile data is available.")).toBeInTheDocument();
    });
    expect(screen.getByText("No CLV distribution data is available.")).toBeInTheDocument();
    expect(screen.getByText("No cohort retention data is available.")).toBeInTheDocument();
  });
});
