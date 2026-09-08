import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReviewModal from "./ReviewModal";

describe("ReviewModal Component", () => {
  const mockReview = {
    review_id: "rev_123",
    order_id: "ord_100",
    review_score: 4,
    review_comment_title: "Good purchase",
    review_comment_message: "Item arrived as described.",
    review_creation_date: "2018-06-15T12:00:00Z",
  };

  const mockOrders = [
    {
      order_id: "ord_100",
      order_value: 120.5,
      order_status: "delivered",
      order_purchase_timestamp: "2018-06-10T10:00:00Z",
    },
    {
      order_id: "ord_200",
      order_value: 85.0,
      order_status: "delivered",
      order_purchase_timestamp: "2018-06-12T10:00:00Z",
    },
  ];

  it("renders with edit title and pre-filled inputs when editing", () => {
    render(
      <ReviewModal
        review={mockReview}
        orders={mockOrders}
        close={vi.fn()}
        save={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /edit review/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Good purchase")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Item arrived as described.")).toBeInTheDocument();
    expect(screen.getByText("4 / 5 Stars")).toBeInTheDocument();
  });

  it("renders add review modal when review prop is null and handles order dropdown", () => {
    render(
      <ReviewModal
        review={null}
        orders={mockOrders}
        existingReviews={[{ review_id: "other_rev", order_id: "ord_999" }]}
        close={vi.fn()}
        save={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /add customer review/i })).toBeInTheDocument();
    expect(screen.getByText("5 / 5 Stars")).toBeInTheDocument();

    // Multiple available orders -> select dropdown should be rendered
    const orderSelect = screen.getByRole("combobox");
    expect(orderSelect).toBeInTheDocument();
    fireEvent.change(orderSelect, { target: { value: "ord_200" } });
    expect(orderSelect.value).toBe("ord_200");
  });

  it("filters out orders that already have reviews when creating", () => {
    const existingReviews = [{ review_id: "rev_existing", order_id: "ord_100" }];
    render(
      <ReviewModal
        review={null}
        orders={mockOrders}
        existingReviews={existingReviews}
        close={vi.fn()}
        save={vi.fn()}
      />
    );

    // Only ord_200 is available, so availableOrders length is 1 -> select is not rendered
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("handles star rating hover and clicking", () => {
    const { container } = render(
      <ReviewModal
        review={null}
        orders={mockOrders}
        close={vi.fn()}
        save={vi.fn()}
      />
    );

    const starButtons = container.querySelectorAll("label button");
    expect(starButtons).toHaveLength(5);

    // Hover 3rd star
    fireEvent.mouseEnter(starButtons[2]);
    // Mouse leave
    fireEvent.mouseLeave(starButtons[2]);

    // Click 2nd star
    fireEvent.click(starButtons[1]);
    expect(screen.getByText("2 / 5 Stars")).toBeInTheDocument();
  });

  it("submits valid review payload to save callback", async () => {
    const mockSave = vi.fn().mockResolvedValue({});

    render(
      <ReviewModal
        review={mockReview}
        orders={mockOrders}
        close={vi.fn()}
        save={mockSave}
      />
    );

    // Edit fields
    const titleInput = screen.getByPlaceholderText(/e.g. Ótimo produto/i);
    fireEvent.change(titleInput, { target: { value: "Super Great Product" } });

    const messageInput = screen.getByPlaceholderText(/enter customer feedback/i);
    fireEvent.change(messageInput, { target: { value: "Fast delivery and awesome quality" } });

    const submitBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        review_score: 4,
        review_comment_title: "Super Great Product",
        review_comment_message: "Fast delivery and awesome quality",
        order_id: "ord_100",
        review_creation_date: "2018-06-15T12:00:00",
      });
    });
  });

  it("validates review date cannot be earlier than order purchase date", async () => {
    const mockSave = vi.fn();
    const { container } = render(
      <ReviewModal
        review={null}
        orders={mockOrders}
        close={vi.fn()}
        save={mockSave}
      />
    );

    // ord_100 purchase date is 2018-06-10. Set review date to 2018-06-01
    const dateInput = container.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: "2018-06-01" } });

    const form = container.querySelector("form");
    fireEvent.submit(form);

    expect(
      screen.getByText(/Review date cannot be earlier than the order purchase date/i)
    ).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("displays error when save callback rejects", async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error("Database connection lost"));

    render(
      <ReviewModal
        review={mockReview}
        orders={mockOrders}
        close={vi.fn()}
        save={mockSave}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Database connection lost")).toBeInTheDocument();
    });
  });

  it("calls close handler on cancel button and X button click", () => {
    const mockClose = vi.fn();

    const { container } = render(
      <ReviewModal
        review={null}
        orders={mockOrders}
        close={mockClose}
        save={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);
    expect(mockClose).toHaveBeenCalledTimes(1);

    const closeXBtn = container.querySelector("button.close");
    fireEvent.click(closeXBtn);
    expect(mockClose).toHaveBeenCalledTimes(2);
  });

  it("handles fallback when review has invalid or null date", () => {
    render(
      <ReviewModal
        review={{
          review_id: "rev_invalid",
          review_score: 3,
          review_creation_date: "invalid-date-string",
        }}
        orders={[]}
        close={vi.fn()}
        save={vi.fn()}
      />
    );

    expect(screen.getByText("3 / 5 Stars")).toBeInTheDocument();
  });
});
