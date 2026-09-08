import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardReviewSatisfaction from "./DashboardReviewSatisfaction";

describe("DashboardReviewSatisfaction Component", () => {
  const mockRatingsDist = [
    { stars: 5, count: 60 },
    { stars: 4, count: 20 },
    { stars: 3, count: 10 },
    { stars: 2, count: 5 },
    { stars: 1, count: 5 },
  ];

  const mockKpis = {
    avg_rating: 4.15,
  };

  it("renders overall satisfaction score badge", () => {
    render(
      <DashboardReviewSatisfaction
        ratingsDist={mockRatingsDist}
        kpis={mockKpis}
        navigate={vi.fn()}
      />
    );

    expect(screen.getByText("OVERALL SATISFACTION")).toBeInTheDocument();
    expect(screen.getByText("4.15 / 5.0")).toBeInTheDocument();
  });

  it("navigates to customer rating filter when clicking a star rating row", () => {
    const mockNavigate = vi.fn();

    render(
      <DashboardReviewSatisfaction
        ratingsDist={mockRatingsDist}
        kpis={mockKpis}
        navigate={mockNavigate}
      />
    );

    const fiveStarRow = screen.getByTitle("View customers with 5-star reviews");
    fireEvent.click(fiveStarRow);

    expect(mockNavigate).toHaveBeenCalledWith("/customers?rating=5");
  });
});
