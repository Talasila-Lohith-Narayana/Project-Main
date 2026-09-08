import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductFilterModal from "./ProductFilterModal";

describe("ProductFilterModal Component", () => {
  const mockValues = {
    category: "health_beauty",
    minPrice: "20",
    maxPrice: "150",
    minUnits: "5",
    minRating: "4.0",
  };

  const mockCategories = ["health_beauty", "sports_leisure", "watches_gifts"];

  it("renders product filter modal with active values", () => {
    render(
      <ProductFilterModal
        values={mockValues}
        categories={mockCategories}
        close={vi.fn()}
        apply={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /filter products/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("20")).toBeInTheDocument();
    expect(screen.getByDisplayValue("150")).toBeInTheDocument();
  });

  it("calls apply callback on form submit", () => {
    const mockApply = vi.fn();

    render(
      <ProductFilterModal
        values={mockValues}
        categories={mockCategories}
        close={vi.fn()}
        apply={mockApply}
      />
    );

    const applyBtn = screen.getByRole("button", { name: "Apply filters" });
    fireEvent.click(applyBtn);

    expect(mockApply).toHaveBeenCalledWith(expect.objectContaining({
      category: "health_beauty",
      minPrice: "20",
      maxPrice: "150",
      minUnits: "5",
      minRating: "4.0",
    }));
  });

  it("updates inputs for category, minPrice, maxPrice, minUnits, and minRating", () => {
    const mockApply = vi.fn();

    render(
      <ProductFilterModal
        values={{
          category: "",
          minPrice: "",
          maxPrice: "",
          minUnits: "",
          minRating: "",
        }}
        categories={mockCategories}
        close={vi.fn()}
        apply={mockApply}
      />
    );

    fireEvent.change(screen.getByLabelText(/Product Category/i), {
      target: { value: "sports_leisure" },
    });
    fireEvent.change(screen.getByLabelText(/Min Price/i), {
      target: { value: "35" },
    });
    fireEvent.change(screen.getByLabelText(/Max Price/i), {
      target: { value: "250" },
    });
    fireEvent.change(screen.getByLabelText(/Min Units Sold/i), {
      target: { value: "15" },
    });
    fireEvent.change(screen.getByLabelText(/Minimum Star Rating/i), {
      target: { value: "4.5" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(mockApply).toHaveBeenCalledWith({
      category: "sports_leisure",
      minPrice: "35",
      maxPrice: "250",
      minUnits: "15",
      minRating: "4.5",
    });
  });

  it("resets filter values on clear", () => {
    render(
      <ProductFilterModal
        values={mockValues}
        categories={mockCategories}
        close={vi.fn()}
        apply={vi.fn()}
      />
    );

    const resetBtn = screen.getByRole("button", { name: /reset filters/i });
    fireEvent.click(resetBtn);

    expect(screen.getByPlaceholderText("e.g. 50").value).toBe("");
  });

  it("calls close when clicking close X button", () => {
    const mockClose = vi.fn();

    render(
      <ProductFilterModal
        values={mockValues}
        categories={null}
        close={mockClose}
        apply={vi.fn()}
      />
    );

    const closeBtn = document.querySelector("button.close");
    fireEvent.click(closeBtn);

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
