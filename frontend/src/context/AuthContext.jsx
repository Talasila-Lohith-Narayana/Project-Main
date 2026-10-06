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

  const updateCurrentSession = (session) => {
    const updatedAccounts = { ...accounts };
    if (user && user !== session.username) {
      delete updatedAccounts[user];
    }
    const updatedSession = {
      ...(updatedAccounts[session.username] || {}),
      access_token: session.access_token || token,
      username: session.username,
      role: session.role,
    };
    updatedAccounts[session.username] = updatedSession;
    localStorage.setItem("ci_accounts", JSON.stringify(updatedAccounts));
    localStorage.setItem("ci_user", session.username);
    if (session.access_token) {
      localStorage.setItem("ci_token", session.access_token);
      setToken(session.access_token);
    }
    localStorage.setItem("ci_role", session.role);
    setAccounts(updatedAccounts);
    setUser(session.username);
    setRole(session.role);
  };
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
const loginAndSwitch = async (credentials) => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"}/auth/login`, {
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
        updateCurrentSession,
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
export function useAuth() {
  return useContext(AuthContext);
}
