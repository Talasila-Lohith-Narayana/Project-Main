import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Campaigns from "./Campaigns";
import { analyticsService } from "../services/api";

const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
);

describe("Campaigns", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    if (originalScrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
    } else {
      delete HTMLElement.prototype.scrollIntoView;
    }
  });

  it("loads active campaign summaries and drills down to targeted customers", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    vi.spyOn(analyticsService, "activeCampaigns").mockResolvedValue({
      active_campaigns: 1,
      customers_targeted: 20,
      high_priority_customers: 10,
      campaigns: [
        { campaign_name: "Retention Offer", campaign_priority: 2, customer_count: 20 },
      ],
    });
    vi.spyOn(analyticsService, "campaignsBySegment").mockResolvedValue([
      {
        segment_label: "At Risk",
        total_customers: 20,
        campaigns: [{ campaign_name: "Retention Offer", reason_code: "RC01", customer_count: 20 }],
      },
    ]);
    const campaignCustomers = vi.spyOn(analyticsService, "campaignCustomers").mockResolvedValue({
      campaign_name: "Retention Offer",
      total: 1,
      page: 1,
      page_size: 25,
      items: [{
        customer_unique_id: "unique_customer_1",
        risk_tier: "High Risk",
        segment_label: "At Risk",
        value_tier: "High",
        campaign_priority: 2,
        reason_code: "RC01",
        churn_probability: 0.82,
      }],
    });

    render(
      <MemoryRouter initialEntries={["/campaigns"]}>
        <Routes>
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/customers/:id" element={<p>Customer profile route</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("button", { name: "View customers" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View customers" }));
    expect(await screen.findByText("unique_customer_1")).toBeInTheDocument();
    expect(screen.getByText("82.0%")).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(campaignCustomers).toHaveBeenCalledWith("Retention Offer", { page: 1, page_size: 25 });

    fireEvent.click(screen.getByRole("button", { name: "unique_customer_1" }));
    expect(await screen.findByText("Customer profile route")).toBeInTheDocument();
  });

  it("shows empty campaign data without requesting an audience prematurely", async () => {
    vi.spyOn(analyticsService, "activeCampaigns").mockResolvedValue({
      active_campaigns: 0,
      customers_targeted: 0,
      high_priority_customers: 0,
      campaigns: [],
    });
    vi.spyOn(analyticsService, "campaignsBySegment").mockResolvedValue([]);
    const campaignCustomers = vi.spyOn(analyticsService, "campaignCustomers");

    render(
      <MemoryRouter>
        <Campaigns />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No active campaigns were returned.")).toBeInTheDocument();
    expect(screen.getByText("Choose “View customers” for a campaign to load its audience.")).toBeInTheDocument();
    await waitFor(() => expect(campaignCustomers).not.toHaveBeenCalled());
  });
});
