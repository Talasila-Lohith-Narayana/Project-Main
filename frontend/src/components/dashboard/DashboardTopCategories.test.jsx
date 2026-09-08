import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardTopCategories from "./DashboardTopCategories";

describe("DashboardTopCategories Component", () => {
  const mockCategories = [
    { category: "health_beauty", purchases: 9670 },
    { category: "watches_gifts", purchases: 5991 },
  ];

  it("renders top categories leaderboard with rank numbers and purchase counts", () => {
    const mockNavigate = vi.fn();

    render(
      <DashboardTopCategories
        categories={mockCategories}
        navigate={mockNavigate}
      />
    );

    expect(screen.getByText("Top product categories")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("health beauty")).toBeInTheDocument();
    expect(screen.getByText("9,670 items sold")).toBeInTheDocument();

    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("watches gifts")).toBeInTheDocument();
  });

  it("navigates to products catalog filtered by category on item click", () => {
    const mockNavigate = vi.fn();

    render(
      <DashboardTopCategories
        categories={mockCategories}
        navigate={mockNavigate}
      />
    );

    const firstCategory = screen.getByTitle("View products under health beauty");
    fireEvent.click(firstCategory);

    expect(mockNavigate).toHaveBeenCalledWith("/products?category=health_beauty");
  });
});
