import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CustomerReviews from "./CustomerReviews";

describe("CustomerReviews Component", () => {
  const mockReviews = [
    {
      review_id: "rev_1",
      order_id: "ord_1",
      review_score: 5,
      review_comment_title: "Great quality",
      review_comment_message: "Arrived very fast and perfectly packed!",
      review_creation_date: "2018-05-15T00:00:00Z",
    },
  ];

  const mockOrders = [
    { order_id: "ord_1" },
    { order_id: "ord_2" },
  ];

  it("renders review cards, star ratings, and feedback text", () => {
    render(
      <CustomerReviews
        items={mockReviews}
        orders={mockOrders}
        isAdmin={false}
        onAddReview={vi.fn()}
        onEditReview={vi.fn()}
      />
    );

    expect(screen.getByText("Customer reviews")).toBeInTheDocument();
    expect(screen.getByText("Great quality")).toBeInTheDocument();
    expect(screen.getByText("Arrived very fast and perfectly packed!")).toBeInTheDocument();
    expect(screen.getByText(/Order #ord_1/)).toBeInTheDocument();
  });

  it("enables Add Review button when unreviewed orders exist for Admin", () => {
    const mockAddReview = vi.fn();

    render(
      <CustomerReviews
        items={mockReviews}
        orders={mockOrders} // ord_2 is not reviewed
        isAdmin={true}
        onAddReview={mockAddReview}
        onEditReview={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: /add review/i });
    expect(addBtn).not.toBeDisabled();
    fireEvent.click(addBtn);
    expect(mockAddReview).toHaveBeenCalled();
  });

  it("shows informational banner when customer has no orders", () => {
    render(
      <CustomerReviews
        items={[]}
        orders={[]}
        isAdmin={true}
        onAddReview={vi.fn()}
        onEditReview={vi.fn()}
      />
    );

    expect(
      screen.getByText(/Customer has no placed orders/i)
    ).toBeInTheDocument();
  });
});
