import React, { createContext, useCallback, useContext, useState, useRef } from "react";

const ToastContext = createContext(null);

/** Maximum number of toasts visible at once */
const MAX_VISIBLE = 5;

/** Auto-dismiss duration in milliseconds per type */
const DURATIONS = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
};

/** SVG icons for each toast type */
const ICONS = {
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
      <path d="M6 10.5L8.5 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
      <path d="M7 7L13 13M13 7L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
      <path d="M10 6V11M10 13.5V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
      <path d="M10 9V14M10 6.5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    // Wait for exit animation to finish before removing from DOM
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 320);
  }, []);

  const addToast = useCallback(
    (type, message) => {
      const id = ++counterRef.current;
      const duration = DURATIONS[type] || 4000;

      setToasts((prev) => {
        const next = [...prev, { id, type, message, exiting: false }];
        // Trim oldest toasts if exceeding max visible
        if (next.length > MAX_VISIBLE) {
          return next.slice(next.length - MAX_VISIBLE);
        }
        return next;
      });

      // Auto-dismiss
      setTimeout(() => removeToast(id), duration);

      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (msg) => addToast("success", msg),
    error: (msg) => addToast("error", msg),
    warning: (msg) => addToast("warning", msg),
    info: (msg) => addToast("info", msg),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast container — fixed overlay, always on top */}
      <div className="toastContainer" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.type}${t.exiting ? " toast--exit" : ""}`}
            role="status"
          >
            <span className="toastIcon">{ICONS[t.type]}</span>
            <span className="toastMsg">{t.message}</span>
            <button
              className="toastClose"
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
            {/* Auto-dismiss progress bar */}
            <div
              className="toastProgress"
              style={{ animationDuration: `${DURATIONS[t.type]}ms` }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Hook to access toast notification methods */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
