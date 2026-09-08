/**
 * ================================================================================
 * PROTECTED ROUTE ACCESS GATEWAY (components/ProtectedRoute.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This is the private gateway. When someone tries to visit a protected page
 * (like Dashboard, Customers, or Products), it checks if they have a valid login session.
 * If yes, it lets them in. If not, it bounces them to the Login screen.
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - Guards every authenticated route in the application.
 * ================================================================================
 */

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

