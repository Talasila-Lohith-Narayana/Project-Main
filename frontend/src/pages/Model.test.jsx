import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Model from "./Model";
import { analyticsService } from "../services/api";

describe("Model diagnostics", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows available feature diagnostics and honest empty states for missing reports", async () => {
    vi.spyOn(analyticsService, "modelPerformance").mockResolvedValue({
      model_name: "LightGBM",
      split_evaluated: "test",
      metrics: { roc_auc: null, pr_auc: null, precision: null, recall: null },
    });
    vi.spyOn(analyticsService, "modelComparison").mockResolvedValue({
      comparison_table: [],
      summary_winner: null,
    });
    vi.spyOn(analyticsService, "modelThresholds").mockResolvedValue({ best_thresholds: [] });
    vi.spyOn(analyticsService, "modelImbalanceExperiments").mockResolvedValue({ strategies: [] });
    vi.spyOn(analyticsService, "churnSummary").mockResolvedValue({
      total_customers: 50,
      avg_churn_probability: 0.2,
      predicted_churn_customers: 5,
      predicted_churn_rate: 0.1,
      threshold: 0.5,
    });
    vi.spyOn(analyticsService, "churnLastRefresh").mockResolvedValue({
      last_refreshed_at: "2025-03-01 10:00:00",
    });
    vi.spyOn(analyticsService, "churnProbabilityDistribution").mockResolvedValue({
      total_customers: 0,
      bins: [],
    });
    vi.spyOn(analyticsService, "churnReasonCodeSummary").mockResolvedValue({
      total_reason_codes: 0,
      reason_codes: [],
    });
    vi.spyOn(analyticsService, "churnTopFeatures").mockResolvedValue({
      scored_customers: 0,
      features: [],
    });
    vi.spyOn(analyticsService, "churnFeatureImportance").mockResolvedValue({
      scored_customers: 0,
      features: [],
    });
    vi.spyOn(analyticsService, "analyticsTableStatuses").mockResolvedValue({
      table_count: 1,
      tables: [{ table_name: "churn_predictions", status: "available", row_count: 50 }],
    });
    vi.spyOn(analyticsService, "predictCustomer").mockResolvedValue({
      churn_probability: 0.63,
      reason_codes: ["RC02"],
      model_version: "v1",
      scored_at: "2025-03-01T10:00:00Z",
    });
    vi.spyOn(analyticsService, "featureSummary").mockResolvedValue({
      total_records: 100,
      features: [{
        feature: "avg_review_score",
        count: 100,
        null_count: 0,
        mean: 4.2,
        median: 4.5,
        min: 1,
        max: 5,
      }, {
        feature: "avg_order_value",
        count: 100,
        null_count: 0,
        mean: 75,
        median: 60,
        min: 2,
        max: 400,
      }],
    });
    const distribution = vi.spyOn(analyticsService, "featureDistribution").mockResolvedValue({
      feature: "avg_review_score",
      total_count: 100,
      null_count: 0,
      bins: [{ bin_start: 4, bin_end: 5, count: 60, density: 0.6 }],
    });
    vi.spyOn(analyticsService, "churnByFeature").mockResolvedValue({
      feature: "avg_review_score",
      total_customers: 100,
      buckets: [{
        bucket_label: "4.0–5.0",
        customer_count: 60,
        churned_count: 4,
        churn_rate_pct: 6.7,
      }],
    });

    render(<Model />);

    expect(await screen.findByText("Scored customers")).toBeInTheDocument();
    expect(await screen.findByText("20.0%")).toBeInTheDocument();
    expect(await screen.findByText("churn_predictions")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Advanced diagnostics" }));

    expect(await screen.findByText("Evaluation metrics are not available for this model.")).toBeInTheDocument();
    expect(screen.getByText("Model comparison data is not available.")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Feature distribution")).toBeInTheDocument();
    });
    expect(screen.getByText("6.7% churn")).toBeInTheDocument();
    expect(distribution).toHaveBeenCalledWith({ feature: "avg_review_score", bins: 10 });

    fireEvent.click(screen.getByRole("button", { name: "Overview" }));

    const customerInput = await screen.findByLabelText("Customer unique ID");
    fireEvent.change(customerInput, {
      target: { value: "unique_customer_1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Score customer" }));

    await waitFor(() => {
      expect(analyticsService.predictCustomer).toHaveBeenCalledWith("unique_customer_1");
    });
    expect(await screen.findByText("63.0%", { selector: "strong" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Advanced diagnostics" }));
    const featureSelect = await screen.findByLabelText("Analyze feature");
    fireEvent.change(featureSelect, {
      target: { value: "avg_order_value" },
    });
    await waitFor(() => {
      expect(distribution).toHaveBeenCalledWith({ feature: "avg_order_value", bins: 10 });
    });
  });
});
