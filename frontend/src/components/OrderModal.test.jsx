import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import OrderModal from "./OrderModal";
import * as ApiModule from "../services/api";

describe("OrderModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(ApiModule.productsService, "byCategory").mockResolvedValue({
      items: [
        { product_id: "prod_1", avg_price: 59.9 },
        { product_id: "prod_2", avg_price: 89.0 },
      ],
    });
  });

  const renderOrderModal = async (props = {}) => {
    let result;
    await act(async () => {
      result = render(
        <OrderModal
          order={null}
          close={vi.fn()}
          save={vi.fn()}
          {...props}
        />
      );
    });
    return result;
  };

  const mockOrder = {
    order_id: "ord_edit_123",
    order_status: "delivered",
    payment_type: "credit_card",
    installments: 3,
    price: 120.0,
    freight_value: 20.0,
    order_purchase_timestamp: "2018-05-01T12:00:00Z",
    order_delivered_customer_date: "2018-05-06T12:00:00Z",
  };

  it("renders Add Order modal title and form controls in create mode", async () => {
    await renderOrderModal();

    expect(screen.getByRole("heading", { name: /place new order/i })).toBeInTheDocument();
    expect(screen.getByText(/Order Items & Categories/i)).toBeInTheDocument();
  });

  it("pre-fills order details in edit mode and handles delete with error case", async () => {
    const mockDelete = vi.fn();

    await renderOrderModal({
      order: mockOrder,
      onDelete: mockDelete,
    });

    expect(screen.getByRole("heading", { name: /edit order/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("120")).toBeInTheDocument();
    expect(screen.getByDisplayValue("20")).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: /delete order/i });
    expect(deleteBtn).toBeInTheDocument();

    // Trigger delete with rejection
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockDelete.mockRejectedValueOnce(new Error("Cannot delete completed order"));
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText("Cannot delete completed order")).toBeInTheDocument();
    });

    // Successful delete
    mockDelete.mockResolvedValueOnce({});
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("ord_edit_123");
    });
  });

  it("adds and removes item rows", async () => {
    await renderOrderModal();

    const addRowBtn = screen.getByRole("button", { name: /add another category/i });
    fireEvent.click(addRowBtn);
    expect(screen.getByText(/Order Items & Categories \(2\)/i)).toBeInTheDocument();

    // Remove the second item row
    const removeBtns = screen.getAllByTitle("Remove this item");
    expect(removeBtns.length).toBe(2);
    fireEvent.click(removeBtns[1]);

    expect(screen.getByText(/Order Items & Categories \(1\)/i)).toBeInTheDocument();
  });

  it("updates category, product id, price, and freight in item rows", async () => {
    await renderOrderModal();

    // Change category
    const categoryInput = screen.getByPlaceholderText(/e\.g\. beleza_saude/i);
    fireEvent.change(categoryInput, { target: { value: "relogios_presentes" } });
    await waitFor(() => {
      expect(ApiModule.productsService.byCategory).toHaveBeenCalledWith("relogios_presentes", 60);
    });

    // Change price and freight
    const priceInput = screen.getByPlaceholderText("99.90");
    fireEvent.change(priceInput, { target: { value: "150.00" } });

    const freightInput = screen.getByPlaceholderText("15.00");
    fireEvent.change(freightInput, { target: { value: "25.00" } });

    expect(priceInput.value).toBe("150.00");
    expect(freightInput.value).toBe("25.00");
  });

  it("changes payment method and disables installments for debit and boleto", async () => {
    await renderOrderModal();

    const paymentSelect = screen.getByDisplayValue(/Credit Card/i);
    const installmentsSelect = screen.getByDisplayValue(/1x \(Single\)/i);

    expect(installmentsSelect).not.toBeDisabled();

    // Switch to Boleto
    fireEvent.change(paymentSelect, { target: { value: "boleto" } });
    expect(installmentsSelect).toBeDisabled();

    // Switch to Debit Card
    fireEvent.change(paymentSelect, { target: { value: "debit_card" } });
    expect(installmentsSelect).toBeDisabled();

    // Switch back to Credit Card
    fireEvent.change(paymentSelect, { target: { value: "credit_card" } });
    expect(installmentsSelect).not.toBeDisabled();

    // Change installments
    fireEvent.change(installmentsSelect, { target: { value: "5" } });
    expect(installmentsSelect.value).toBe("5");
  });

  it("changes order status, purchase date, and delivery date", async () => {
    await renderOrderModal();

    const statusSelect = screen.getByDisplayValue(/Delivered/i);
    fireEvent.change(statusSelect, { target: { value: "shipped" } });
    expect(statusSelect.value).toBe("shipped");

    const dateInputs = document.querySelectorAll('input[type="date"]');
    const purchaseDateInput = dateInputs[0];
    const deliveryDateInput = dateInputs[1];

    fireEvent.change(purchaseDateInput, { target: { value: "2018-05-10" } });
    fireEvent.change(deliveryDateInput, { target: { value: "2018-05-15" } });

    expect(purchaseDateInput.value).toBe("2018-05-10");
    expect(deliveryDateInput.value).toBe("2018-05-15");
  });

  it("validates empty category, invalid price, invalid freight, and dates", async () => {
    await renderOrderModal();

    const form = document.querySelector("form.modal");

    // Missing price
    fireEvent.submit(form);
    expect(screen.getByText(/Please enter a valid price greater than R\$ 0\.00 for item #1/i)).toBeInTheDocument();

    // Fill valid price, invalid freight
    fireEvent.change(screen.getByPlaceholderText("99.90"), { target: { value: "50.00" } });
    fireEvent.change(screen.getByPlaceholderText("15.00"), { target: { value: "-5" } });
    fireEvent.submit(form);
    expect(screen.getByText(/Please enter a valid freight value for item #1/i)).toBeInTheDocument();

    // Fix freight, clear category
    fireEvent.change(screen.getByPlaceholderText("15.00"), { target: { value: "10.00" } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. beleza_saude/i), { target: { value: "" } });
    fireEvent.submit(form);
    expect(screen.getByText(/Please select a product category for item #1/i)).toBeInTheDocument();

    // Fix category, set out-of-range purchase date (e.g. 2020)
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. beleza_saude/i), { target: { value: "informatica_acessorios" } });
    await waitFor(() => {
      expect(ApiModule.productsService.byCategory).toHaveBeenCalledWith("informatica_acessorios", 60);
    });
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: "2020-01-01" } });
    fireEvent.submit(form);
    expect(screen.getByText(/Purchase date must be within the database timeline/i)).toBeInTheDocument();

    // Set delivery date before purchase date
    fireEvent.change(dateInputs[0], { target: { value: "2018-05-10" } });
    fireEvent.change(dateInputs[1], { target: { value: "2018-05-01" } });
    fireEvent.submit(form);
    expect(screen.getByText(/Delivery date cannot be earlier than the purchase date/i)).toBeInTheDocument();
  });

  it("handles save rejection and shows API error", async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error("Server failed to record order"));

    await renderOrderModal({
      order: mockOrder,
      save: mockSave,
    });

    const submitBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Server failed to record order")).toBeInTheDocument();
    });
  });

  it("triggers close when clicking cancel button or close icon", async () => {
    const mockClose = vi.fn();

    const { rerender } = await renderOrderModal({
      close: mockClose,
    });

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);
    expect(mockClose).toHaveBeenCalledTimes(1);

    rerender(
      <OrderModal
        order={null}
        close={mockClose}
        save={vi.fn()}
      />
    );

    const closeIconBtn = document.querySelector("button.close");
    fireEvent.click(closeIconBtn);
    expect(mockClose).toHaveBeenCalledTimes(2);
  });
});
