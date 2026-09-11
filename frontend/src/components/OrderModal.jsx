/**
 * ================================================================================
 * ADD / EDIT ORDER MODAL DIALOG (components/OrderModal.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This is the interactive shopping order popup. Administrators can add multi-item
 * purchases with category suggestions, item prices (R$), shipping costs, payment methods
 * (Credit Card, Boleto, Voucher, Debit Card), installment plans (1x-12x), and order dates.
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - "Add Order" button on the customer profile page (`Customer.jsx`).
 * - "Edit" button on individual order rows inside the Order History table.
 * ================================================================================
 */

import React, { useEffect, useState } from "react";
import { Package, PackagePlus, Plus, Trash2, X } from "lucide-react";
import { productsService } from "../services/api";
import ConfirmModal from "./ConfirmModal";

const TOP_CATEGORIES = [
  "cama_mesa_banho",
  "beleza_saude",
  "esporte_lazer",
  "moveis_decoracao",
  "informatica_acessorios",
  "utilidades_domesticas",
  "relogios_presentes",
  "telefonia",
  "automotivo",
  "brinquedos",
  "cool_stuff",
  "ferramentas_jardim",
  "perfumaria",
  "bebes",
  "eletronicos",
  "papelaria",
  "fashion_bolsas_e_acessorios",
  "pet_shop",
];

const PAYMENT_METHODS = [
  { value: "credit_card", label: "Credit Card", icon: "💳" },
  { value: "boleto", label: "Boleto Bancário", icon: "📄" },
  { value: "voucher", label: "Voucher / Gift Card", icon: "🎟️" },
  { value: "debit_card", label: "Debit Card", icon: "🏧" },
];

const MIN_DATE = "2016-09-01";
const MAX_DATE = "2018-10-31";

