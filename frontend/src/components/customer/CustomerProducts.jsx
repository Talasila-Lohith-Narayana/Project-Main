import React from "react";
import { Panel } from "../States";
import DataTable from "../DataTable";

export default function CustomerProducts({ items }) {
  const columns = [
    {
      header: "Product ID",
      accessorKey: "product_id",
      cell: ({ row }) => (
        <span title={row.original.product_id || ""} className="truncated-id" style={{ fontWeight: 600, maxWidth: 120 }}>
          {row.original.product_id || "—"}
        </span>
      ),
    },
    { header: "Category", accessorKey: "category", cell: ({ row }) => <em>{row.original.category?.replace(/_/g, " ")}</em> },
    { header: "Price", accessorKey: "price", cell: ({ row }) => `R$ ${Number(row.original.price || 0).toFixed(2)}` },
    { header: "Freight", accessorKey: "freight_value", cell: ({ row }) => `R$ ${Number(row.original.freight_value || 0).toFixed(2)}` },
    {
      header: "Order",
      accessorKey: "order_id",
      cell: ({ row }) => (
        <span title={row.original.order_id || ""} className="truncated-id" style={{ maxWidth: 120 }}>
          {row.original.order_id || "—"}
        </span>
      ),
    },
    {
      header: "Date",
      accessorKey: "order_purchase_timestamp",
      cell: ({ row }) => row.original.order_purchase_timestamp
        ? new Date(row.original.order_purchase_timestamp).toLocaleDateString()
        : "—",
    },
  ];

  return (
    <Panel title="Purchased products" sub="Items bought by this customer">
      {items && items.length ? (
        <div className="table">
          <DataTable columns={columns} data={items} />
        </div>
      ) : (
        <div className="state">No products found.</div>
      )}
    </Panel>
  );
}
