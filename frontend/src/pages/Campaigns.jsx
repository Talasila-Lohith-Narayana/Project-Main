import React, { useCallback, useEffect, useRef, useState } from "react";
import { Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnalyticsPanel from "../components/analytics/AnalyticsPanel";
import { Page, Panel } from "../components/States";
import { analyticsService } from "../services/api";

const number = new Intl.NumberFormat("en-US");

function ActiveCampaigns({ data, onSelect }) {
  const campaigns = data?.campaigns || [];
  if (campaigns.length === 0) {
    return <p className="analyticsEmpty">No active campaigns were returned.</p>;
  }
  return (
    <div className="analyticsTableWrap">
      <table className="analyticsTable campaignsTable">
        <thead>
          <tr><th>Campaign</th><th>Priority</th><th>Customers</th><th>Targets</th></tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.campaign_name}>
              <td><strong>{campaign.campaign_name}</strong></td>
              <td><span className={`campaignPriority priority${campaign.campaign_priority}`}>P{campaign.campaign_priority}</span></td>
              <td>{number.format(campaign.customer_count)}</td>
              <td>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => onSelect(campaign.campaign_name)}
                >
                  View customers
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CampaignSegments({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="analyticsEmpty">No campaign allocation data is available.</p>;
  }
  return (
    <div className="analyticsRows">
      {data.map((segment) => (
        <div className="analyticsCampaignSegment" key={segment.segment_label}>
          <div className="analyticsCampaignHeading">
            <strong>{segment.segment_label}</strong>
            <span>{number.format(segment.total_customers)} customers</span>
          </div>
          <div className="analyticsCampaignTags">
            {(segment.campaigns || []).map((campaign) => (
              <span key={`${campaign.campaign_name}-${campaign.reason_code}`}>
                {campaign.campaign_name} · {number.format(campaign.customer_count)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CampaignCustomers({ data, navigate }) {
  const items = data?.items || [];
  if (items.length === 0) {
    return <p className="analyticsEmpty">No customers are available for this campaign.</p>;
  }
  return (
    <>
      <p className="analyticsMeta">
        {number.format(data.total)} targeted customers · ordered by churn probability
      </p>
      <div className="analyticsTableWrap">
        <table className="analyticsTable campaignsTable campaignAudienceTable">
          <thead>
            <tr><th>Customer</th><th>Risk</th><th>Priority</th><th>Segment</th><th>Value</th><th>Churn score</th><th>Reason</th></tr>
          </thead>
          <tbody>
            {items.map((customer) => (
              <tr key={customer.customer_unique_id}>
                <td>
                  <button
                    type="button"
                    className="analyticsLinkButton"
                    title={customer.customer_unique_id}
                    onClick={() => navigate(`/customers/${customer.customer_unique_id}`)}
                  >
                    {customer.customer_unique_id}
                  </button>
                </td>
                <td>{customer.risk_tier}</td>
                <td>P{customer.campaign_priority}</td>
                <td>{customer.segment_label}</td>
                <td>{customer.value_tier}</td>
                <td>
                  {customer.churn_probability == null
                    ? "—"
                    : `${(Number(customer.churn_probability) * 100).toFixed(1)}%`}
                </td>
                <td>{customer.reason_code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="analyticsMeta">Showing page {data.page} of targeted customers.</p>
    </>
  );
}

export default function Campaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [page, setPage] = useState(1);
  const audienceRef = useRef(null);
  const navigate = useNavigate();
  const loadCampaignCustomers = useCallback(
    () => analyticsService.campaignCustomers(selectedCampaign, { page, page_size: 25 }),
    [selectedCampaign, page],
  );

  useEffect(() => {
    if (selectedCampaign && typeof audienceRef.current?.scrollIntoView === "function") {
      audienceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedCampaign]);

  return (
    <Page>
      <div className="campaignsPage">
        <header className="analyticsPageHeader">
          <div className="analyticsPageIcon"><Megaphone size={22} /></div>
          <div>
            <p className="eyebrow">CUSTOMER ENGAGEMENT</p>
            <h1>Campaigns</h1>
            <p>Review active retention campaigns and explore the customers targeted by each.</p>
          </div>
        </header>

        <AnalyticsPanel
          title="Active campaign reach"
          sub="Campaign volume, total audience, and high-priority targets"
          load={analyticsService.activeCampaigns}
        >
          {(data) => (
            <>
              <div className="analyticsMetrics analyticsMetricsCompact">
                <div className="analyticsMetric"><span>Active campaigns</span><strong>{number.format(data.active_campaigns || 0)}</strong></div>
                <div className="analyticsMetric"><span>Customers targeted</span><strong>{number.format(data.customers_targeted || 0)}</strong></div>
                <div className="analyticsMetric"><span>High priority</span><strong>{number.format(data.high_priority_customers || 0)}</strong></div>
              </div>
              <ActiveCampaigns data={data} onSelect={(name) => { setSelectedCampaign(name); setPage(1); }} />
            </>
          )}
        </AnalyticsPanel>

        <div className="campaignsLower">
          <AnalyticsPanel
            title="Campaign allocation by segment"
            sub="Campaign mix and audience counts for each customer segment"
            load={analyticsService.campaignsBySegment}
          >
            {(data) => <CampaignSegments data={data} />}
          </AnalyticsPanel>
          {selectedCampaign ? (
            <div className="campaignAudience" ref={audienceRef}>
              <AnalyticsPanel
                title="Campaign audience"
                sub={selectedCampaign}
                load={loadCampaignCustomers}
                preserveDataOnRefresh
              >
                {(data) => (
                  <>
                    <CampaignCustomers data={data} navigate={navigate} />
                    <div className="pager campaignAudiencePager">
                      <div className="pagerInfo">
                        <span>
                          Page <strong>{page}</strong> of{" "}
                          <strong>
                            {Math.max(1, Math.ceil(data.total / data.page_size))}
                          </strong>
                        </span>
                        <span className="pagerDivider">•</span>
                        <span className="pagerTotal">
                          <strong>{number.format(data.total)}</strong>{" "}
                          {data.total === 1 ? "targeted customer" : "targeted customers"}
                        </span>
                      </div>
                      <div className="pagerControls">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage((current) => current - 1)}
                          aria-label="Previous page"
                          title="Previous page"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          disabled={
                            page >= Math.ceil(data.total / data.page_size)
                          }
                          onClick={() => setPage((current) => current + 1)}
                          aria-label="Next page"
                          title="Next page"
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </AnalyticsPanel>
            </div>
          ) : (
            <Panel
              title="Campaign audience"
              sub="Select a campaign above to inspect its audience"
            >
              <p className="analyticsEmpty">Choose “View customers” for a campaign to load its audience.</p>
            </Panel>
          )}
        </div>
      </div>
    </Page>
  );
}
