import React from "react";
import { Panel } from "../States";

export default function CustomerProducts({ items }) {
  return (
    <Panel title="Purchased products" sub="Items bought by this customer">
      {items && items.length ? (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Category</th>
                <th>Price</th>
                <th>Freight</th>
                <th>Order</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.order_id}-${item.product_id}-${index}`}>
                  <td>
                    <span
                      title={item.product_id || ""}
                      className="truncated-id"
                      style={{ fontWeight: 600, maxWidth: 120 }}
                    >
                      {item.product_id || "—"}
                    </span>
                  </td>
                  <td>
                    <em>{item.category?.replace(/_/g, " ")}</em>
                  </td>
                  <td>R$ {Number(item.price || 0).toFixed(2)}</td>
                  <td>R$ {Number(item.freight_value || 0).toFixed(2)}</td>
                  <td>
                    <span
                      title={item.order_id || ""}
                      className="truncated-id"
                      style={{ maxWidth: 120 }}
                    >
                      {item.order_id || "—"}
                    </span>
                  </td>
                  <td>
                    {item.order_purchase_timestamp
                      ? new Date(item.order_purchase_timestamp).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="state">No products found.</div>
      )}
    </Panel>
  );
}
