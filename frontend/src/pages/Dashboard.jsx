/**
 * ================================================================================
 * EXECUTIVE ANALYTICS DASHBOARD PAGE (pages/Dashboard.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This is the executive control center and primary home page. It coordinates
 * data fetching, timeframe filters, and assembles the modular dashboard components:
 * KPI metric cards, revenue growth trends, customer segments, regional share,
 * payment methods, CSAT ratings, and top categories.
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - Primary Dashboard Route (`/`):
 *   • DashboardHeroBanner: Time horizon selector and market reach stats.
 *   • DashboardKpiCards: 6 executive KPI cards with click-through navigation.
 *   • DashboardRevenueTrend: Monthly revenue area chart.
 *   • DashboardCustomerSegments: RFM segments horizontal bar chart.
 *   • DashboardRegionalDistribution: Top Brazilian states donut chart.
 *   • DashboardPaymentMethods: Payment method breakdown donut chart.
 *   • DashboardReviewSatisfaction: Overall CSAT rating and star breakdown.
 *   • DashboardTopCategories: Category volume leaderboard.
 * ================================================================================
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardService } from "../services/api";
import { ErrorState, LoadingState, Page } from "../components/States";

// Modular dashboard components
import DashboardHeroBanner from "../components/dashboard/DashboardHeroBanner";
import DashboardKpiCards from "../components/dashboard/DashboardKpiCards";
import DashboardRevenueTrend from "../components/dashboard/DashboardRevenueTrend";
import DashboardCustomerSegments from "../components/dashboard/DashboardCustomerSegments";
import DashboardRegionalDistribution from "../components/dashboard/DashboardRegionalDistribution";
import DashboardPaymentMethods from "../components/dashboard/DashboardPaymentMethods";
import DashboardReviewSatisfaction from "../components/dashboard/DashboardReviewSatisfaction";
import DashboardTopCategories from "../components/dashboard/DashboardTopCategories";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [timeframe, setTimeframe] = useState("all");
  const [customRange, setCustomRange] = useState({
    startDate: "2017-01-01",
    endDate: "2018-08-31",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = (selectedTime = timeframe, range = customRange) => {
    setError("");
    const params =
      selectedTime === "custom"
        ? { timeframe: "custom", start_date: range.startDate, end_date: range.endDate }
        : { timeframe: selectedTime };

    return dashboardService
      .summary(params)
      .then(setData)
      .catch((requestError) => setError(requestError.message));
  };

  useEffect(() => {
    if (timeframe !== "custom") {
      load(timeframe);
    }
  }, [timeframe]);

  const handleApplyCustom = (e) => {
    e?.preventDefault();
    setTimeframe("custom");
    load("custom", customRange);
  };

  if (error)
    return (
      <Page>
        <ErrorState message={error} retry={() => load(timeframe, customRange)} />
      </Page>
    );

  if (!data)
    return (
      <Page>
        <LoadingState text="Loading executive analytics..." />
      </Page>
    );

  const kpis = data?.kpis || {};
  const repeatRate =
    kpis.customers > 0
      ? ((Number(kpis.repeat_customers || 0) / Number(kpis.customers)) * 100).toFixed(1)
      : "0.0";

  return (
    <Page>
      {/* Hero Welcome Banner with Time Horizon Picker */}
      <DashboardHeroBanner
        data={data}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        customRange={customRange}
        setCustomRange={setCustomRange}
        handleApplyCustom={handleApplyCustom}
        load={load}
      />

      {/* KPI Cards Grid with Interactive Shortcuts */}
      <DashboardKpiCards kpis={kpis} repeatRate={repeatRate} navigate={navigate} />

      {/* Primary Visualizations */}
      <div className="grid2">
        <DashboardRevenueTrend monthly={data.monthly} />
        <DashboardCustomerSegments segments={data.segments} navigate={navigate} />
      </div>

      {/* Secondary 3-Column Analytics Grid */}
      <div className="grid3">
        <DashboardRegionalDistribution
          topStates={data.top_states}
          kpis={kpis}
          navigate={navigate}
        />
        <DashboardPaymentMethods payments={data.payments} />
        <DashboardReviewSatisfaction
          ratingsDist={data.ratings_dist}
          kpis={kpis}
          navigate={navigate}
        />
      </div>

      {/* Top Product Categories Leaderboard */}
      <DashboardTopCategories categories={data.categories} navigate={navigate} />
    </Page>
  );
}
