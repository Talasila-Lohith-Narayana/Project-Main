import React from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
export function LoadingState({ text = "Loading..." }) {
  return (
    <div className="state">
      <LoaderCircle className="spin" />
      <b>{text}</b>
    </div>
  );
}
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
export function Page({ children }) {
  return <div className="page">{children}</div>;
}
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

