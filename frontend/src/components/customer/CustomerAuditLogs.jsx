import React from "react";
import { History } from "lucide-react";

export default function CustomerAuditLogs({ items = [] }) {
  return (
    <div className="timeline">
      {items && items.length ? (
        items.map((item) => (
          <div key={item.id ?? item.created_at}>
            <History size={16} />
            <section>
              <b>{item.action}</b>
              <em>by {item.performed_by}</em>
              {item.details && <p>{item.details}</p>}
              <small>{new Date(item.created_at).toLocaleString()}</small>
            </section>
          </div>
        ))
      ) : (
        <div className="state">No audit logs recorded for this customer.</div>
      )}
    </div>
  );
}
