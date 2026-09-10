/**
 * ================================================================================
 * CUSTOMER DIRECTORY FILTER MODAL (components/FilterModal.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This is the advanced filter popup for the Customers directory. It allows filtering
 * customers by State (e.g. SP, RJ), Segment (Champions, Engaged, At Risk, New),
 * Activity status (has orders vs no orders), Minimum spend, and Star ratings.
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - "Filters" button on the Customers directory page (`Customers.jsx`).
 * ================================================================================
 */

import React, { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

export default function FilterModal({
  values,
  states,
  segments,
  activityOptions,
  close,
  apply,
}) {
  // Local draft state for filters before user clicks "Apply"
  const [draft, setDraft] = useState({
    ...values,
    ratings: values.ratings || [],
    churnRisk: values.churnRisk || [],
  });

  // Helper to update a single draft filter field
  const update = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }));

  /**
   * Toggles inclusion of a star rating filter (1 to 5 stars) in multi-selection array
   */
  const toggleRating = (score) => {
    setDraft((current) => {
      const activeList = current.ratings || [];
      const exists = activeList.includes(score);
      const nextRatings = exists
        ? activeList.filter((s) => s !== score)
        : [...activeList, score];
      return { ...current, ratings: nextRatings };
    });
  };

  /**
   * Toggles a churn risk level in the multi-select array
   */
  const toggleChurnRisk = (level) => {
    setDraft((current) => {
      const activeList = current.churnRisk || [];
      const exists = activeList.includes(level);
      const nextList = exists
        ? activeList.filter((l) => l !== level)
        : [...activeList, level];
      return { ...current, churnRisk: nextList };
    });
  };

  /**
   * Resets all filter fields in the modal back to their empty default values
   */
  const clear = () =>
    setDraft({
      state: "",
      segment: "",
      activity: "",
      ratings: [],
      churnRisk: [],
      maxRecency: "",
      minSpend: "",
      minOrders: "",
    });

  return (
    <div className="modalBg">
      <form
        className="modal filterModal"
        onSubmit={(event) => {
          event.preventDefault();
          apply(draft);
        }}
      >
        <button type="button" className="close" onClick={close}>
          <X size={18} />
        </button>
        <div className="filterModalTitle">
          <div className="filterIcon">
            <SlidersHorizontal size={18} />
          </div>
          <div>
            <p className="eyebrow">CUSTOMER DIRECTORY</p>
            <h2>Filter customers</h2>
          </div>
        </div>
        <p className="filterHint">
          Refine the directory by location, behavior, and customer value.
        </p>
        <div className="filterModalGrid">
          <div className="filterField">
            <label htmlFor="modal-state-filter">State (Type or Select)</label>
            <input
              id="modal-state-filter"
              list="filter-states-list"
              value={draft.state}
              onChange={(event) => update("state", event.target.value.toUpperCase())}
              placeholder="e.g. SP, RJ, MG..."
              maxLength={2}
              style={{ textTransform: "uppercase" }}
            />
            <datalist id="filter-states-list">
              <option value="">All states</option>
              {states.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </datalist>
          </div>
          <div className="filterField">
            <label htmlFor="modal-segment-filter">Segment</label>
            <select
              id="modal-segment-filter"
              value={draft.segment}
              onChange={(event) => update("segment", event.target.value)}
            >
              {segments.map((segment) => (
                <option key={segment} value={segment}>
                  {segment || "All segments"}
                </option>
              ))}
            </select>
          </div>
          <div className="filterField">
            <label htmlFor="modal-activity-filter">Activity</label>
            <select
              id="modal-activity-filter"
              value={draft.activity}
              onChange={(event) => update("activity", event.target.value)}
            >
              {activityOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="filterField">
            <label htmlFor="modal-recency-filter">Recency up to</label>
            <input
              id="modal-recency-filter"
              type="number"
              min="0"
              value={draft.maxRecency}
              onChange={(event) => update("maxRecency", event.target.value)}
              placeholder="Days"
            />
          </div>
          <div className="filterField">
            <label htmlFor="modal-spend-filter">Minimum spend</label>
            <input
              id="modal-spend-filter"
              type="number"
              min="0"
              step="0.01"
              value={draft.minSpend}
              onChange={(event) => update("minSpend", event.target.value)}
              placeholder="R$ amount"
            />
          </div>
          <div className="filterField">
            <label htmlFor="modal-orders-filter">Minimum orders</label>
            <input
              id="modal-orders-filter"
              type="number"
              min="0"
              step="1"
              value={draft.minOrders}
              onChange={(event) => update("minOrders", event.target.value)}
              placeholder="Order count"
            />
          </div>
          <div className="filterField fullWidth">
            <label>Rating (Select multiple)</label>
            <div className="ratingPills">
              {[
                { score: "5", label: "5 stars" },
                { score: "4", label: "4 stars" },
                { score: "3", label: "3 stars" },
                { score: "2", label: "2 stars" },
                { score: "1", label: "1 star" },
              ].map(({ score, label }) => {
                const isSelected = (draft.ratings || []).includes(score);
                return (
                  <button
                    key={score}
                    type="button"
                    className={`ratingPill ${isSelected ? "active" : ""}`}
                    onClick={() => toggleRating(score)}
                  >
                    <span className="ratingStarIcon">★</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="filterField fullWidth">
            <label>Churn Risk (Select multiple)</label>
            <div className="ratingPills">
              {[
                { level: "high", label: "🔴 High Risk", cls: "high" },
                { level: "medium", label: "🟡 Medium Risk", cls: "medium" },
                { level: "low", label: "🟢 Low Risk", cls: "low" },
              ].map(({ level, label, cls }) => {
                const isSelected = (draft.churnRisk || []).includes(level);
                return (
                  <button
                    key={level}
                    type="button"
                    className={`ratingPill ${isSelected ? "active" : ""}`}
                    onClick={() => toggleChurnRisk(level)}
                    style={{
                      borderColor: isSelected
                        ? (cls === "high" ? "#f43f5e" : cls === "medium" ? "#f59e0b" : "#10b981")
                        : undefined,
                    }}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="actions filterModalActions">
          <button type="button" className="btn ghost" onClick={clear}>
            Clear all
          </button>
          <span />
          <button type="button" className="btn secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn primary">Apply filters</button>
        </div>
      </form>
    </div>
  );
}

