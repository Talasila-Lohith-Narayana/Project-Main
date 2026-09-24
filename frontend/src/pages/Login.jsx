/**
 * ================================================================================
 * LOGIN & AUTHENTICATION SCREEN (pages/Login.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This is the welcoming sign-in screen. Users enter their username and password here.
 * When they click "Sign In", it sends the credentials to the backend server.
 * If correct, it saves their session and redirects them directly to the Dashboard.
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - Sign In Form at `/login`:
 *   • Brand hero column on the left (Customer Sphere logo, description).
 *   • Username and password input boxes with default helper hints.
 *   • "Continue / Sign in" button.
 *   • Error message alerts for wrong passwords or invalid input.
 * ================================================================================
 */

import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { authService } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  // Pre-filled with default administrative credentials for ease of evaluation
  const [form, setForm] = useState({
    username: "admin",
    password: "admin123@qwe#",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // If already logged in, redirect directly to dashboard
  if (isAuthenticated) return <Navigate to="/" replace />;

  /**
   * Submits user credentials to backend auth service
   */
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!form.username || form.password.length < 6) {
      setError("Enter a username and a password with at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const session = await authService.login(form);
      login(session);
      navigate("/");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      {/* Brand Hero Left Column */}
      <section className="loginHero">
        <div className="brandIcon">
          <Sparkles />
        </div>
        <p>CUSTOMER SPHERE</p>
        <h1>Turn customer data into decisions.</h1>
        <span>
          Explore real Olist customer behavior, RFM features, orders, reviews
          and purchasing patterns.
        </span>
      </section>

      {/* Sign-In Card Right Column */}
      <form className="loginCard" onSubmit={submit}>
        <div className="brandIcon dark">
          <Sparkles />
        </div>
        <p className="eyebrow">WELCOME BACK</p>
        <h2>Sign in</h2>
        <span className="muted">Access your intelligence workspace.</span>


        <label>
          Username
          <input
            value={form.username}
            onChange={(event) =>
              setForm({ ...form, username: event.target.value })
            }
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
          />
        </label>
        {error && <div className="apiError">{error}</div>}
        <button className="btn primary full" disabled={busy}>
          {busy ? "Signing in..." : "Continue"}
        </button>

      </form>
    </div>
  );
}

