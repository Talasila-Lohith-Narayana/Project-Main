import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CustomerAuditLogs from "./CustomerAuditLogs";

describe("CustomerAuditLogs Component", () => {
  const mockLogs = [
    {
      id: 1,
      action: "UPDATE_PROFILE",
      performed_by: "admin",
      details: "Changed city to Sao Paulo",
      created_at: "2026-09-01T12:00:00Z",
    },
    {
      id: null,
      action: "DELETE_NOTE",
      performed_by: "superadmin",
      details: null,
      created_at: "2026-09-02T14:00:00Z",
    },
  ];

  it("renders audit actions, operator username, and detail notes", () => {
    render(<CustomerAuditLogs items={mockLogs} />);

    expect(screen.getByText("UPDATE_PROFILE")).toBeInTheDocument();
    expect(screen.getByText("by admin")).toBeInTheDocument();
    expect(screen.getByText("Changed city to Sao Paulo")).toBeInTheDocument();
    expect(screen.getByText("DELETE_NOTE")).toBeInTheDocument();
  });

  it("renders empty state when no audit logs exist or prop is omitted", () => {
    const { rerender } = render(<CustomerAuditLogs items={[]} />);
    expect(
      screen.getByText("No audit logs recorded for this customer.")
    ).toBeInTheDocument();

    rerender(<CustomerAuditLogs items={null} />);
    expect(
      screen.getByText("No audit logs recorded for this customer.")
    ).toBeInTheDocument();

    rerender(<CustomerAuditLogs />);
    expect(
      screen.getByText("No audit logs recorded for this customer.")
    ).toBeInTheDocument();
  });
});
