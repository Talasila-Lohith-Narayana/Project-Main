/**
 * ================================================================================
 * FRONTEND ROOT ENTRY POINT & ROUTER (main.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This is the starting engine of the entire web interface. It loads the React app 
 * into the browser, sets up page navigation (URL routing), manages dark/light themes, 
 * and protects private pages so only logged-in users can view them.
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - App-wide URL Navigation:
 *   • /login          -> Login Page (`Login.jsx`)
 *   • /               -> Dashboard Analytics (`Dashboard.jsx`)
 *   • /customers      -> Customers Directory (`Customers.jsx`)
 *   • /customers/:id  -> Customer Profile Detail (`Customer.jsx`)
 *   • /products       -> Products Catalog (`Products.jsx`)
 *   • /analytics      -> Customer Intelligence Analytics (`Analytics.jsx`)
 * - Global Theme Provider (Dark Mode / Light Mode switcher).
 * - Global Authentication Provider (keeps you logged in across pages).
 * ================================================================================
 */

import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import Shell from "./components/Shell";
import ProtectedRoute from "./components/ProtectedRoute";
import { LoadingState } from "./components/States";
import "./styles.css";

// Page components
import Dashboard from "./pages/Dashboard";
const Customer = lazy(() => import("./pages/Customer"));
const Customers = lazy(() => import("./pages/Customers"));
const Products = lazy(() => import("./pages/Products"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Model = lazy(() => import("./pages/Model"));
const Login = lazy(() => import("./pages/Login"));

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<LoadingState text="Loading workspace..." />}>
              <Routes>
                {/* Public authentication route */}
                <Route path="/login" element={<Login />} />

                {/* Authenticated routes guarded by ProtectedRoute & wrapped in Shell layout */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<Shell />}>
                    <Route index element={<Dashboard />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="customers/:id" element={<Customer />} />
                    <Route path="products" element={<Products />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="campaigns" element={<Campaigns />} />
                    <Route path="model" element={<Model />} />
                  </Route>
                </Route>

                {/* Catch-all route redirecting unknown paths to Dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

// Mount React application into HTML #root element
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
