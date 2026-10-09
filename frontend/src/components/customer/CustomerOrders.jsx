import React, { useMemo, useState } from "react";
import { Edit2, PackagePlus, Trash2 } from "lucide-react";
import { Panel } from "../States";
import { PAYMENT_ICONS } from "./CustomerOverview";
import DataTable from "../DataTable";

export default function CustomerOrders({
  items,
  onAddOrder,
  onEditOrder,
  onBulkDelete,
  isAdmin,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const orderIds = useMemo(() => (items || []).map((item) => item.order_id), [items]);
  const allSelected = orderIds.length > 0 && orderIds.every((id) => selectedIds.includes(id));

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : orderIds);
  };

  const toggleOrder = (orderId) => {
    setSelectedIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  };

  const columns = [
    ...(isAdmin ? [{
      id: "select",
      header: () => <input type="checkbox" aria-label="Select all orders" checked={allSelected} onChange={toggleAll} />,
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label={`Select order ${row.original.order_id}`}
          checked={selectedIds.includes(row.original.order_id)}
          onChange={() => toggleOrder(row.original.order_id)}
        />
      ),
    }] : []),
    {
      header: "Order",
      accessorKey: "order_id",
      cell: ({ row }) => <code title={row.original.order_id} className="truncated-id" style={{ fontSize: 12, maxWidth: 120 }}>{row.original.order_id}</code>,
    },
    { header: "Status", accessorKey: "order_status", cell: ({ row }) => <em style={{ textTransform: "capitalize" }}>{row.original.order_status}</em> },
    {
      header: "Payment Type",
      accessorKey: "payment_type",
      cell: ({ row }) => {
        const pType = row.original.payment_type || "—";
        const installments = row.original.installments > 1 ? ` (${row.original.installments}x)` : "";
        return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, textTransform: "capitalize" }}><span>{PAYMENT_ICONS[pType] || "💳"}</span><span>{pType.replace(/_/g, " ")}{installments}</span></span>;
      },
    },
    { header: "Purchased", accessorKey: "order_purchase_timestamp", cell: ({ row }) => new Date(row.original.order_purchase_timestamp).toLocaleDateString() },
    { header: "Delivered", accessorKey: "order_delivered_customer_date", cell: ({ row }) => row.original.order_delivered_customer_date ? new Date(row.original.order_delivered_customer_date).toLocaleDateString() : "—" },
    { header: "Value", accessorKey: "order_value", cell: ({ row }) => `R$ ${Number(row.original.order_value).toFixed(2)}` },
    ...(isAdmin ? [{
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <button className="btn ghost" onClick={() => onEditOrder(row.original)} style={{ padding: "4px 8px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }} title="Edit order details"><Edit2 size={13} /> Edit</button>,
    }] : []),
  ];

  return (
    <Panel
      title="Order history"
      sub="Latest customer orders"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        {isAdmin && selectedIds.length > 0 ? (
          <button
            className="btn ghost"
            onClick={() => onBulkDelete(selectedIds, () => setSelectedIds([]))}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#dc2626", fontSize: 13, padding: "7px 14px" }}
          >
            <Trash2 size={15} /> Delete {selectedIds.length} selected
          </button>
        ) : <span />}
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
          <DataTable columns={columns} data={items} />
        </div>
      ) : (
        <div className="state">No orders yet. Click "Add order" above to record the customer's first purchase.</div>
      )}
    </Panel>
  );
}
