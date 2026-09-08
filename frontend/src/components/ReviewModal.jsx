/**
 * ================================================================================
 * ADD / EDIT REVIEW MODAL DIALOG (components/ReviewModal.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This is the star rating and feedback popup. Administrators can submit or edit 
 * a 1-to-5 star rating, headline title, and detailed written review for an order.
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - "Add Review" button on the customer profile page (`Customer.jsx`).
 * - "Edit" button on individual reviews in the Customer Reviews tab.
 * ================================================================================
 */

import React, { useState } from "react";
import { MessageSquarePlus, Star, X } from "lucide-react";

const MIN_DATE = "2016-09-01";
const MAX_DATE = "2018-10-31";

export default function ReviewModal({ review, orders = [], existingReviews = [], close, save }) {
  const isEdit = Boolean(review);

  const toDateInput = (val) => {
    if (!val) return "";
    try {
      return new Date(val).toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const defaultDateStr = "2018-06-15";

  // Filter available orders when creating: only allow orders without existing reviews
  const reviewedOrderIds = existingReviews
    .filter((r) => r.review_id !== review?.review_id)
    .map((r) => r.order_id)
    .filter(Boolean);

  const availableOrders = isEdit
    ? orders
    : orders.filter((o) => !reviewedOrderIds.includes(o.order_id));

  const [form, setForm] = useState(
    review
      ? {
          review_score: review.review_score || 5,
          review_comment_title: review.review_comment_title || "",
          review_comment_message: review.review_comment_message || "",
          order_id: review.order_id || (availableOrders[0]?.order_id || ""),
          review_creation_date: toDateInput(review.review_creation_date) || defaultDateStr,
        }
      : {
          review_score: 5,
          review_comment_title: "",
          review_comment_message: "",
          order_id: availableOrders[0]?.order_id || "",
          review_creation_date: defaultDateStr,
        }
  );

  const [hoverScore, setHoverScore] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (field, value) => {
    setForm((curr) => ({ ...curr, [field]: value }));
    setError("");
  };

  async function submit(event) {
    event.preventDefault();

    if (!form.review_score || form.review_score < 1 || form.review_score > 5) {
      setError("Please select a rating between 1 and 5 stars.");
      return;
    }

    // Find purchase date of selected order
    const selectedOrder = orders.find((o) => o.order_id === form.order_id) || orders[0];
    const orderPurchaseDate = selectedOrder?.order_purchase_timestamp
      ? toDateInput(selectedOrder.order_purchase_timestamp)
      : null;

    if (orderPurchaseDate && form.review_creation_date < orderPurchaseDate) {
      setError(
        `Review date cannot be earlier than the order purchase date (${new Date(selectedOrder.order_purchase_timestamp).toLocaleDateString()}).`
      );
      return;
    }

    setBusy(true);
    try {
      await save({
        review_score: form.review_score,
        review_comment_title: form.review_comment_title.trim(),
        review_comment_message: form.review_comment_message.trim(),
        order_id: form.order_id || undefined,
        review_creation_date: form.review_creation_date
          ? `${form.review_creation_date}T12:00:00`
          : null,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modalBg">
      <form className="modal reviewModal" onSubmit={submit}>
        <button type="button" className="close" onClick={close}>
          <X size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#fef3c7",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MessageSquarePlus size={20} />
          </div>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>CUSTOMER FEEDBACK</p>
            <h2 style={{ margin: 0, fontSize: 19 }}>
              {isEdit ? "Edit Review" : "Add Customer Review"}
            </h2>
          </div>
        </div>

        <p className="filterHint" style={{ marginBottom: 16 }}>
          {isEdit
            ? "Modify customer rating score, feedback comments, or review date."
            : "Record verified customer sentiment and feedback for an order."}
        </p>

        {/* Star Rating Picker */}
        <label>
          Rating Score
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverScore || form.review_score) >= star;
              return (
                <button
                  type="button"
                  key={star}
                  onClick={() => update("review_score", star)}
                  onMouseEnter={() => setHoverScore(star)}
                  onMouseLeave={() => setHoverScore(0)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    fontSize: 24,
                    color: active ? "#eab308" : "#cbd5e1",
                    transition: "transform 0.15s ease",
                  }}
                >
                  ★
                </button>
              );
            })}
            <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginLeft: 6 }}>
              {form.review_score} / 5 Stars
            </span>
          </div>
        </label>

        {/* Associated Order */}
        {availableOrders.length > 1 && (
          <label>
            Associated Order
            <select
              value={form.order_id}
              onChange={(e) => update("order_id", e.target.value)}
            >
              {availableOrders.map((o) => (
                <option key={o.order_id} value={o.order_id}>
                  Order #{o.order_id.slice(0, 10)}… (R$ {Number(o.order_value).toFixed(2)})
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Review Title */}
        <label>
          Review Title / Headline
          <input
            value={form.review_comment_title}
            onChange={(e) => update("review_comment_title", e.target.value)}
            placeholder="e.g. Ótimo produto, Entrega rápida..."
          />
        </label>

        {/* Review Comment Message */}
        <label>
          Customer Feedback / Message
          <textarea
            rows={3}
            value={form.review_comment_message}
            onChange={(e) => update("review_comment_message", e.target.value)}
            placeholder="Enter customer feedback or review comment..."
          />
        </label>

        {/* Review Creation Date */}
        <label>
          Review Date
          <input
            type="date"
            min={
              orders.find((o) => o.order_id === form.order_id)?.order_purchase_timestamp
                ? toDateInput(orders.find((o) => o.order_id === form.order_id).order_purchase_timestamp)
                : MIN_DATE
            }
            max={MAX_DATE}
            value={form.review_creation_date}
            onChange={(e) => update("review_creation_date", e.target.value)}
            required
          />
          <small style={{ fontSize: 11, color: "#64748b" }}>
            Must be on or after the order purchase date
          </small>
        </label>

        {error && <div className="apiError">{error}</div>}

        <div className="actions" style={{ marginTop: 16 }}>
          <button type="button" className="btn secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? "Saving Review..." : isEdit ? "Save Changes" : "Submit Review"}
          </button>
        </div>
      </form>
    </div>
  );
}
