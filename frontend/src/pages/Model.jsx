import React, { useCallback, useEffect, useState } from "react";
import { Activity } from "lucide-react";
import AnalyticsPanel from "../components/analytics/AnalyticsPanel";
import { Page, Panel } from "../components/States";
import { analyticsService } from "../services/api";

const number = new Intl.NumberFormat("en-US");
const featuresLoad = () => analyticsService.featureSummary();
const featureLabel = (feature) => feature.replaceAll("_", " ");
const percent = (value) => value == null ? "Unavailable" : `${(Number(value) * 100).toFixed(1)}%`;
const churnSummaryLoad = () => analyticsService.churnSummary();
const churnTopFeaturesLoad = () => analyticsService.churnTopFeatures({ limit: 10 });
const churnImportanceLoad = () => analyticsService.churnFeatureImportance({ limit: 15 });
const churnRefreshLoad = () => analyticsService.churnLastRefresh();
const churnDistributionLoad = () => analyticsService.churnProbabilityDistribution();
const reasonCodesLoad = () => analyticsService.churnReasonCodeSummary();
const tableStatusesLoad = () => analyticsService.analyticsTableStatuses();

function Performance({ data }) {
  const metrics = data?.metrics || {};
  const labels = [
    ["ROC AUC", metrics.roc_auc],
    ["PR AUC", metrics.pr_auc],
    ["Precision", metrics.precision],
    ["Recall", metrics.recall],
    ["F1 score", metrics.f1],
    ["Balanced accuracy", metrics.balanced_accuracy],
  ];
  return (
    <>
      <p className="analyticsMeta">
        {data.model_name || "Model"} · {data.split_evaluated || "test"} split
        {data.version_or_timestamp ? ` · ${data.version_or_timestamp}` : ""}
      </p>
      {labels.every(([, value]) => value == null)
        ? <p className="analyticsEmpty">Evaluation metrics are not available for this model.</p>
        : <div className="analyticsMetrics">{labels.map(([label, value]) => (
            <div className="analyticsMetric" key={label}><span>{label}</span><strong>{percent(value)}</strong></div>
          ))}</div>}
      {metrics.confusion_matrix && (
        <p className="analyticsMeta">
          Confusion matrix · TN {metrics.confusion_matrix.tn} · FP {metrics.confusion_matrix.fp}
          {" · "}FN {metrics.confusion_matrix.fn} · TP {metrics.confusion_matrix.tp}
        </p>
      )}
    </>
  );
}

