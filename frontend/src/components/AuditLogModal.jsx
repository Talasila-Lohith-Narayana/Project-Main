import React, { useEffect, useState } from "react";
import { History, RefreshCw, Search, Shield, User, X } from "lucide-react";
import { customerService } from "../services/api";
import DataTable from "./DataTable";

export default function AuditLogModal({ close }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [query, setQuery] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await customerService.globalAuditLogs({
        action: filterAction || undefined,
        q: query || undefined,
        ...(performedBy.trim() ? { performed_by: performedBy.trim() } : {}),
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
        limit: 100,
      });
      setLogs(res.items || []);
    } catch (err) {
      setError(err.message || "Failed to load audit trail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filterAction]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadLogs();
  };

  const getActionBadgeColor = (action) => {
    const act = (action || "").toLowerCase();
    if (act.includes("delete")) return { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
    if (act.includes("create") || act.includes("placed")) return { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" };
    if (act.includes("update") || act.includes("bulk")) return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
    if (act.includes("review")) return { bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
    return { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
  };

  const getActionBadgeClass = (action) => {
    const act = (action || "").toLowerCase();
    if (act.includes("delete")) return "auditActionBadge delete";
    if (act.includes("create") || act.includes("placed")) return "auditActionBadge create";
    if (act.includes("update") || act.includes("bulk")) return "auditActionBadge update";
    if (act.includes("review")) return "auditActionBadge review";
    return "auditActionBadge default";
  };

  return (
    <div className="modalBg">
      <div className="modal" style={{ width: "min(840px, 95vw)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <button type="button" className="close" onClick={close}>
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            className="auditLogHeaderIcon"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#dbeafe",
              color: "#1d4ed8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <History size={20} />
          </div>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>SECURITY & COMPLIANCE</p>
            <h2 style={{ margin: 0, fontSize: 20 }}>Admin Data Activity Log</h2>
          </div>
        </div>

        <p className="filterHint" style={{ marginBottom: 14 }}>
          Comprehensive record of all creations, updates, deletions, order placements, reviews, and bulk actions made by administrators.
        </p>

        {/* Search and filters */}
        <div className="auditToolbar">
          <div className="auditSearchRow">
            <form onSubmit={handleSearch} className="auditSearchForm">
              <div className="search auditLogSearch">
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search audit details or customer ID..."
              />
              </div>
              <button type="submit" className="btn primary auditSearchButton">
                Search
              </button>
            </form>
            <button
              type="button"
              className="btn secondary auditRefreshButton"
              onClick={loadLogs}
              disabled={loading}
              title="Refresh logs"
              aria-label="Refresh logs"
            >
              <RefreshCw size={16} className={loading ? "spin" : ""} />
            </button>
          </div>

          <div className="auditFilterRow">
            <label className="auditFilterField auditActionField">
              <span>Action type</span>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="">All actions</option>
                <option value="Customer">Customer Add / Edit / Delete</option>
                <option value="order">Order Activity</option>
                <option value="review">Review Activity</option>
                <option value="Bulk">Bulk Operations</option>
                <option value="interaction">CRM Interactions</option>
              </select>
            </label>
            <label className="auditFilterField auditActorField">
              <span>Performed by</span>
              <input
                type="text"
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
                placeholder="Admin username"
                aria-label="Filter by admin"
              />
            </label>
            <label className="auditFilterField">
              <span>From date</span>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Start date"
              />
            </label>
            <label className="auditFilterField">
              <span>To date</span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="End date"
              />
            </label>
          </div>
        </div>

        {/* Logs List Table */}
        <div className="auditLogTableWrap" style={{ flex: 1, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
              <RefreshCw size={24} className="spin" style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
              <div>Loading admin activity trail...</div>
            </div>
          ) : error ? (
            <div className="apiError" style={{ margin: 16 }}>{error}</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 36, textAlign: "center", color: "#64748b" }}>
              No audit log entries found matching criteria.
            </div>
          ) : (
            <DataTable
              data={logs}
              columns={[
                { header: "Timestamp", accessorKey: "created_at", cell: ({ row }) => <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>{new Date(row.original.created_at).toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span> },
                { header: "Action", accessorKey: "action", cell: ({ row }) => { const badge = getActionBadgeColor(row.original.action); return <span className={getActionBadgeClass(row.original.action)} style={{ display: "inline-block", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, whiteSpace: "nowrap" }}>{row.original.action}</span>; } },
                { header: "Admin", accessorKey: "performed_by", cell: ({ row }) => <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500 }}><Shield size={12} color="#64748b" /> {row.original.performed_by || "admin"}</span> },
                { header: "Details & Changes", accessorKey: "details", cell: ({ row }) => <div style={{ fontSize: 12, color: "var(--text-main)" }}><div>{row.original.details || "No extra metadata recorded."}</div>{row.original.customer_id && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, fontFamily: "monospace" }}>Target: {row.original.customer_id}</div>}</div> },
              ]}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <span style={{ fontSize: 11, color: "#64748b" }}>
            Showing <strong>{logs.length}</strong> recorded admin operations
          </span>
          <button type="button" className="btn secondary" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
