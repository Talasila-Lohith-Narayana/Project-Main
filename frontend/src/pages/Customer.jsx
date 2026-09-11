/**
 * ================================================================================
 * SINGLE CUSTOMER PROFILE & DEEP-DIVE INTELLIGENCE (pages/Customer.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This is the individual 360-degree profile page for a single customer. It displays 
 * their full relationship history: how much they spent, their preferred categories,
 * payment habits, past orders, reviews left, CRM communication notes, and audit history.
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - Customer Profile Page (`/customers/:id`):
 *   • Header Badge: Customer Unique ID hash with clean copy feature, City, State, and Segment badge.
 *   • Admin Action Buttons: "Edit Customer", "Delete Customer", "Add Order", "Add Review", "Log Activity".
 *   • Top RFM Intelligence Cards: Lifetime Spend (R$), Total Orders, Avg Rating, Tenure Days, Recency.
 *   • 6 Modular Profile Tabs:
 *     1. Overview: Behavior signals, Top Category shares, Payment preferences (CustomerOverview).
 *     2. Products: List of all specific items bought with prices and shipping fees (CustomerProducts).
 *     3. Orders: Full order transaction table with status, dates, and order values (CustomerOrders).
 *     4. Reviews: Star rating badges and written customer feedback comments (CustomerReviews).
 *     5. Activity: CRM timeline with phone calls, emails, support tickets, and team notes (CustomerInteractions).
 *     6. Audit Log: Full audit trail of edits and updates made to this customer profile (CustomerAuditLogs).
 * ================================================================================
 */

import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  History,
  MapPin,
  MessageSquare,
  Package,
  Plus,
  Repeat2,
  ShoppingBag,
  Star,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { customerService } from "../services/api";
import { useToast } from "../context/ToastContext";
import InteractionModal from "../components/InteractionModal";
import OrderModal from "../components/OrderModal";
import ReviewModal from "../components/ReviewModal";
import CustomerModal from "../components/CustomerModal";
import ConfirmModal from "../components/ConfirmModal";
import { ErrorState, LoadingState, Page } from "../components/States";
import { useAuth } from "../context/AuthContext";

// Modular tab components
import CustomerOverview from "../components/customer/CustomerOverview";
import CustomerProducts from "../components/customer/CustomerProducts";
import CustomerOrders from "../components/customer/CustomerOrders";
import CustomerReviews from "../components/customer/CustomerReviews";
import CustomerInteractions from "../components/customer/CustomerInteractions";
import CustomerAuditLogs from "../components/customer/CustomerAuditLogs";

