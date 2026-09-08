/**
 * ================================================================================
 * AUTHENTICATION CONTEXT & SESSION PROVIDER (context/AuthContext.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This is the app's "identity manager". It remembers who is currently logged in,
 * saves login tokens into browser storage so page refreshes don't log you out,
 * and tracks whether the user is an Administrator (full edit access) or an Analyst (view-only).
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - Login & Logout behavior.
 * - Profile Switcher in the sidebar (Admin vs Analyst).
 * - Admin-Only Action Buttons across all pages (Add, Edit, Delete, Bulk actions).
 * ================================================================================
 */

import React, { createContext, useContext, useState } from "react";

// Create Context for holding auth state
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Map of username -> { access_token, username, role } for authenticated profiles
  const [accounts, setAccounts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ci_accounts") || "{}");
    } catch {
      return {};
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem("ci_token"));
  const [user, setUser] = useState(() => localStorage.getItem("ci_user"));
  const [role, setRole] = useState(
    () => localStorage.getItem("ci_role") || "viewer",
  );

  /**
   * Stores user session credentials to state and localStorage on successful login
   * @param {Object} session - { access_token, username, role }
   */
  const login = (session) => {
    const updatedAccounts = {
      ...accounts,
      [session.username]: session,
    };
    localStorage.setItem("ci_accounts", JSON.stringify(updatedAccounts));
    localStorage.setItem("ci_token", session.access_token);
    localStorage.setItem("ci_user", session.username);
    localStorage.setItem("ci_role", session.role);
    setAccounts(updatedAccounts);
    setToken(session.access_token);
    setUser(session.username);
    setRole(session.role);
  };

  /**
   * Clears user session credentials from state and localStorage on logout
   */
  const logout = (usernameToLogout = null) => {
    if (!usernameToLogout || usernameToLogout === user) {
      localStorage.removeItem("ci_token");
      localStorage.removeItem("ci_user");
      localStorage.removeItem("ci_role");
      setToken(null);
      setUser(null);
      setRole(null);
    }
  };

  /**
   * Clears all authenticated accounts
   */
  const logoutAll = () => {
    localStorage.removeItem("ci_accounts");
    localStorage.removeItem("ci_token");
    localStorage.removeItem("ci_user");
    localStorage.removeItem("ci_role");
    setAccounts({});
    setToken(null);
    setUser(null);
    setRole(null);
  };

  /**
   * Switch to an already authenticated session, or throw if not logged in
   */
  const switchToAccount = (targetUsername) => {
    const targetSession = accounts[targetUsername];
    if (!targetSession || !targetSession.access_token) {
      throw new Error(`Account ${targetUsername} is not logged in.`);
    }
    localStorage.setItem("ci_token", targetSession.access_token);
    localStorage.setItem("ci_user", targetSession.username);
    localStorage.setItem("ci_role", targetSession.role);
    setToken(targetSession.access_token);
    setUser(targetSession.username);
    setRole(targetSession.role);
  };

  /**
   * Authenticate and add a new profile to active sessions
   */
  const loginAndSwitch = async (credentials) => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Authentication failed. Invalid username or password.");
    }
    const session = await res.json();
    login(session);
    return session;
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        accounts,
        isAdmin: role === "admin",
        login,
        logout,
        logoutAll,
        switchToAccount,
        loginAndSwitch,
        isAuthenticated: Boolean(token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook for accessing authentication status, current user, role, login, and logout functions.
 */
export function useAuth() {
  return useContext(AuthContext);
}

