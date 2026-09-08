import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CustomerProducts from "./CustomerProducts";

describe("CustomerProducts Component", () => {
  const mockProducts = [
    {
      product_id: "prod_123456789",
      category: "health_beauty",
      price: 89.9,
      freight_value: 15.0,
      order_id: "ord_987654",
      order_purchase_timestamp: "2018-04-12T10:00:00Z",
    },
  ];

  it("renders purchased products table headers and product row", () => {
    render(<CustomerProducts items={mockProducts} />);

    expect(screen.getByText("Purchased products")).toBeInTheDocument();
    expect(screen.getByText("Product ID")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("Freight")).toBeInTheDocument();

    expect(screen.getByText("health beauty")).toBeInTheDocument();
    expect(screen.getByText("R$ 89.90")).toBeInTheDocument();
    expect(screen.getByText("R$ 15.00")).toBeInTheDocument();
  });

  it("renders item with missing / null fields with fallbacks", () => {
    const productsWithNulls = [
      {
        product_id: null,
        category: null,
        price: null,
        freight_value: null,
        order_id: null,
        order_purchase_timestamp: null,
      },
    ];

    render(<CustomerProducts items={productsWithNulls} />);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("R$ 0.00")).toHaveLength(2);
  });

  it("displays empty state when products list is empty or null", () => {
    const { rerender } = render(<CustomerProducts items={[]} />);
    expect(screen.getByText("No products found.")).toBeInTheDocument();

    rerender(<CustomerProducts items={null} />);
    expect(screen.getByText("No products found.")).toBeInTheDocument();
  });
});
