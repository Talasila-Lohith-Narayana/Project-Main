/**
 * ================================================================================
 * APP SHELL & NAVIGATION LAYOUT (components/Shell.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This is the outer framing that wraps around every page inside the app.
 * It provides the permanent left sidebar with navigation links, the user account
 * switcher (Admin vs Analyst), the Dark/Light mode theme toggle, and the top Activity Logs button.
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - Left Navigation Sidebar:
 *   • Workspace brand logo ("Customer Sphere").
 *   • Links to Dashboard (`/`), Customers (`/customers`), and Products (`/products`).
 *   • User Role Switcher: Allows seamless one-click switching between 'admin' and 'analyst' profiles.
 *   • Theme Toggle (Sun / Moon icons) for dark and light modes.
 *   • Sign Out button.
 * - Top Header Action:
 *   • "Activity Logs" / "Audit Trail" button that opens `AuditLogModal.jsx`.
 * ================================================================================
 */

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, History, KeyRound, LayoutDashboard, Lock, LogOut, Moon, Package, RefreshCw, Shield, Sparkles, Sun, UserCheck, UserPlus, Users, X } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import AuditLogModal from "./AuditLogModal";

export default function Shell() {
  const { user, role, accounts, isAdmin, logout, logoutAll, switchToAccount, loginAndSwitch } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Sidebar collapse/minimize state with localStorage persistence
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Modal state for logging in to a new profile to switch
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [targetUsername, setTargetUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Handles user sign out and redirection to the login view
  const signOut = () => {
    logoutAll();
    navigate("/login");
  };

  // Handles clicking a profile switch button
  const handleProfileClick = async (target) => {
    if (target === user) return;
    setLoginError("");

    // Check if the target account already has an active authenticated session
    if (accounts && accounts[target]?.access_token) {
      try {
        switchToAccount(target);
      } catch {
        // Session expired or missing, prompt login
        setTargetUsername(target);
        setPassword("");
        setShowLoginModal(true);
      }
    } else {
      // Must authenticate with password first
      setTargetUsername(target);
      setPassword("");
      setShowLoginModal(true);
    }
  };

  // Handles submitting credentials in the Switch Profile login dialog
  const handleLoginAndSwitch = async (e) => {
    e.preventDefault();
    if (!password) {
      setLoginError("Please enter your password.");
      return;
    }
    setSwitching(true);
    setLoginError("");
    try {
      await loginAndSwitch({ username: targetUsername, password });
      setShowLoginModal(false);
      setPassword("");
    } catch (err) {
      setLoginError(err.message || "Invalid credentials.");
    } finally {
      setSwitching(false);
    }
  };

  // Human-readable role indicator
  const roleLabel = isAdmin ? "Administrator" : (role === "viewer" ? "Analyst" : role || "User");

  return (
    <div className={`shell ${collapsed ? "sidebarCollapsed" : ""}`}>
      {/* Sidebar Navigation */}
      <aside className={collapsed ? "collapsed" : ""}>
        {/* Toggle Minimize/Expand Button */}
        <button
          type="button"
          className="sidebarToggleBtn"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="brand" title="Customer Sphere">
          <div className="brandIcon">
            <Sparkles size={18} />
          </div>
          {!collapsed && (
            <>
              <b>Customer</b>
              <b>Sphere</b>
            </>
          )}
        </div>
        {!collapsed && <small>WORKSPACE</small>}
        
        <NavLink to="/" end title="Dashboard">
          <LayoutDashboard size={17} />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>
        <NavLink to="/customers" title="Customers">
          <Users size={17} />
          {!collapsed && <span>Customers</span>}
        </NavLink>
        <NavLink to="/products" title="Products">
          <Package size={17} />
          {!collapsed && <span>Products</span>}
        </NavLink>
        
        {/* Workspace Admin Data Changes Button */}
        <button
          type="button"
          onClick={() => setShowAuditModal(true)}
          className="sideNavBtn"
          title="Admin Activity: View audit trail and history"
        >
          <History size={17} />
          {!collapsed && <span>Admin Activity</span>}
        </button>
        
        {/* User Session & Logout Controls */}
        <div className="sideBottom">
          {/* Light / Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="sideThemeBtn"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: collapsed ? "center" : "flex-start", width: collapsed ? "100%" : "auto" }}>
              {isDark ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#93c5fd" />}
              {!collapsed && (isDark ? "Light Mode" : "Dark Mode")}
            </span>
            {!collapsed && (
              <span style={{ fontSize: 10, background: isDark ? "#334155" : "#0f172a", padding: "2px 6px", borderRadius: 4, color: "#94a3b8" }}>
                {theme.toUpperCase()}
              </span>
            )}
          </button>

          <div className="user" title={`${user} (${roleLabel})`}>
            <div className="avatar">{user?.[0]?.toUpperCase()}</div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                <b style={{ whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{user}</b>
                <span>{roleLabel}</span>
              </div>
            )}
          </div>

          {/* Quick Profile Switcher */}
          {!collapsed ? (
            <div
              style={{
                background: "#161f2e",
                borderRadius: 8,
                padding: "8px",
                marginBottom: 12,
                border: "1px solid #24334a",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Switch Profile</span>
                {switching && <RefreshCw size={10} className="spin" style={{ animation: "spin 1s linear infinite" }} />}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => handleProfileClick("admin")}
                  disabled={switching}
                  title={user === "admin" ? "Active profile" : accounts?.["admin"] ? "Switch to logged-in Admin session" : "Authenticate & switch to Admin"}
                  style={{
                    background: user === "admin" ? "#2563eb" : "#1e293b",
                    color: user === "admin" ? "#fff" : "#94a3b8",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 4px",
                    fontSize: 11,
                    fontWeight: user === "admin" ? 600 : 400,
                    cursor: user === "admin" ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    transition: "all 0.15s ease",
                  }}
                >
                  <Shield size={12} /> Admin {!accounts?.["admin"] && user !== "admin" && <Lock size={9} style={{ opacity: 0.7 }} />}
                </button>
                <button
                  type="button"
                  onClick={() => handleProfileClick("analyst")}
                  disabled={switching}
                  title={user === "analyst" ? "Active profile" : accounts?.["analyst"] ? "Switch to logged-in Analyst session" : "Authenticate & switch to Analyst"}
                  style={{
                    background: user === "analyst" ? "#0284c7" : "#1e293b",
                    color: user === "analyst" ? "#fff" : "#94a3b8",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 4px",
                    fontSize: 11,
                    fontWeight: user === "analyst" ? 600 : 400,
                    cursor: user === "analyst" ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    transition: "all 0.15s ease",
                  }}
                >
                  <UserCheck size={12} /> Analyst {!accounts?.["analyst"] && user !== "analyst" && <Lock size={9} style={{ opacity: 0.7 }} />}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => handleProfileClick(user === "admin" ? "analyst" : "admin")}
                disabled={switching}
                title={`Switch to ${user === "admin" ? "Analyst" : "Admin"}`}
                style={{
                  background: "#161f2e",
                  border: "1px solid #24334a",
                  color: "#94a3b8",
                  borderRadius: 8,
                  padding: "8px 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                {user === "admin" ? <Shield size={14} color="#38bdf8" /> : <UserCheck size={14} color="#38bdf8" />}
              </button>
            </div>
          )}

          <button onClick={signOut} title="Sign out" className="sideSignOutBtn">
            <LogOut size={16} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Profile Login Modal Dialog */}
      {showLoginModal && (
        <div className="modalBg">
          <form className="modal" style={{ maxWidth: 380 }} onSubmit={handleLoginAndSwitch}>
            <button type="button" className="close" onClick={() => setShowLoginModal(false)}>
              <X size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                className="switchProfileIcon"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: targetUsername === "admin" ? "#dbeafe" : "#e0f2fe",
                  color: targetUsername === "admin" ? "#1d4ed8" : "#0369a1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <KeyRound size={18} />
              </div>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>SECURITY VERIFICATION</p>
                <h2 style={{ margin: 0, fontSize: 18 }}>
                  Sign in as {targetUsername === "admin" ? "Administrator" : "Analyst"}
                </h2>
              </div>
            </div>

            <p className="filterHint" style={{ marginBottom: 16 }}>
              Please enter the password for <b>{targetUsername}</b> to switch profiles.
            </p>

            <label>
              Username
              <input
                type="text"
                value={targetUsername}
                disabled
                className="switchProfileDisabledInput"
                style={{ background: "#f1f5f9", cursor: "not-allowed" }}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError("");
                }}
                placeholder={`Enter password for ${targetUsername}`}
                autoFocus
                required
              />
            </label>

            {loginError && <div className="apiError">{loginError}</div>}

            <div className="actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn secondary" onClick={() => setShowLoginModal(false)} disabled={switching}>
                Cancel
              </button>
              <button className="btn primary" disabled={switching}>
                {switching ? "Authenticating..." : "Sign In & Switch"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Activity / Audit Trail Modal */}
      {showAuditModal && (
        <AuditLogModal close={() => setShowAuditModal(false)} />
      )}

      {/* Dynamic Content Viewport */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

