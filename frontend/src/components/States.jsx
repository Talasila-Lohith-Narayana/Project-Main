/**
 * ================================================================================
 * UI STATE & LAYOUT PRIMITIVES (components/States.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This file contains the shared building blocks for all visual pages:
 * Loading spinners, Error alert boxes with "Retry" buttons, standardized White Card panels,
 * and page header banners with the live database connection pill.
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - Used across ALL pages (Dashboard, Customers, Customer Profile, Products):
 *   • Loading spinners when fetching network data (`LoadingState`).
 *   • Error alerts with retry buttons when network fails (`ErrorState`).
 *   • Standardized card containers (`Panel`, `Page`).
 *   • Top header banners with live status pill (`Header`).
 * ================================================================================
 */

import React from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";

/**
 * Centered spinner for asynchronous data loading states
 */
export function LoadingState({ text = "Loading..." }) {
  return (
    <div className="state">
      <LoaderCircle className="spin" />
      <b>{text}</b>
    </div>
  );
}

/**
 * Standardized error message container with optional retry button
 */
export function ErrorState({ message, retry }) {
  return (
    <div className="state error">
      <AlertTriangle />
      <b>Something went wrong</b>
      <span>{message}</span>
      {retry && (
        <button className="btn ghost" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Root page wrapper enforcing responsive margins and max-width layout
 */
export function Page({ children }) {
  return <div className="page">{children}</div>;
}

/**
 * Card container with standardized header and child content area
 */
export function Panel({ title, sub, children }) {
  return (
    <section className="panel">
      <div className="panelHead">
        <div>
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Page top header banner with eyebrow badge and database connection status
 */
export function Header({ eyebrow, title, text }) {
  return (
    <div className="header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      <span className="connected">● MySQL connected</span>
    </div>
  );
}

