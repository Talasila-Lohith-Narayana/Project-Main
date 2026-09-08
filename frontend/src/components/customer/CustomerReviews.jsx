import React from "react";
import { Edit2, MessageSquarePlus } from "lucide-react";
import { Panel } from "../States";

export default function CustomerReviews({ items = [], orders = [], onAddReview, onEditReview, isAdmin }) {
  const hasOrders = orders.length > 0;
  // Identify orders that do not have any attached review yet
  const reviewedOrderIds = items.map((r) => r.order_id).filter(Boolean);
  const unreviewedOrders = orders.filter((o) => !reviewedOrderIds.includes(o.order_id));
  const allOrdersReviewed = hasOrders && unreviewedOrders.length === 0;

  return (
    <Panel
      title="Customer reviews"
      sub="Ratings and feedback submitted by this customer"
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        {isAdmin && (
          <button
            className="btn primary"
            onClick={onAddReview}
            disabled={!hasOrders || allOrdersReviewed}
            title={
              !hasOrders
                ? "Customer must place an order before submitting a review"
                : allOrdersReviewed
                  ? "All orders by this customer have already been reviewed (1 review allowed per order)"
                  : "Add customer review"
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              padding: "7px 14px",
              opacity: !hasOrders || allOrdersReviewed ? 0.6 : 1,
              cursor: !hasOrders || allOrdersReviewed ? "not-allowed" : "pointer",
            }}
          >
            <MessageSquarePlus size={16} /> Add review
          </button>
        )}
      </div>
      {!hasOrders ? (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          ℹ️ Customer has no placed orders. An order must be placed before a review can be submitted.
        </div>
      ) : allOrdersReviewed ? (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          ✓ All customer orders have been reviewed. To modify feedback, click <b>Edit</b> on the review card below.
        </div>
      ) : null}
      <div className="reviews">
        {items.length ? (
          items.map((item) => (
            <div className="review" key={item.review_id} style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="stars">
                  {"★".repeat(item.review_score)}
                  <span>{"★".repeat(5 - item.review_score)}</span>
                </div>
                {isAdmin && (
                  <button
                    className="btn ghost"
                    onClick={() => onEditReview(item)}
                    style={{ padding: "3px 8px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                    title="Edit review"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                )}
              </div>
              <b>{item.review_comment_title || "Customer review"}</b>
              <p>{item.review_comment_message || "No written comment."}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <small style={{ color: "#64748b", fontSize: 11 }}>
                  {item.order_id ? `Order #${item.order_id.slice(0, 10)}… · ` : ""}
                  {new Date(item.review_creation_date).toLocaleDateString()}
                </small>
              </div>
            </div>
          ))
        ) : (
          <div className="state">No reviews yet. {hasOrders ? 'Click "Add review" above to record customer feedback.' : ''}</div>
        )}
      </div>
    </Panel>
  );
}