export default function OrderModal({ order, close, save, onDelete }) {
  // Helper to format ISO date string to YYYY-MM-DD for <input type="date">
  const toDateInput = (val) => {
    if (!val) return "";
    try {
      return new Date(val).toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  // Default initial date within the dataset timeline (e.g. 2018-06-15)
  const defaultDateStr = "2018-06-15";

  // Initialize items (support single or multiple items)
  const initialItems = order?.items?.length
    ? order.items.map((it) => ({
        product_category: it.product_category || "beleza_saude",
        product_id: it.product_id || "",
        price: it.price != null ? String(it.price) : "50.00",
        freight_value: it.freight_value != null ? String(it.freight_value) : "15.00",
      }))
    : [
        {
          product_category: order?.product_category || "beleza_saude",
          product_id: order?.product_id || "",
          price: order?.price != null ? String(order.price) : "",
          freight_value: order?.freight_value != null ? String(order.freight_value) : "15.00",
        },
      ];

  const [items, setItems] = useState(initialItems);
  const [categoryProducts, setCategoryProducts] = useState({});

  const [form, setForm] = useState(
    order
      ? {
          payment_type: (order.payment_type || "credit_card").toLowerCase().split(",")[0].trim(),
          payment_installments: String(order.installments || 1),
          order_status: order.order_status || "delivered",
          order_purchase_timestamp: toDateInput(order.order_purchase_timestamp) || defaultDateStr,
          order_delivered_customer_date: toDateInput(order.order_delivered_customer_date),
        }
      : {
          payment_type: "credit_card",
          payment_installments: "1",
          order_status: "delivered",
          order_purchase_timestamp: defaultDateStr,
          order_delivered_customer_date: "",
        }
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEdit = Boolean(order);

  // Fetch product IDs for distinct categories whenever items category changes
  useEffect(() => {
    let isMounted = true;
    const categoriesToFetch = Array.from(
      new Set(items.map((it) => it.product_category?.trim().toLowerCase()).filter(Boolean))
    );

    categoriesToFetch.forEach((cat) => {
      if (!categoryProducts[cat]) {
        productsService
          .byCategory(cat, 60)
          .then((res) => {
            if (isMounted) {
              setCategoryProducts((prev) => ({
                ...prev,
                [cat]: res.items || [],
              }));
            }
          })
          .catch(() => {});
      }
    });

    return () => {
      isMounted = false;
    };
  }, [items]);

  const update = (field, value) => {
    setForm((curr) => ({ ...curr, [field]: value }));
    setError("");
  };

  // Item list helpers
  const addItem = () => {
    setItems((curr) => [
      ...curr,
      { product_category: "informatica_acessorios", product_id: "", price: "", freight_value: "15.00" },
    ]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems((curr) => curr.filter((_, idx) => idx !== index));
  };

  const updateItem = (index, field, value) => {
    setItems((curr) => {
      const next = [...curr];
      next[index] = { ...next[index], [field]: value };
      
      // If user selected a specific product ID, optionally autofill suggested price if empty
      if (field === "product_id" && value) {
        const cat = next[index].product_category?.trim().toLowerCase();
        const found = categoryProducts[cat]?.find((p) => p.product_id === value);
        if (found && (!next[index].price || next[index].price === "")) {
          next[index].price = found.avg_price ? String(found.avg_price.toFixed(2)) : "50.00";
        }
      }
      
      // If user changes category, clear out previous mismatched product_id
      if (field === "product_category") {
        next[index].product_id = "";
      }

      return next;
    });
    setError("");
  };

  const totalItemPrice = items.reduce((acc, it) => acc + (parseFloat(it.price) || 0), 0);
  const totalFreight = items.reduce((acc, it) => acc + (parseFloat(it.freight_value) || 0), 0);
  const totalOrderValue = totalItemPrice + totalFreight;

  async function submit(event) {
    event.preventDefault();

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const p = parseFloat(item.price);
      const f = parseFloat(item.freight_value);
      if (!item.product_category || !item.product_category.trim()) {
        setError(`Please select a product category for item #${i + 1}.`);
        return;
      }
      if (isNaN(p) || p <= 0) {
        setError(`Please enter a valid price greater than R$ 0.00 for item #${i + 1}.`);
        return;
      }
      if (isNaN(f) || f < 0) {
        setError(`Please enter a valid freight value for item #${i + 1}.`);
        return;
      }
    }

    if (!form.order_purchase_timestamp) {
      setError("Please select a purchase date.");
      return;
    }

    // Dataset Timeline Validation (2016-09 to 2018-10)
    if (
      form.order_purchase_timestamp < MIN_DATE ||
      form.order_purchase_timestamp > MAX_DATE
    ) {
      setError("Purchase date must be within the database timeline (Sep 2016 to Oct 2018).");
      return;
    }

    if (
      form.order_delivered_customer_date &&
      (form.order_delivered_customer_date < MIN_DATE ||
        form.order_delivered_customer_date > "2018-10-31")
    ) {
      setError("Delivery date must be within the database timeline (Sep 2016 to Oct 2018).");
      return;
    }

    if (
      form.order_delivered_customer_date &&
      form.order_delivered_customer_date < form.order_purchase_timestamp
    ) {
      setError("Delivery date cannot be earlier than the purchase date.");
      return;
    }

    const installments = parseInt(form.payment_installments, 10);
    if (isNaN(installments) || installments < 1 || installments > 24) {
      setError("Payment installments must be between 1 and 24.");
      return;
    }

    setBusy(true);
    try {
      await save({
        items: items.map((it) => ({
          product_category: it.product_category.trim(),
          product_id: it.product_id ? it.product_id.trim() : null,
          price: parseFloat(it.price) || 0,
          freight_value: parseFloat(it.freight_value) || 0,
        })),
        product_category: items[0].product_category.trim(),
        product_id: items[0].product_id ? items[0].product_id.trim() : null,
        price: totalItemPrice,
        freight_value: totalFreight,
        payment_type: form.payment_type,
        payment_installments: installments,
        order_status: form.order_status,
        order_purchase_timestamp: form.order_purchase_timestamp
          ? `${form.order_purchase_timestamp}T12:00:00`
          : null,
        order_delivered_customer_date: form.order_delivered_customer_date
          ? `${form.order_delivered_customer_date}T18:00:00`
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
      <form className="modal orderModal" onSubmit={submit}>
        <button type="button" className="close" onClick={close}>
          <X size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            className="orderModalHeaderIcon"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PackagePlus size={20} />
          </div>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>ORDER MANAGEMENT</p>
            <h2 style={{ margin: 0, fontSize: 19 }}>{isEdit ? "Edit Order" : "Place New Order"}</h2>
          </div>
        </div>

        <p className="filterHint" style={{ marginBottom: 16 }}>
          {isEdit
            ? "Update transaction details, status, or payment method for this order."
            : "Record a new verified transaction directly to this customer's account."}
        </p>

        {/* Product Items / Categories Section */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>
              Order Items & Categories ({items.length})
            </span>
            <button
              type="button"
              className="btn secondary"
              onClick={addItem}
              style={{ fontSize: 11, padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <Plus size={13} /> Add Another Category / Item
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "280px", overflowY: "auto", paddingRight: 4 }}>
            {items.map((item, idx) => {
              const catKey = item.product_category?.trim().toLowerCase();
              const availableProds = categoryProducts[catKey] || [];

              return (
                <div
                  key={idx}
                  className="orderItemRow"
                  style={{
                    background: "var(--bg-sub, #f8fafc)",
                    border: "1px solid var(--line, #e2e8f0)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                      ITEM #{idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: 11,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                        title="Remove this item"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "minmax(140px, 1.8fr) minmax(160px, 2.2fr) minmax(80px, 1fr) minmax(80px, 1fr)", gap: 8 }}>
                    <label style={{ margin: 0 }}>
                      <span style={{ fontSize: 11, display: "block", marginBottom: 2 }}>Category</span>
                      <input
                        list="product-categories-list"
                        value={item.product_category}
                        onChange={(e) => updateItem(idx, "product_category", e.target.value)}
                        placeholder="e.g. beleza_saude..."
                        style={{ fontSize: 12, padding: "6px 8px", width: "100%" }}
                        required
                      />
                    </label>

                    <label style={{ margin: 0 }}>
                      <span style={{ fontSize: 11, display: "block", marginBottom: 2 }}>
                        Product ID {availableProds.length > 0 ? `(${availableProds.length} available)` : "(Optional)"}
                      </span>
                      <input
                        list={`prod-ids-list-${idx}`}
                        value={item.product_id || ""}
                        onChange={(e) => updateItem(idx, "product_id", e.target.value)}
                        placeholder={availableProds.length > 0 ? "Select or enter product ID..." : "e.g. auto-assigned..."}
                        style={{ fontSize: 12, padding: "6px 8px", width: "100%", fontFamily: "monospace" }}
                      />
                      <datalist id={`prod-ids-list-${idx}`}>
                        {availableProds.map((p) => (
                          <option key={p.product_id} value={p.product_id}>
                            {p.product_id} (R$ {p.avg_price?.toFixed(2)})
                          </option>
                        ))}
                      </datalist>
                    </label>

                    <label style={{ margin: 0 }}>
                      <span style={{ fontSize: 11, display: "block", marginBottom: 2 }}>Price (R$)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(idx, "price", e.target.value)}
                        placeholder="99.90"
                        style={{ fontSize: 12, padding: "6px 8px", width: "100%" }}
                        required
                      />
                    </label>

                    <label style={{ margin: 0 }}>
                      <span style={{ fontSize: 11, display: "block", marginBottom: 2 }}>Freight (R$)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.00"
                        value={item.freight_value}
                        onChange={(e) => updateItem(idx, "freight_value", e.target.value)}
                        placeholder="15.00"
                        style={{ fontSize: 12, padding: "6px 8px", width: "100%" }}
                        required
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <datalist id="product-categories-list">
            {TOP_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, " ").toUpperCase()}
              </option>
            ))}
          </datalist>
        </div>

        {/* Total Calculated Banner */}
        <div
          className="orderTotalBanner"
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            padding: "10px 14px",
            borderRadius: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "4px 0 12px",
          }}
        >
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#166534", display: "block" }}>
              Total Order Value:
            </span>
            <small style={{ fontSize: 11, color: "#15803d" }}>
              Items: R$ {totalItemPrice.toFixed(2)} + Freight: R$ {totalFreight.toFixed(2)}
            </small>
          </div>
          <b style={{ fontSize: 16, color: "#15803d", fontFamily: "Space Grotesk" }}>
            R$ {totalOrderValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </b>
        </div>

        {/* Payment Method & Installments */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <label>
            Payment Method
            <select
              value={form.payment_type}
              onChange={(e) => update("payment_type", e.target.value)}
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.value} value={pm.value}>
                  {pm.icon} {pm.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Installments
            <select
              value={form.payment_installments}
              onChange={(e) => update("payment_installments", e.target.value)}
              disabled={form.payment_type === "boleto" || form.payment_type === "debit_card"}
            >
              {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n}x {n === 1 ? "(Single)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Order Status */}
        <label>
          Order Status
          <select
            value={form.order_status}
            onChange={(e) => update("order_status", e.target.value)}
          >
            <option value="delivered">Delivered (Completed)</option>
            <option value="shipped">Shipped (In Transit)</option>
            <option value="processing">Processing</option>
            <option value="invoiced">Invoiced</option>
            <option value="canceled">Canceled</option>
          </select>
        </label>

        {/* Purchase Date & Delivery Date Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Purchase Date
            <input
              type="date"
              min={MIN_DATE}
              max={MAX_DATE}
              value={form.order_purchase_timestamp}
              onChange={(e) => update("order_purchase_timestamp", e.target.value)}
              required
            />
            <small style={{ fontSize: 11, color: "#64748b" }}>Allowed: Sep 2016 – Oct 2018</small>
          </label>
          <label>
            Delivered Date (Optional)
            <input
              type="date"
              min={form.order_purchase_timestamp || MIN_DATE}
              max="2018-10-31"
              value={form.order_delivered_customer_date}
              onChange={(e) => update("order_delivered_customer_date", e.target.value)}
              placeholder="Auto-calculated if delivered"
            />
            <small style={{ fontSize: 11, color: "#64748b" }}>Must be after purchase date</small>
          </label>
        </div>

        {error && <div className="apiError">{error}</div>}

        <div className="actions" style={{ marginTop: 16, display: "flex", justifyContent: isEdit && onDelete ? "space-between" : "flex-end", alignItems: "center" }}>
          {isEdit && onDelete ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowDeleteConfirm(true)}
              style={{ color: "#ef4444", borderColor: "#fecaca", display: "inline-flex", alignItems: "center", gap: 5 }}
              disabled={busy}
            >
              <Trash2 size={15} /> Delete Order
            </button>
          ) : (
            <span />
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn secondary" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button className="btn primary" disabled={busy}>
              {busy ? "Saving..." : isEdit ? "Save Changes" : "Add Order"}
            </button>
          </div>
        </div>
      </form>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Order?"
          message="Are you sure you want to delete this order? Any associated review and payment records will also be permanently removed."
          confirmLabel="Delete Order"
          isDanger={true}
          loading={busy}
          onConfirm={async () => {
            setShowDeleteConfirm(false);
            setBusy(true);
            try {
              await onDelete(order.order_id);
            } catch (e) {
              setError(e.message);
              setBusy(false);
            }
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
