/**
 * ================================================================================
 * PLATFORM AUDIT TRAIL & COMPLIANCE MODAL (components/AuditLogModal.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This is the compliance "flight recorder" dialog. It shows a searchable feed of every 
 * data edit, customer creation, order modification, review submission, or bulk action
 * performed by administrators across the entire application.
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - "Activity Logs" / "Audit Trail" button in the top navigation bar of `Shell.jsx`.
 * ================================================================================
 */

import React, { useEffect, useState } from "react";
import { History, RefreshCw, Search, Shield, User, X } from "lucide-react";
import { customerService } from "../services/api";

export default function AuditLogModal({ close }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [query, setQuery] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await customerService.globalAuditLogs({
        action: filterAction || undefined,
        q: query || undefined,
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

        {/* Toolbar with action filter and search */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <form onSubmit={handleSearch} style={{ display: "flex", flex: 1, minWidth: 200, gap: 6 }}>
            <div className="search" style={{ flex: 1, margin: 0 }}>
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search audit details or customer ID..."
              />
            </div>
            <button type="submit" className="btn secondary" style={{ padding: "0 12px" }}>
              Search
            </button>
          </form>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{ minWidth: 170, padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          >
            <option value="">All Actions</option>
            <option value="Customer">Customer Add / Edit / Delete</option>
            <option value="order">Order Activity</option>
            <option value="review">Review Activity</option>
            <option value="Bulk">Bulk Operations</option>
            <option value="interaction">CRM Interactions</option>
          </select>

          <button
            type="button"
            className="btn ghost"
            onClick={loadLogs}
            disabled={loading}
            title="Refresh logs"
            style={{ padding: "8px 10px" }}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
          </button>
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
            <table style={{ minWidth: "100%", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Timestamp</th>
                  <th style={{ width: 150 }}>Action</th>
                  <th style={{ width: 100 }}>Admin</th>
                  <th>Details & Changes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const badge = getActionBadgeColor(log.action);
                  const badgeClass = getActionBadgeClass(log.action);
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
                        {new Date(log.created_at).toLocaleString([], {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td>
                        <span
                          className={badgeClass}
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500 }}>
                          <Shield size={12} color="#64748b" /> {log.performed_by || "admin"}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-main)" }}>
                        <div>{log.details || "No extra metadata recorded."}</div>
                        {log.customer_id && (
                          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, fontFamily: "monospace" }}>
                            Target: {log.customer_id}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
