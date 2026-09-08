import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CustomerOrders from "./CustomerOrders";

describe("CustomerOrders Component", () => {
  const mockOrders = [
    {
      order_id: "ord_abc123456789",
      order_status: "delivered",
      payment_type: "credit_card",
      installments: 3,
      order_purchase_timestamp: "2018-05-10T14:30:00Z",
      order_delivered_customer_date: "2018-05-15T18:00:00Z",
      order_value: 249.9,
    },
    {
      order_id: "ord_xyz987",
      order_status: "shipped",
      payment_type: null,
      installments: 1,
      order_purchase_timestamp: "2018-06-01T10:00:00Z",
      order_delivered_customer_date: null,
      order_value: 100.0,
    },
  ];

  it("renders order items and formatted payment installments", () => {
    render(
      <CustomerOrders
        items={mockOrders}
        isAdmin={false}
        onAddOrder={vi.fn()}
        onEditOrder={vi.fn()}
      />
    );

    expect(screen.getByText("Order history")).toBeInTheDocument();
    expect(screen.getByText("delivered")).toBeInTheDocument();
    expect(screen.getByText("shipped")).toBeInTheDocument();
    expect(screen.getByText(/credit card/i)).toBeInTheDocument();
    expect(screen.getByText(/\(3x\)/i)).toBeInTheDocument();
    expect(screen.getByText("R$ 249.90")).toBeInTheDocument();
    expect(screen.getByText("R$ 100.00")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("shows Add Order and Edit buttons for Admin users", () => {
    const mockAdd = vi.fn();
    const mockEdit = vi.fn();

    render(
      <CustomerOrders
        items={mockOrders}
        isAdmin={true}
        onAddOrder={mockAdd}
        onEditOrder={mockEdit}
      />
    );

    const addButton = screen.getByRole("button", { name: /add order/i });
    expect(addButton).toBeInTheDocument();
    fireEvent.click(addButton);
    expect(mockAdd).toHaveBeenCalled();

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    expect(editButtons).toHaveLength(2);
    fireEvent.click(editButtons[0]);
    expect(mockEdit).toHaveBeenCalledWith(mockOrders[0]);
  });

  it("hides Add Order and Edit buttons for read-only viewers", () => {
    render(
      <CustomerOrders
        items={mockOrders}
        isAdmin={false}
        onAddOrder={vi.fn()}
        onEditOrder={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /add order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
  });

  it("renders empty state message when order history is empty or omitted", () => {
    const { rerender } = render(
      <CustomerOrders
        items={[]}
        isAdmin={false}
        onAddOrder={vi.fn()}
        onEditOrder={vi.fn()}
      />
    );
    expect(screen.getByText(/No orders yet/i)).toBeInTheDocument();

    rerender(
      <CustomerOrders
        items={null}
        isAdmin={false}
        onAddOrder={vi.fn()}
        onEditOrder={vi.fn()}
      />
    );
    expect(screen.getByText(/No orders yet/i)).toBeInTheDocument();
  });
});
