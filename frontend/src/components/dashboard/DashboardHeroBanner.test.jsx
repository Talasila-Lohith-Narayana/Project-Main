import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardHeroBanner from "./DashboardHeroBanner";

describe("DashboardHeroBanner Component", () => {
  const mockData = {
    top_states: new Array(20).fill({ state: "SP" }),
  };

  const mockCustomRange = {
    startDate: "2017-01-01",
    endDate: "2018-08-31",
  };

  it("renders executive title and all timeframe selection pills", () => {
    render(
      <DashboardHeroBanner
        data={mockData}
        timeframe="all"
        setTimeframe={vi.fn()}
        customRange={mockCustomRange}
        setCustomRange={vi.fn()}
        handleApplyCustom={vi.fn()}
        load={vi.fn()}
      />
    );

    expect(screen.getByText("Executive Business Overview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All-Time History" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Year 2018" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Year 2017" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Year 2016" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom Range" })).toBeInTheDocument();
  });

  it("calls setTimeframe when clicking a timeframe pill", () => {
    const mockSetTimeframe = vi.fn();

    render(
      <DashboardHeroBanner
        data={mockData}
        timeframe="all"
        setTimeframe={mockSetTimeframe}
        customRange={mockCustomRange}
        setCustomRange={vi.fn()}
        handleApplyCustom={vi.fn()}
        load={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Year 2018" }));
    expect(mockSetTimeframe).toHaveBeenCalledWith("2018");
  });

  it("renders custom date range inputs and triggers setCustomRange callbacks", () => {
    const mockApplyCustom = vi.fn((e) => e.preventDefault());
    let customState = { ...mockCustomRange };
    const mockSetCustomRange = vi.fn((updater) => {
      if (typeof updater === "function") {
        customState = updater(customState);
      }
    });

    const { container } = render(
      <DashboardHeroBanner
        data={mockData}
        timeframe="custom"
        setTimeframe={vi.fn()}
        customRange={customState}
        setCustomRange={mockSetCustomRange}
        handleApplyCustom={mockApplyCustom}
        load={vi.fn()}
      />
    );

    expect(screen.getByText("From:")).toBeInTheDocument();
    expect(screen.getByText("To:")).toBeInTheDocument();

    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs).toHaveLength(2);

    fireEvent.change(dateInputs[0], { target: { value: "2017-04-15" } });
    expect(mockSetCustomRange).toHaveBeenCalled();
    expect(customState.startDate).toBe("2017-04-15");

    fireEvent.change(dateInputs[1], { target: { value: "2018-05-20" } });
    expect(mockSetCustomRange).toHaveBeenCalled();
    expect(customState.endDate).toBe("2018-05-20");

    const applyBtn = screen.getByRole("button", { name: "Apply Range" });
    fireEvent.click(applyBtn);

    expect(mockApplyCustom).toHaveBeenCalled();
  });

  it("calls load when clicking Custom Range pill", () => {
    const mockLoad = vi.fn();
    const mockSetTimeframe = vi.fn();

    render(
      <DashboardHeroBanner
        data={mockData}
        timeframe="all"
        setTimeframe={mockSetTimeframe}
        customRange={mockCustomRange}
        setCustomRange={vi.fn()}
        handleApplyCustom={vi.fn()}
        load={mockLoad}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Custom Range" }));
    expect(mockSetTimeframe).toHaveBeenCalledWith("custom");
    expect(mockLoad).toHaveBeenCalledWith("custom", mockCustomRange);
  });

  it("displays quick reach stats with custom data and with default fallback", () => {
    const { rerender } = render(
      <DashboardHeroBanner
        data={mockData}
        timeframe="all"
        setTimeframe={vi.fn()}
        customRange={mockCustomRange}
        setCustomRange={vi.fn()}
        handleApplyCustom={vi.fn()}
        load={vi.fn()}
      />
    );

    expect(screen.getByText("20 States")).toBeInTheDocument();
    expect(screen.getByText("73 Categories")).toBeInTheDocument();

    rerender(
      <DashboardHeroBanner
        data={null}
        timeframe="all"
        setTimeframe={vi.fn()}
        customRange={mockCustomRange}
        setCustomRange={vi.fn()}
        handleApplyCustom={vi.fn()}
        load={vi.fn()}
      />
    );

    expect(screen.getByText("27 States")).toBeInTheDocument();
  });
});
