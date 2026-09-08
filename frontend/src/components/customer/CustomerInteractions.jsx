import React from "react";
import { Activity, Edit2 } from "lucide-react";

export default function CustomerInteractions({ items = [], onEditInteraction, isAdmin }) {
  return (
    <div className="timeline">
      {items && items.length ? (
        items.map((item) => (
          <div key={item.id ?? item.created_at} style={{ position: "relative" }}>
            <Activity size={16} />
            <section style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <b>{item.title}</b>
                {isAdmin && (
                  <button
                    className="btn ghost"
                    onClick={() => onEditInteraction(item)}
                    style={{ padding: "2px 7px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                    title="Edit interaction note"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                )}
              </div>
              <em>{item.interaction_type}</em>
              <p>{item.description}</p>
              <small>
                {new Date(item.created_at.endsWith("Z") ? item.created_at : item.created_at + "Z").toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  dateStyle: "medium",
                  timeStyle: "short",
                })} IST
              </small>
            </section>
          </div>
        ))
      ) : (
        <div className="state">
          No app activity yet. Add the first interaction.
        </div>
      )}
    </div>
  );
}
