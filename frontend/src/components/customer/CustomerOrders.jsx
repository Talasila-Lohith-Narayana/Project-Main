import React from "react";
import { Edit2, PackagePlus } from "lucide-react";
import { Panel } from "../States";
import { PAYMENT_ICONS } from "./CustomerOverview";

export default function CustomerOrders({ items, onAddOrder, onEditOrder, isAdmin }) {
  return (
    <Panel
      title="Order history"
      sub="Latest customer orders"
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        {isAdmin && (
          <button
            className="btn primary"
            onClick={onAddOrder}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "7px 14px" }}
          >
            <PackagePlus size={16} /> Add order
          </button>
        )}
      </div>
      {items && items.length ? (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Payment Type</th>
                <th>Purchased</th>
                <th>Delivered</th>
                <th>Value</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const pType = item.payment_type || "—";
                const pIcon = PAYMENT_ICONS[pType] || "💳";
                const installments = item.installments > 1 ? ` (${item.installments}x)` : "";
                return (
                  <tr key={item.order_id}>
                    <td>
                      <code
                        title={item.order_id}
                        className="truncated-id"
                        style={{ fontSize: 12, maxWidth: 120 }}
                      >
                        {item.order_id}
                      </code>
                    </td>
                    <td>
                      <em style={{ textTransform: "capitalize" }}>{item.order_status}</em>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, textTransform: "capitalize" }}>
                        <span>{pIcon}</span>
                        <span>{pType.replace(/_/g, " ")}{installments}</span>
                      </span>
                    </td>
                    <td>
                      {new Date(
                        item.order_purchase_timestamp,
                      ).toLocaleDateString()}
                    </td>
                    <td>
                      {item.order_delivered_customer_date
                        ? new Date(
                          item.order_delivered_customer_date,
                        ).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>R$ {Number(item.order_value).toFixed(2)}</td>
                    {isAdmin && (
                      <td>
                        <button
                          className="btn ghost"
                          onClick={() => onEditOrder(item)}
                          style={{ padding: "4px 8px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                          title="Edit order details"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="state">No orders yet. Click "Add order" above to record the customer's first purchase.</div>
      )}
    </Panel>
  );
}
