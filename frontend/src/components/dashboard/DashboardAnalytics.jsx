import React from "react";
import { analyticsService } from "../../services/api";
import AnalyticsPanel from "../analytics/AnalyticsPanel";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function SegmentProfiles({ data }) {
  const segments = Array.isArray(data) ? data : [];
  if (segments.length === 0) {
    return <p className="analyticsEmpty">No segment profile data is available.</p>;
  }

  return (
    <div className="analyticsRows">
      {segments.map((segment) => (
        <div className="analyticsRow" key={segment.segment_label}>
          <strong>
            {segment.segment_label}
          </strong>
          <span>{Number(segment.customers || 0).toLocaleString()} customers</span>
          <span>
            {segment.avg_clv == null
              ? "CLV unavailable"
              : `${currency.format(Number(segment.avg_clv))} avg. CLV`}
          </span>
        </div>
      ))}
    </div>
  );
}

function ClvDistribution({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="analyticsEmpty">No CLV distribution data is available.</p>;
  }

  const maximum = Math.max(...data.map((bin) => Number(bin.customers) || 0), 1);
  return (
    <div className="analyticsRows">
      {data.slice(0, 8).map((bin, index) => {
        const count = Number(bin.customers) || 0;
        return (
          <div className="analyticsRow analyticsDistributionRow" key={`${bin.bin_start}-${index}`}>
            <span>
              {currency.format(Number(bin.bin_start) || 0)} –{" "}
              {currency.format(Number(bin.bin_end) || 0)}
            </span>
            <span className="analyticsBarTrack" aria-hidden="true">
              <span
                className="analyticsBar"
                style={{ width: `${(count / maximum) * 100}%` }}
              />
            </span>
            <strong>{count.toLocaleString()}</strong>
          </div>
        );
      })}
    </div>
  );
}

function CohortRetention({ data }) {
  const monthAverages = (data?.months || []).map((month, index) => {
    const values = (data.values || [])
      .map((row) => row[index])
      .filter((value) => typeof value === "number" && Number.isFinite(value));
    return {
      month,
      average: values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : null,
    };
  }).filter(({ average }) => average !== null).slice(0, 8);

  if (monthAverages.length === 0) {
    return <p className="analyticsEmpty">No cohort retention data is available.</p>;
  }

  return (
    <>
      <p className="analyticsMeta">
        Average retention across {Number(data.cohorts?.length || 0).toLocaleString()} cohorts
      </p>
      <div className="analyticsRows">
        {monthAverages.map(({ month, average }) => (
          <div className="analyticsRow analyticsDistributionRow" key={month}>
            <span>{month}</span>
            <span className="analyticsBarTrack" aria-hidden="true">
              <span className="analyticsBar analyticsRetentionBar" style={{ width: `${Math.max(0, Math.min(100, average))}%` }} />
            </span>
            <strong>{average.toFixed(1)}%</strong>
          </div>
        ))}
      </div>
    </>
  );
}

export default function DashboardAnalytics() {
  return (
    <section className="analyticsSection" aria-label="Additional customer analytics">
      <h2 className="analyticsSectionTitle">Customer Intelligence Analytics</h2>
      <div className="grid3 dashboardAnalyticsGrid">
        <AnalyticsPanel
          title="Value by customer segment"
          sub="Customer counts and average lifetime value by segment"
          load={analyticsService.valueBySegment}
        >
          {(data) => <SegmentProfiles data={data} />}
        </AnalyticsPanel>
        <AnalyticsPanel
          title="Customer lifetime value"
          sub="Distribution of predicted customer lifetime value"
          load={analyticsService.clvDistribution}
        >
          {(data) => <ClvDistribution data={data} />}
        </AnalyticsPanel>
        <AnalyticsPanel
          title="Cohort retention"
          sub="Average customer retention by months since acquisition"
          load={analyticsService.cohortRetention}
        >
          {(data) => <CohortRetention data={data} />}
        </AnalyticsPanel>
        <AnalyticsPanel
          title="Delivery performance"
          sub="On-time delivery and average delivered-order speed"
          load={analyticsService.deliveryPerformance}
        >
          {(data) => (
            <div className="analyticsMetrics analyticsMetricsCompact">
              <div className="analyticsMetric">
                <span>Average delivery</span>
                <strong>
                  {data?.summary?.avg_delivery_days == null
                    ? "Unavailable"
                    : `${Number(data.summary.avg_delivery_days).toFixed(1)} days`}
                </strong>
              </div>
              <div className="analyticsMetric">
                <span>On time</span>
                <strong>{data?.summary?.on_time_pct == null ? "Unavailable" : `${Number(data.summary.on_time_pct).toFixed(1)}%`}</strong>
              </div>
              <div className="analyticsMetric">
                <span>Late</span>
                <strong>{data?.summary?.late_pct == null ? "Unavailable" : `${Number(data.summary.late_pct).toFixed(1)}%`}</strong>
              </div>
            </div>
          )}
        </AnalyticsPanel>
        <AnalyticsPanel
          title="Active campaigns"
          sub="Current campaign reach and high-priority customers"
          load={analyticsService.activeCampaigns}
        >
          {(data) => (
            <div className="analyticsMetrics analyticsMetricsCompact">
              <div className="analyticsMetric">
                <span>Campaigns</span>
                <strong>{Number(data?.active_campaigns || 0).toLocaleString()}</strong>
              </div>
              <div className="analyticsMetric">
                <span>Customers targeted</span>
                <strong>{Number(data?.customers_targeted || 0).toLocaleString()}</strong>
              </div>
              <div className="analyticsMetric">
                <span>High priority</span>
                <strong>{Number(data?.high_priority_customers || 0).toLocaleString()}</strong>
              </div>
            </div>
          )}
        </AnalyticsPanel>
      </div>
    </section>
  );
}
