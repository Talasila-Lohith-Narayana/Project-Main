/**
 * ================================================================================
 * API CLIENT & NETWORK SERVICE LAYER (services/api.js)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This is the network messenger of the frontend. Whenever a page or button needs to
 * talk to the backend Python server (e.g. to load customers, place an order, log in,
 * or export CSV files), it goes through this file. It automatically attaches the user's
 * security token to every request and turns technical server errors into readable messages.
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - Used by ALL pages and modals to fetch and save data.
 * ================================================================================
 */

import axios from "axios";

// Create Axios client pointing to the backend API base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",
});

// Request Interceptor: Attach JWT Bearer token from localStorage to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ci_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response Interceptor: Standardize backend error responses into clear, readable Error exceptions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Connection / Network errors
    if (!error.response) {
      return Promise.reject(
        new Error("Unable to connect to the server. Please check your network connection or try again later.")
      );
    }

    const { status, data } = error.response;
    const detail = data?.detail;

    // 2. Handle Pydantic validation error lists with field names
    if (Array.isArray(detail)) {
      const messages = detail.map((err) => {
        const field = err.loc ? err.loc[err.loc.length - 1] : "Field";
        const formattedField = String(field).replace(/_/g, " ");
        return `${formattedField}: ${err.msg}`;
      });
      return Promise.reject(new Error(messages.join(". ")));
    }

    // 3. String detail provided by FastAPI HTTPException
    if (typeof detail === "string" && detail.trim()) {
      return Promise.reject(new Error(detail));
    }

    // 4. Fallback messages by HTTP status code
    if (status === 401) {
      return Promise.reject(new Error("Your session has expired or you are unauthorized. Please sign in again."));
    }
    if (status === 403) {
      return Promise.reject(new Error("Permission denied: Administrator privileges are required to perform this action."));
    }
    if (status === 404) {
      return Promise.reject(new Error("The requested record was not found or has been removed."));
    }
    if (status === 409) {
      return Promise.reject(new Error("A conflicting record with this identifier already exists."));
    }
    if (status === 422) {
      return Promise.reject(new Error("The submitted data contains invalid formatting. Please check all fields."));
    }
    if (status >= 500) {
      return Promise.reject(new Error("Internal server error occurred while processing your request. Please try again."));
    }

    return Promise.reject(new Error(error.message || "An unexpected error occurred."));
  },
);

// Helper to extract data payload directly from axios response promises
const data = (request) => request.then((response) => response.data);

/** Authentication service endpoints */
export const authService = {
  /** Login with username and password, returns JWT access_token */
  login: (credentials) => data(api.post("/auth/login", credentials)),
};

/** Executive dashboard analytics endpoints */
export const dashboardService = {
  /** Fetch KPIs, revenue trend, customer segmentation, regional distributions, and geo heatmap */
  summary: (params = {}) => {
    const queryParams = typeof params === "string" ? { timeframe: params } : params;
    return data(api.get("/dashboard/summary", { params: queryParams }));
  },
  /** Fetch deep-dive geographic analytics for a specific Brazilian state */
  stateDetail: (stateCode, params = {}) => {
    return data(api.get(`/dashboard/geo/state/${stateCode}`, { params }));
  },
};

/** Products catalog service endpoints */
export const productsService = {
  /** Fetch catalog products with filters, sorting and pagination */
  catalog: (params) => data(api.get("/products", { params })),
  /** Fetch available product IDs for a specific category */
  byCategory: (category, limit = 50) =>
    data(api.get("/products/by-category", { params: { category, limit } })),
  /** Export full filtered products catalog to CSV */
  exportCsv: (params) =>
    api.get("/products/export", {
      params,
      responseType: "blob",
    }),
};

/** Customer intelligence & directory CRUD endpoints */
export const customerService = {
  /** List customers with search, filtering, sorting, and pagination */
  list: (params) => data(api.get("/customers", { params })),
  /** Create a new customer profile */
  create: (payload) => data(api.post("/customers", payload)),
  /** Get full customer detail including metrics, behavior signals, and payment preferences */
  detail: (id) => data(api.get(`/customers/${id}`)),
  /** Update customer profile information */
  update: (id, payload) => data(api.patch(`/customers/${id}`, payload)),
  /** Delete a customer (only allowed if customer has no order history) */
  remove: (id) => data(api.delete(`/customers/${id}`)),
  /** Fetch historical orders placed by a customer */
  orders: (id) => data(api.get(`/customers/${id}/orders`)),
  /** Fetch products purchased by a customer */
  products: (id) => data(api.get(`/customers/${id}/products`)),
  /** Fetch order reviews submitted by a customer */
  reviews: (id) => data(api.get(`/customers/${id}/reviews`)),
  /** Add a review for a customer */
  createReview: (id, payload) =>
    data(api.post(`/customers/${id}/reviews`, payload)),
  /** Edit an existing review for a customer */
  updateReview: (id, reviewId, payload) =>
    data(api.patch(`/customers/${id}/reviews/${reviewId}`, payload)),
  /** Fetch recorded CRM team interactions for a customer */
  interactions: (id) => data(api.get(`/customers/${id}/interactions`)),
  /** Record a new CRM interaction note for a customer */
  addInteraction: (id, payload) =>
    data(api.post(`/customers/${id}/interactions`, payload)),
  /** Edit/update an existing CRM interaction note */
  updateInteraction: (id, interactionId, payload) =>
    data(api.patch(`/customers/${id}/interactions/${interactionId}`, payload)),
  /** Place/create a new order for a customer */
  createOrder: (id, payload) =>
    data(api.post(`/customers/${id}/orders`, payload)),
  /** Edit/update an existing order for a customer */
  updateOrder: (id, orderId, payload) =>
    data(api.patch(`/customers/${id}/orders/${orderId}`, payload)),
  /** Delete an order and its associated reviews and items */
  removeOrder: (id, orderId) =>
    data(api.delete(`/customers/${id}/orders/${orderId}`)),
  removeOrders: (id, orderIds) =>
    data(api.post(`/customers/${id}/orders/bulk-delete`, { order_ids: orderIds })),
  /** Bulk update segment for multiple customers */
  bulkSegmentUpdate: (payload) =>
    data(api.post("/customers/bulk-segment", payload)),
  /** Bulk delete multiple customer profiles */
  bulkDelete: (payload) =>
    data(api.post("/customers/bulk-delete", payload)),
  /** Export full CSV dataset matching filter criteria directly from server */
  exportCsv: (params) =>
    api.get("/customers/export", { params, responseType: "blob" }),
  /** Fetch audit log trail of changes made to a customer */
  auditLogs: (id) => data(api.get(`/customers/${id}/audit-logs`)),
  /** Fetch global audit log history of all changes made in the platform */
  globalAuditLogs: (params) => data(api.get("/audit-logs", { params })),
};

/** AI Intelligence & Machine Learning endpoints */
export const predictionService = {
  /** Fetch complete ML insights (Churn, SHAP, CLV, AI Segment, Recommendations) */
  get: (idOrUniqueId) => data(api.get(`/predictions/${idOrUniqueId}`)),
  /** Manually trigger model scoring for a customer */
  rescore: (idOrUniqueId) => data(api.post(`/predictions/${idOrUniqueId}/rescore`)),
};
