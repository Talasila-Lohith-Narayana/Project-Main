import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import Shell from "./components/Shell";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
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
const Users = lazy(() => import("./pages/Users"));
const Login = lazy(() => import("./pages/Login"));

function AdminRoute() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

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
                    <Route element={<AdminRoute />}>
                      <Route path="analytics" element={<Analytics />} />
                      <Route path="campaigns" element={<Campaigns />} />
                      <Route path="model" element={<Model />} />
                    </Route>
                    <Route path="users" element={<Users />} />
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
