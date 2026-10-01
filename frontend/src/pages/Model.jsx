import React, { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import AnalyticsPanel from "../components/analytics/AnalyticsPanel";
import { Page, Panel } from "../components/States";
import { analyticsService } from "../services/api";

const number = new Intl.NumberFormat("en-US");
const featureLabel = (feature) => feature.replaceAll("_", " ");
const percent = (value) => value == null ? "Unavailable" : `${(Number(value) * 100).toFixed(1)}%`;
const formatRefreshTimestamp = (value) => {
  if (!value) return "No stored prediction refresh is available.";
  const date = new Date(value.includes(" ") ? value.replace(" ", "T") : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};
const churnSummaryLoad = () => analyticsService.churnSummary();
const churnTopFeaturesLoad = () => analyticsService.churnTopFeatures({ limit: 10 });
const churnImportanceLoad = () => analyticsService.churnFeatureImportance({ limit: 15 });
const churnRefreshLoad = () => analyticsService.churnLastRefresh();
const churnDistributionLoad = () => analyticsService.churnProbabilityDistribution();
const reasonCodesLoad = () => analyticsService.churnReasonCodeSummary();

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
            <td>{strategy.churn_precision == null ? "—" : percent(strategy.churn_precision)}</td>
            <td>{strategy.pr_auc == null ? "—" : Number(strategy.pr_auc).toFixed(4)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
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

export default function Model() {
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
            <span className="modelSummaryLabel">Monitoring</span>
            <strong>Current behavior</strong>
          </div>
          <div className="modelSummaryCard">
            <span className="modelSummaryLabel">Diagnostics</span>
            <strong>Model evaluation</strong>
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
                {(data) => <p className="analyticsMeta modelRefreshTimestamp">{formatRefreshTimestamp(data.last_refreshed_at)}</p>}
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
            </div>
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
              <AnalyticsPanel title="Class-imbalance experiments" sub="Reported performance across imbalance strategies" load={analyticsService.modelImbalanceExperiments}>
                {(data) => <ImbalanceExperiments data={data} />}
              </AnalyticsPanel>
            </div>
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
                  {(data) => <p className="analyticsMeta modelRefreshTimestamp">{formatRefreshTimestamp(data.last_refreshed_at)}</p>}
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
              </div>
            </section>
            <section className="analyticsPageSection" aria-labelledby="model-evaluation-heading">              <h2 id="model-evaluation-heading">Model evaluation and feature behavior</h2>
              <div className="grid2">
                <AnalyticsPanel title="Model test performance" sub="Reported metrics for the evaluated test split" load={analyticsService.modelPerformance}>
                  {(data) => <Performance data={data} />}
                </AnalyticsPanel>
                <AnalyticsPanel title="Model comparison" sub="Comparison of logistic regression and LightGBM reports" load={analyticsService.modelComparison}>
                  {(data) => <ModelComparison data={data} />}
                </AnalyticsPanel>
                <AnalyticsPanel title="Class-imbalance experiments" sub="Reported performance across imbalance strategies" load={analyticsService.modelImbalanceExperiments}>
                  {(data) => <ImbalanceExperiments data={data} />}
                </AnalyticsPanel>
              </div>
            </section>
          </>
        )}
      </div>
    </Page>
  );
}
