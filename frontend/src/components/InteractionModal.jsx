/**
 * ================================================================================
 * LOG / EDIT CRM INTERACTION MODAL (components/InteractionModal.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This is the touchpoint log popup. Team members record customer communication
 * records here (phone calls, emails, support tickets, meetings, notes, and follow-ups).
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - "Log Activity" button on the customer profile page (`Customer.jsx`).
 * - "Edit" button on CRM interaction cards in the Activity timeline tab.
 * ================================================================================
 */

import React, { useState } from "react";
import { X } from "lucide-react";

// Standard supported interaction types
const types = ["Call", "Email", "Support", "Note", "Follow-up", "Other"];

export default function InteractionModal({ interaction, close, save }) {
  const isEdit = Boolean(interaction);
  const [form, setForm] = useState({
    interaction_type: interaction?.interaction_type || "Call",
    title: interaction?.title || "",
    description: interaction?.description || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /**
   * Validates title and note description before submitting
   */
  async function submit(event) {
    event.preventDefault();
    const cleanTitle = form.title.trim();
    const cleanDesc = form.description.trim();

    if (!cleanTitle) {
      setError("Please provide a subject title for this activity note.");
      return;
    }
    if (cleanTitle.length < 3) {
      setError("Activity title is too short (minimum 3 characters required).");
      return;
    }
    if (!cleanDesc) {
      setError("Please provide detailed notes describing what occurred.");
      return;
    }
    if (cleanDesc.length < 5) {
      setError("Activity description is too brief (minimum 5 characters required).");
      return;
    }
    setBusy(true);
    try {
      await save({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modalBg">
      <form className="modal" onSubmit={submit}>
        <button type="button" className="close" onClick={close}>
          <X size={18} />
        </button>
        <p className="eyebrow">CUSTOMER ACTIVITY</p>
        <h2>{isEdit ? "Edit interaction" : "Add interaction"}</h2>
        <label>
          Type
          <select
            value={form.interaction_type}
            onChange={(event) =>
              setForm({ ...form, interaction_type: event.target.value })
            }
          >
            {types.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          Title
          <input
            maxLength="120"
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            placeholder="Discussed delivery experience"
          />
        </label>
        <label>
          Description
          <textarea
            maxLength="1000"
            rows="5"
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            placeholder="Write a useful interaction note..."
          />
        </label>
        {error && <div className="apiError">{error}</div>}
        <div className="actions">
          <button type="button" className="btn secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? "Saving..." : "Save interaction"}
          </button>
        </div>
      </form>
    </div>
  );
}

