import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AuditLogModal from "./AuditLogModal";
import * as ApiModule from "../services/api";

describe("AuditLogModal Component", () => {
  const mockLogs = [
    {
      id: 1,
      customer_id: "c_123",
      action: "DELETE_ORDER",
      performed_by: "superadmin",
      details: "Deleted cancelled order",
      created_at: "2026-09-01T10:00:00Z",
    },
    {
      id: 2,
      customer_id: "c_456",
      action: "CREATE_CUSTOMER",
      performed_by: "admin",
      details: "Created customer profile in SP",
      created_at: "2026-09-02T11:00:00Z",
    },
    {
      id: 3,
      customer_id: null,
      action: "BULK_UPDATE",
      performed_by: null,
      details: null,
      created_at: "2026-09-03T12:00:00Z",
    },
    {
      id: 4,
      customer_id: "c_789",
      action: "ADD_REVIEW",
      performed_by: "support_rep",
      details: "Added 5 star review",
      created_at: "2026-09-04T14:00:00Z",
    },
    {
      id: 5,
      customer_id: "c_999",
      action: "CUSTOM_UNKNOWN_ACTION",
      performed_by: "system",
      details: "Custom event trigger",
      created_at: "2026-09-05T15:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and displays global audit log entries with various action badges", async () => {
    vi.spyOn(ApiModule.customerService, "globalAuditLogs").mockResolvedValue({
      items: mockLogs,
    });

    const { container } = render(<AuditLogModal close={vi.fn()} />);

    expect(screen.getByText(/Admin Data Activity Log/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("DELETE_ORDER")).toBeInTheDocument();
      expect(screen.getByText("CREATE_CUSTOMER")).toBeInTheDocument();
      expect(screen.getByText("BULK_UPDATE")).toBeInTheDocument();
      expect(screen.getByText("ADD_REVIEW")).toBeInTheDocument();
      expect(screen.getByText("CUSTOM_UNKNOWN_ACTION")).toBeInTheDocument();
      expect(screen.getByText("superadmin")).toBeInTheDocument();
      expect(screen.getByText("No extra metadata recorded.")).toBeInTheDocument();
      expect(screen.getByText("Target: c_123")).toBeInTheDocument();
      expect(container).toHaveTextContent(/showing 5 recorded admin operations/i);
    });
  });

  it("handles search input and submission", async () => {
    const spy = vi.spyOn(ApiModule.customerService, "globalAuditLogs").mockResolvedValue({
      items: [mockLogs[0]],
    });

    render(<AuditLogModal close={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("DELETE_ORDER")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search audit details or customer id/i);
    fireEvent.change(searchInput, { target: { value: "c_123" } });

    const searchBtn = screen.getByRole("button", { name: /^search$/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        action: undefined,
        q: "c_123",
        limit: 100,
      });
    });
  });

  it("handles filtering by action type from dropdown", async () => {
    const spy = vi.spyOn(ApiModule.customerService, "globalAuditLogs").mockResolvedValue({
      items: [mockLogs[1]],
    });

    render(<AuditLogModal close={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("CREATE_CUSTOMER")).toBeInTheDocument();
    });

    const filterSelect = screen.getByRole("combobox");
    fireEvent.change(filterSelect, { target: { value: "Customer" } });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        action: "Customer",
        q: undefined,
        limit: 100,
      });
    });
  });

  it("handles refresh button click", async () => {
    const spy = vi.spyOn(ApiModule.customerService, "globalAuditLogs").mockResolvedValue({
      items: mockLogs,
    });

    render(<AuditLogModal close={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("DELETE_ORDER")).toBeInTheDocument();
    });

    const refreshBtn = screen.getByTitle("Refresh logs");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  it("displays error message when fetching audit logs fails", async () => {
    vi.spyOn(ApiModule.customerService, "globalAuditLogs").mockRejectedValue(
      new Error("Failed to connect to audit microservice")
    );

    render(<AuditLogModal close={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to connect to audit microservice")
      ).toBeInTheDocument();
    });
  });

  it("displays empty state when no logs match criteria", async () => {
    vi.spyOn(ApiModule.customerService, "globalAuditLogs").mockResolvedValue({
      items: [],
    });

    const { container } = render(<AuditLogModal close={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText(/no audit log entries found/i)
      ).toBeInTheDocument();
      expect(container).toHaveTextContent(/showing 0 recorded admin operations/i);
    });
  });

  it("calls close handler when clicking close icon or footer Close button", async () => {
    vi.spyOn(ApiModule.customerService, "globalAuditLogs").mockResolvedValue({
      items: [],
    });

    const mockClose = vi.fn();
    const { container } = render(<AuditLogModal close={mockClose} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading admin activity trail.../i)).not.toBeInTheDocument();
    });

    const closeBtn = container.querySelector("button.close");
    fireEvent.click(closeBtn);
    expect(mockClose).toHaveBeenCalledTimes(1);

    const footerCloseBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(footerCloseBtn);
    expect(mockClose).toHaveBeenCalledTimes(2);
  });
});