function ModelComparison({ data }) {
  const rows = data?.comparison_table || [];
  if (rows.length === 0) return <p className="analyticsEmpty">Model comparison data is not available.</p>;
  return (
    <>
      {data.summary_winner && <p className="analyticsMeta">Summary winner: {data.summary_winner}</p>}
      <div className="analyticsTableWrap">
        <table className="analyticsTable">
          <thead><tr><th>Metric</th><th>Logistic regression</th><th>LightGBM</th><th>Better</th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.metric}>
              <td>{row.metric}</td>
              <td>{row.logistic_regression == null ? "—" : Number(row.logistic_regression).toFixed(4)}</td>
              <td>{row.lightgbm == null ? "—" : Number(row.lightgbm).toFixed(4)}</td>
              <td>{row.better || "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}

function ThresholdAnalysis({ data }) {
  const rows = data?.best_thresholds || [];
  const curve = data?.sweep_curve || [];
  if (rows.length === 0 && curve.length === 0) {
    return <p className="analyticsEmpty">Recommended threshold data is not available.</p>;
  }
  const sampledCurve = curve.length > 12
    ? Array.from({ length: 12 }, (_, index) => curve[Math.round(index * (curve.length - 1) / 11)])
    : curve;
  return (
    <>
      <p className="analyticsMeta">Recommended model: {data.recommended_model || "Not specified"}</p>
      {rows.length > 0 ? (
        <div className="analyticsTableWrap">
          <table className="analyticsTable">
            <thead><tr><th>Objective</th><th>Logistic regression threshold / score</th><th>LightGBM threshold / score</th><th>Better</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.metric}>
                <td>{row.metric}</td>
                <td>{row.best_threshold_logreg == null ? "—" : `${Number(row.best_threshold_logreg).toFixed(3)} / ${row.best_score_logreg == null ? "—" : Number(row.best_score_logreg).toFixed(3)}`}</td>
                <td>{row.best_threshold_lgbm == null ? "—" : `${Number(row.best_threshold_lgbm).toFixed(3)} / ${row.best_score_lgbm == null ? "—" : Number(row.best_score_lgbm).toFixed(3)}`}</td>
                <td>{row.better || "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <p className="analyticsEmpty">Best-threshold recommendations are not available; showing the reported threshold sweep.</p>
      )}
      {sampledCurve.length > 0 && (
        <div className="analyticsTableWrap" style={{ marginTop: 12 }}>
          <table className="analyticsTable">
            <thead><tr><th>Threshold</th><th>Precision</th><th>Recall</th><th>F1</th><th>Balanced accuracy</th></tr></thead>
            <tbody>{sampledCurve.map((point) => (
              <tr key={point.threshold}>
                <td>{Number(point.threshold).toFixed(3)}</td>
                <td>{percent(point.precision)}</td>
                <td>{percent(point.recall)}</td>
                <td>{percent(point.f1)}</td>
                <td>{percent(point.balanced_accuracy)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ImbalanceExperiments({ data }) {
  const strategies = data?.strategies || [];
  if (strategies.length === 0) return <p className="analyticsEmpty">Class-imbalance experiment data is not available.</p>;
  return (
    <div className="analyticsTableWrap">
      <table className="analyticsTable">
        <thead><tr><th>Strategy</th><th>Threshold</th><th>Balanced accuracy</th><th>Churn recall</th><th>Churn precision</th><th>PR AUC</th></tr></thead>
        <tbody>{strategies.map((strategy) => (
          <tr key={strategy.strategy}>
            <td>{strategy.strategy}</td>
            <td>{strategy.tuned_threshold == null ? "—" : Number(strategy.tuned_threshold).toFixed(3)}</td>
            <td>{percent(strategy.balanced_accuracy)}</td>
            <td>{strategy.churn_recall ?? "—"}</td>
            <td>{strategy.churn_precision ?? "—"}</td>
            <td>{strategy.pr_auc == null ? "—" : Number(strategy.pr_auc).toFixed(4)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function FeatureStatistics({ data, feature, setFeature }) {
  const features = data?.features || [];
  useEffect(() => {
    if (features.length && !features.some((entry) => entry.feature === feature)) {
      setFeature(features[0].feature);
    }
  }, [features, feature, setFeature]);
  if (features.length === 0) return <p className="analyticsEmpty">Feature summary data is not available.</p>;
  return (
    <>
      <label className="analyticsFeatureSelect">
        Analyze feature
        <select value={feature} onChange={(event) => setFeature(event.target.value)}>
          {features.map((entry) => (
            <option value={entry.feature} key={entry.feature}>{featureLabel(entry.feature)}</option>
          ))}
        </select>
      </label>
      <div className="analyticsTableWrap">
        <table className="analyticsTable">
          <thead><tr><th>Feature</th><th>Count</th><th>Missing</th><th>Mean</th><th>Median</th><th>Range</th></tr></thead>
          <tbody>{features.map((entry) => (
            <tr key={entry.feature}>
              <td>{featureLabel(entry.feature)}</td><td>{number.format(entry.count)}</td><td>{number.format(entry.null_count)}</td>
              <td>{entry.mean == null ? "—" : Number(entry.mean).toFixed(3)}</td>
              <td>{entry.median == null ? "—" : Number(entry.median).toFixed(3)}</td>
              <td>{entry.min == null || entry.max == null ? "—" : `${Number(entry.min).toFixed(2)}–${Number(entry.max).toFixed(2)}`}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}

function FeatureAnalysis({ feature, setFeature }) {
  const loadDistribution = useCallback(
    () => analyticsService.featureDistribution({ feature, bins: 10 }),
    [feature],
  );
  const loadChurnBuckets = useCallback(
    () => analyticsService.churnByFeature({ feature, buckets: 5 }),
    [feature],
  );
  return (
    <>
      <div className="grid2">
        <AnalyticsPanel title="Feature distribution" sub={`Distribution of ${featureLabel(feature)}`} load={loadDistribution}>
          {(data) => {
            const bins = data?.bins || [];
            if (bins.length === 0) return <p className="analyticsEmpty">Feature distribution is not available.</p>;
            const maximum = Math.max(...bins.map((bin) => Number(bin.count) || 0), 1);
            return <div className="analyticsRows">
              {bins.map((bin, index) => (
                <div className="analyticsCampaignRow" key={`${bin.bin_start}-${index}`}>
                  <div className="analyticsCampaignHeading">
                    <span>{Number(bin.bin_start).toFixed(2)}–{Number(bin.bin_end).toFixed(2)}</span>
                    <span>{number.format(bin.count)} customers</span>
                  </div>
                  <span className="analyticsBarTrack" aria-hidden="true">
                    <span className="analyticsBar" style={{ width: `${(Number(bin.count) / maximum) * 100}%` }} />
                  </span>
                </div>
              ))}
            </div>;
          }}
        </AnalyticsPanel>
        <AnalyticsPanel title="Churn by feature" sub={`Observed churn rates across ${featureLabel(feature)} buckets`} load={loadChurnBuckets}>
          {(data) => {
            const buckets = data?.buckets || [];
            if (buckets.length === 0) return <p className="analyticsEmpty">Churn-by-feature data is not available.</p>;
            return <div className="analyticsRows">
              {buckets.map((bucket) => (
                <div className="analyticsRow" key={bucket.bucket_label}>
                  <strong>{bucket.bucket_label}</strong>
                  <span>{number.format(bucket.customer_count)} customers</span>
                  <span>{number.format(bucket.churned_count)} churned</span>
                  <span>{Number(bucket.churn_rate_pct).toFixed(1)}% churn</span>
                </div>
              ))}
            </div>;
          }}
        </AnalyticsPanel>
      </div>
    </>
  );
}

function ChurnSummary({ data }) {
  return (
    <>
      <div className="analyticsMetrics analyticsMetricsCompact">
        <div className="analyticsMetric"><span>Scored customers</span><strong>{number.format(data.total_customers || 0)}</strong></div>
        <div className="analyticsMetric"><span>Average churn probability</span><strong>{percent(data.avg_churn_probability)}</strong></div>
        <div className="analyticsMetric"><span>Above threshold</span><strong>{number.format(data.predicted_churn_customers || 0)}</strong></div>
        <div className="analyticsMetric"><span>Predicted churn rate</span><strong>{percent(data.predicted_churn_rate)}</strong></div>
      </div>
      <p className="analyticsMeta">
        Threshold: {percent(data.threshold)} · Latest score: {data.refreshed_at || "Unavailable"}
      </p>
    </>
  );
}

function ShapFeatureList({ data, valueKey, label }) {
  const features = data?.features || [];
  if (features.length === 0) return <p className="analyticsEmpty">Stored prediction explanations are not available.</p>;
  const maximum = Math.max(...features.map((entry) => Number(entry[valueKey]) || 0), 1e-12);
  return (
    <>
      <p className="analyticsMeta">{number.format(data.scored_customers || 0)} scored customers</p>
      <div className="analyticsRows">
        {features.map((entry) => (
          <div className="analyticsCampaignRow" key={entry.feature}>
            <div className="analyticsCampaignHeading">
              <strong>{featureLabel(entry.feature)}</strong>
              <span>{label}: {Number(entry[valueKey]).toFixed(4)} · {number.format(entry.customers_impacted ?? entry.customers_present ?? 0)} customers</span>
            </div>
            <span className="analyticsBarTrack" aria-hidden="true">
              <span className="analyticsBar" style={{ width: `${(Number(entry[valueKey]) / maximum) * 100}%` }} />
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function ProbabilityDistribution({ data }) {
  const bins = data?.bins || [];
  if (bins.length === 0 || !data.total_customers) {
    return <p className="analyticsEmpty">Stored churn probability data is not available.</p>;
  }
  const maximum = Math.max(...bins.map((bin) => Number(bin.count) || 0), 1);
  return (
    <>
      <p className="analyticsMeta">{number.format(data.total_customers)} scored customers</p>
      <div className="analyticsRows">
        {bins.map((bin) => (
          <div className="analyticsCampaignRow" key={bin.range}>
            <div className="analyticsCampaignHeading"><span>{bin.range}</span><span>{number.format(bin.count)}</span></div>
            <span className="analyticsBarTrack" aria-hidden="true">
              <span className="analyticsBar analyticsRetentionBar" style={{ width: `${(Number(bin.count) / maximum) * 100}%` }} />
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function ReasonCodeSummary({ data }) {
  const codes = data?.reason_codes || [];
  if (codes.length === 0) return <p className="analyticsEmpty">No stored reason-code counts are available.</p>;
  return (
    <>
      <p className="analyticsMeta">{number.format(data.total_reason_codes || 0)} total reason-code occurrences</p>
      <div className="analyticsRows">
        {codes.map((entry) => (
          <div className="analyticsRow" key={entry.reason_code}>
            <strong>{entry.reason_code}</strong>
            <span>{number.format(entry.count)} occurrences</span>
            <span>{entry.message || "No description available."}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function PipelineTables({ data }) {
  const tables = data?.tables || [];
  if (tables.length === 0) return <p className="analyticsEmpty">Pipeline table status is unavailable.</p>;
  return (
    <>
      <p className="analyticsMeta">{number.format(data.table_count || tables.length)} tracked pipeline tables</p>
      <div className="analyticsTableWrap">
        <table className="analyticsTable">
          <thead><tr><th>Table</th><th>Status</th><th>Rows</th></tr></thead>
          <tbody>{tables.map((table) => (
            <tr key={table.table_name}>
              <td>{table.table_name}</td>
              <td><span className={`pipelineStatus pipelineStatus-${table.status}`}>{table.status}</span></td>
              <td>{table.row_count == null ? "—" : number.format(table.row_count)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}

function PredictCustomer() {
  const [customerId, setCustomerId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const id = customerId.trim();
    if (!id) {
      setError("Enter a customer unique ID.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await analyticsService.predictCustomer(id));
    } catch (requestError) {
      setError(requestError.message || "Could not score this customer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="Score one customer" sub="Run the churn model against the pipeline feature row">
      <form className="modelPredictForm" onSubmit={submit}>
        <label htmlFor="model-customer-id">Customer unique ID</label>
        <div>
          <input
            id="model-customer-id"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            placeholder="Paste a customer unique ID"
            autoComplete="off"
          />
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? "Scoring..." : "Score customer"}
          </button>
        </div>
      </form>
      {error && <p className="modelPredictError" role="alert">{error}</p>}
      {result && (
        <div className="analyticsMetrics analyticsMetricsCompact modelPredictionResult">
          <div className="analyticsMetric"><span>Churn probability</span><strong>{percent(result.churn_probability)}</strong></div>
          <div className="analyticsMetric"><span>Reason codes</span><strong>{result.reason_codes?.length ? result.reason_codes.join(", ") : "Unavailable"}</strong></div>
          <div className="analyticsMetric"><span>Model version</span><strong>{result.model_version || "Unavailable"}</strong></div>
          <div className="analyticsMetric"><span>Scored at</span><strong>{result.scored_at || "Unavailable"}</strong></div>
        </div>
      )}
    </Panel>
  );
}

export default function Model() {
  const [feature, setFeature] = useState("avg_review_score");
  const [view, setView] = useState("overview");

  return (
    <Page>
      <div className="modelPage">
        <header className="analyticsPageHeader">
          <div className="analyticsPageIcon"><Activity size={22} /></div>
          <div>
            <p className="eyebrow">CHURN MODEL INSIGHTS</p>
            <h1>Model diagnostics</h1>
            <p>Inspect churn risk, model reports, experiment records, and observed feature behavior.</p>
          </div>
        </header>
        <div className="modelPageSummary" aria-label="Model summary highlights">
          <div className="modelSummaryCard">
            <span className="modelSummaryLabel">Prediction coverage</span>
            <strong>Live scoring</strong>
          </div>
          <div className="modelSummaryCard">
            <span className="modelSummaryLabel">Experiment depth</span>
            <strong>Historical runs</strong>
          </div>
          <div className="modelSummaryCard">
            <span className="modelSummaryLabel">Monitoring</span>
            <strong>Pipeline health</strong>
          </div>
        </div>

        <div className="tabs modelTabs" role="tablist" aria-label="Model page sections">
          <button
            type="button"
            className={view === "all" ? "active" : ""}
            onClick={() => setView("all")}
            aria-selected={view === "all"}
          >
            All
          </button>
          <button
            type="button"
            className={view === "overview" ? "active" : ""}
            onClick={() => setView("overview")}
            aria-selected={view === "overview"}
          >
            Overview
          </button>
          <button
            type="button"
            className={view === "advanced" ? "active" : ""}
            onClick={() => setView("advanced")}
            aria-selected={view === "advanced"}
          >
            Advanced diagnostics
          </button>
        </div>

        {view === "overview" && (
          <section className="analyticsPageSection" aria-labelledby="model-churn-heading">
            <h2 id="model-churn-heading">Stored churn predictions</h2>
            <div className="grid2">
              <AnalyticsPanel title="Churn overview" sub="Risk volume based on stored customer predictions" load={churnSummaryLoad}>
                {(data) => <ChurnSummary data={data} />}
              </AnalyticsPanel>
              <AnalyticsPanel title="Prediction refresh" sub="Most recent batch score and prediction distribution" load={churnRefreshLoad}>
                {(data) => <p className="analyticsMeta modelRefreshTimestamp">{data.last_refreshed_at || "No stored prediction refresh is available."}</p>}
              </AnalyticsPanel>
              <AnalyticsPanel title="Churn probability distribution" sub="Stored customer scores grouped into probability ranges" load={churnDistributionLoad}>
                {(data) => <ProbabilityDistribution data={data} />}
              </AnalyticsPanel>
              <AnalyticsPanel title="Reason-code summary" sub="Most frequently recorded explanations for churn predictions" load={reasonCodesLoad}>
                {(data) => <ReasonCodeSummary data={data} />}
              </AnalyticsPanel>
              <AnalyticsPanel title="Top positive churn drivers" sub="Features most often pushing risk upward in stored explanations" load={churnTopFeaturesLoad}>
                {(data) => <ShapFeatureList data={data} valueKey="avg_positive_shap" label="Avg. positive SHAP" />}
              </AnalyticsPanel>
              <AnalyticsPanel title="Global feature importance" sub="Mean absolute SHAP contribution across stored predictions" load={churnImportanceLoad}>
                {(data) => <ShapFeatureList data={data} valueKey="mean_abs_shap" label="Mean |SHAP|" />}
              </AnalyticsPanel>
              <AnalyticsPanel title="Pipeline tables" sub="Availability and row counts for required analytics tables" load={tableStatusesLoad}>
                {(data) => <PipelineTables data={data} />}
              </AnalyticsPanel>
            </div>
            <PredictCustomer />
          </section>
        )}

        {view === "advanced" && (
          <section className="analyticsPageSection" aria-labelledby="model-evaluation-heading">
            <h2 id="model-evaluation-heading">Model evaluation and feature behavior</h2>
            <div className="grid2">
              <AnalyticsPanel title="Model test performance" sub="Reported metrics for the evaluated test split" load={analyticsService.modelPerformance}>
                {(data) => <Performance data={data} />}
              </AnalyticsPanel>
              <AnalyticsPanel title="Model comparison" sub="Comparison of logistic regression and LightGBM reports" load={analyticsService.modelComparison}>
                {(data) => <ModelComparison data={data} />}
              </AnalyticsPanel>
              <AnalyticsPanel title="Operating thresholds" sub="Best reported thresholds and associated scores" load={analyticsService.modelThresholds}>
                {(data) => <ThresholdAnalysis data={data} />}
              </AnalyticsPanel>
              <AnalyticsPanel title="Class-imbalance experiments" sub="Reported performance across imbalance strategies" load={analyticsService.modelImbalanceExperiments}>
                {(data) => <ImbalanceExperiments data={data} />}
              </AnalyticsPanel>
              <AnalyticsPanel title="Feature statistics" sub="Descriptive statistics and missing values for model features" load={featuresLoad}>
                {(data) => <FeatureStatistics data={data} feature={feature} setFeature={setFeature} />}
              </AnalyticsPanel>
            </div>
            <FeatureAnalysis feature={feature} setFeature={setFeature} />
          </section>
        )}

        {view === "all" && (
          <>
            <section className="analyticsPageSection" aria-labelledby="model-churn-heading">
              <h2 id="model-churn-heading">Stored churn predictions</h2>
              <div className="grid2">
                <AnalyticsPanel title="Churn overview" sub="Risk volume based on stored customer predictions" load={churnSummaryLoad}>
                  {(data) => <ChurnSummary data={data} />}
                </AnalyticsPanel>
                <AnalyticsPanel title="Prediction refresh" sub="Most recent batch score and prediction distribution" load={churnRefreshLoad}>
                  {(data) => <p className="analyticsMeta modelRefreshTimestamp">{data.last_refreshed_at || "No stored prediction refresh is available."}</p>}
                </AnalyticsPanel>
                <AnalyticsPanel title="Churn probability distribution" sub="Stored customer scores grouped into probability ranges" load={churnDistributionLoad}>
                  {(data) => <ProbabilityDistribution data={data} />}
                </AnalyticsPanel>
                <AnalyticsPanel title="Reason-code summary" sub="Most frequently recorded explanations for churn predictions" load={reasonCodesLoad}>
                  {(data) => <ReasonCodeSummary data={data} />}
                </AnalyticsPanel>
                <AnalyticsPanel title="Top positive churn drivers" sub="Features most often pushing risk upward in stored explanations" load={churnTopFeaturesLoad}>
                  {(data) => <ShapFeatureList data={data} valueKey="avg_positive_shap" label="Avg. positive SHAP" />}
                </AnalyticsPanel>
                <AnalyticsPanel title="Global feature importance" sub="Mean absolute SHAP contribution across stored predictions" load={churnImportanceLoad}>
                  {(data) => <ShapFeatureList data={data} valueKey="mean_abs_shap" label="Mean |SHAP|" />}
                </AnalyticsPanel>
                <AnalyticsPanel title="Pipeline tables" sub="Availability and row counts for required analytics tables" load={tableStatusesLoad}>
                  {(data) => <PipelineTables data={data} />}
                </AnalyticsPanel>
              </div>
              <PredictCustomer />
            </section>

            <section className="analyticsPageSection" aria-labelledby="model-evaluation-heading">
              <h2 id="model-evaluation-heading">Model evaluation and feature behavior</h2>
              <div className="grid2">
                <AnalyticsPanel title="Model test performance" sub="Reported metrics for the evaluated test split" load={analyticsService.modelPerformance}>
                  {(data) => <Performance data={data} />}
                </AnalyticsPanel>
                <AnalyticsPanel title="Model comparison" sub="Comparison of logistic regression and LightGBM reports" load={analyticsService.modelComparison}>
                  {(data) => <ModelComparison data={data} />}
                </AnalyticsPanel>
                <AnalyticsPanel title="Operating thresholds" sub="Best reported thresholds and associated scores" load={analyticsService.modelThresholds}>
                  {(data) => <ThresholdAnalysis data={data} />}
                </AnalyticsPanel>
                <AnalyticsPanel title="Class-imbalance experiments" sub="Reported performance across imbalance strategies" load={analyticsService.modelImbalanceExperiments}>
                  {(data) => <ImbalanceExperiments data={data} />}
                </AnalyticsPanel>
                <AnalyticsPanel title="Feature statistics" sub="Descriptive statistics and missing values for model features" load={featuresLoad}>
                  {(data) => <FeatureStatistics data={data} feature={feature} setFeature={setFeature} />}
                </AnalyticsPanel>
              </div>
              <FeatureAnalysis feature={feature} setFeature={setFeature} />
            </section>
          </>
        )}
      </div>
    </Page>
  );
}