export default function Customer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [showForm, setShowForm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showAddReview, setShowAddReview] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const [detail, orders, products, reviews, interactions, auditLogs] =
        await Promise.all([
          customerService.detail(id),
          customerService.orders(id),
          customerService.products(id),
          customerService.reviews(id),
          customerService.interactions(id),
          customerService.auditLogs(id),
        ]);
      setData({
        detail,
        orders: orders.items,
        products: products.items,
        reviews: reviews.items,
        interactions,
        auditLogs: auditLogs.items,
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setError("");
    try {
      await customerService.remove(id);
      setShowDeleteConfirm(false);
      toast.success("Customer deleted successfully.");
      navigate("/customers");
    } catch (requestError) {
      toast.error(requestError.message);
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (error)
    return (
      <Page>
        <ErrorState message={error} retry={load} />
      </Page>
    );

  if (!data)
    return (
      <Page>
        <LoadingState text="Loading customer intelligence..." />
      </Page>
    );

  const customer = data.detail;

  // Use backend computed Customer Lifetime Value (CLV) with client-side fallback
  const segmentMultipliers = {
    Champions: 1.4,
    Engaged: 1.25,
    "New / Developing": 1.1,
    "At Risk": 1.02,
  };
  const multiplier = segmentMultipliers[customer.segment] || 1.1;
  const realizedSpend = Number(customer.monetary_total || 0);
  const estimatedClv =
    customer.customer_lifetime_value != null
      ? Number(customer.customer_lifetime_value)
      : realizedSpend * multiplier;

  const features = [
    [
      "CLV (Lifetime Value)",
      `R$ ${estimatedClv.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      WalletCards,
      "emerald",
    ],
    [
      "Total spend",
      `R$ ${Number(customer.monetary_total || 0).toLocaleString("en-US")}`,
      WalletCards,
    ],
    ["Frequency", `${customer.frequency || 0} orders`, Repeat2],
    ["Recency", `${customer.recency_days || 0} days`, TrendingUp],
    [
      "Avg review",
      `${Number(customer.avg_review_score || 0).toFixed(1)} / 5`,
      Star,
    ],
    [
      "Delivery",
      `${Number(customer.avg_delivery_days || 0).toFixed(1)} days`,
      Activity,
    ],
  ];

  return (
    <Page>
      <button className="back" onClick={() => navigate("/customers")}>
        <ArrowLeft size={16} /> Customers
      </button>

      <div className="profile">
        <div className="heroAvatar">{customer.customer_city?.[0]}</div>
        <div className="profileText">
          <span>CONSUMER PROFILE · {customer.segment}</span>
          <h1>{customer.customer_unique_id}</h1>
          <p>
            <MapPin size={14} /> {customer.customer_city},{" "}
            {customer.customer_state}
          </p>
        </div>
        {isAdmin && (
          <div className="actions">
            <button className="btn secondary" onClick={() => setShowEdit(true)}>
              Edit customer
            </button>
            <button className="btn secondary" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={16} /> Delete
            </button>
            <button className="btn primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Add activity
            </button>
          </div>
        )}
      </div>

      <div className="features">
        {features.map(([label, value, Icon]) => (
          <div key={label}>
            <Icon size={16} />
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[
          ["overview", "Overview", TrendingUp],
          ["products", "Products", Package],
          ["orders", "Orders", ShoppingBag],
          ["reviews", "Reviews", MessageSquare],
          ["activity", "Activity", Activity],
          ["audit", "Audit Log", History],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <CustomerOverview customer={customer} />}
      {tab === "products" && <CustomerProducts items={data.products} />}
      {tab === "orders" && (
        <CustomerOrders
          items={data.orders}
          isAdmin={isAdmin}
          onAddOrder={() => setShowAddOrder(true)}
          onEditOrder={(order) => setEditingOrder(order)}
        />
      )}
      {tab === "reviews" && (
        <CustomerReviews
          items={data.reviews}
          orders={data.orders}
          isAdmin={isAdmin}
          onAddReview={() => setShowAddReview(true)}
          onEditReview={(review) => setEditingReview(review)}
        />
      )}
      {tab === "activity" && (
        <CustomerInteractions
          items={data.interactions}
          isAdmin={isAdmin}
          onEditInteraction={(interaction) => setEditingInteraction(interaction)}
        />
      )}
      {tab === "audit" && <CustomerAuditLogs items={data.auditLogs} />}

      {showForm && (
        <InteractionModal
          close={() => setShowForm(false)}
          save={async (payload) => {
            await customerService.addInteraction(id, payload);
            setShowForm(false);
            toast.success("Activity logged successfully.");
            await load();
            setTab("activity");
          }}
        />
      )}

      {editingInteraction && (
        <InteractionModal
          interaction={editingInteraction}
          close={() => setEditingInteraction(null)}
          save={async (payload) => {
            await customerService.updateInteraction(id, editingInteraction.id, payload);
            setEditingInteraction(null);
            toast.success("Activity updated successfully.");
            await load();
            setTab("activity");
          }}
        />
      )}

      {showEdit && (
        <CustomerModal
          customer={customer}
          close={() => setShowEdit(false)}
          save={async (payload) => {
            await customerService.update(id, payload);
            setShowEdit(false);
            toast.success("Customer profile updated.");
            await load();
          }}
        />
      )}

      {showAddOrder && (
        <OrderModal
          close={() => setShowAddOrder(false)}
          save={async (payload) => {
            await customerService.createOrder(id, payload);
            setShowAddOrder(false);
            toast.success("Order placed successfully.");
            await load();
            setTab("orders");
          }}
        />
      )}

      {editingOrder && (
        <OrderModal
          order={editingOrder}
          close={() => setEditingOrder(null)}
          save={async (payload) => {
            await customerService.updateOrder(id, editingOrder.order_id, payload);
            setEditingOrder(null);
            toast.success("Order updated successfully.");
            await load();
            setTab("orders");
          }}
          onDelete={async (orderId) => {
            await customerService.removeOrder(id, orderId);
            setEditingOrder(null);
            toast.success("Order deleted successfully.");
            await load();
            setTab("orders");
          }}
        />
      )}

      {showAddReview && (
        <ReviewModal
          orders={data.orders}
          existingReviews={data.reviews}
          close={() => setShowAddReview(false)}
          save={async (payload) => {
            await customerService.createReview(id, payload);
            setShowAddReview(false);
            toast.success("Review added successfully.");
            await load();
            setTab("reviews");
          }}
        />
      )}

      {editingReview && (
        <ReviewModal
          review={editingReview}
          orders={data.orders}
          existingReviews={data.reviews}
          close={() => setEditingReview(null)}
          save={async (payload) => {
            await customerService.updateReview(id, editingReview.review_id, payload);
            setEditingReview(null);
            toast.success("Review updated successfully.");
            await load();
            setTab("reviews");
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Customer Profile?"
          message={`Are you sure you want to delete customer ${customer.customer_unique_id}? Customers with active order history cannot be deleted.`}
          confirmLabel="Delete Customer"
          isDanger={true}
          loading={deleteLoading}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </Page>
  );
}
