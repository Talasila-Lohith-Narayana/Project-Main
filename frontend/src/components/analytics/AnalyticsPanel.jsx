import React, { useEffect, useState } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { LoadingState, Panel } from "../States";

export default function AnalyticsPanel({ title, sub, load, children }) {
  const [result, setResult] = useState({ status: "loading", data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setResult({ status: "loading", data: null });
    load()
      .then((data) => {
        if (active) setResult({ status: "success", data });
      })
      .catch((error) => {
        if (active) setResult({ status: "error", error });
      });
    return () => {
      active = false;
    };
  }, [attempt, load]);

  return (
    <Panel title={title} sub={sub}>
      {result.status === "loading" && <LoadingState text="Loading analytics..." />}
      {result.status === "error" && (
        <div className="analyticsPanelError" role="alert">
          <AlertTriangle size={16} />
          <span>{result.error?.message || "Could not load this analytics data."}</span>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setAttempt((value) => value + 1)}
            aria-label={`Retry ${title}`}
          >
            <RotateCw size={14} />
            Retry
          </button>
        </div>
      )}
      {result.status === "success" && children(result.data)}
    </Panel>
  );
}
