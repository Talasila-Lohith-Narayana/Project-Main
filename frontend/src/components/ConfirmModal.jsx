import React from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDanger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="modalBg" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="modal confirmModal" style={{ maxWidth: 440, padding: 0, overflow: "hidden" }}>
        <div className="header" style={{ padding: "18px 20px", borderBottom: "1px solid var(--card-border, #e2e8f0)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isDanger && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ef4444",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={18} />
              </div>
            )}
            <h3 id="confirm-modal-title" style={{ margin: 0, fontSize: 16 }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            className="close"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "18px 20px", color: "var(--muted, #64748b)", fontSize: 13, lineHeight: 1.5 }}>
          {message}
        </div>

        <div className="actions" style={{ padding: "12px 20px 18px", borderTop: "1px solid var(--card-border, #e2e8f0)" }}>
          <button
            type="button"
            className="btn secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${isDanger ? "danger" : "primary"}`}
            onClick={onConfirm}
            disabled={loading}
            autoFocus
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
