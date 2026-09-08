import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoadingState, ErrorState, Page, Panel, Header } from "./States";

describe("States UI Primitives", () => {
  it("renders LoadingState with custom or default text", () => {
    const { rerender } = render(<LoadingState />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    rerender(<LoadingState text="Fetching records..." />);
    expect(screen.getByText("Fetching records...")).toBeInTheDocument();
  });

  it("renders ErrorState with message and retry button action", () => {
    const mockRetry = vi.fn();
    render(<ErrorState message="Connection failed" retry={mockRetry} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Connection failed")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Retry" });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it("renders Page container with children", () => {
    render(
      <Page>
        <span data-testid="child-content">Inside Page</span>
      </Page>
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("renders Panel with title, subtitle, and body content", () => {
    render(
      <Panel title="Order Metrics" sub="Overview of sales">
        <p>Panel Body</p>
      </Panel>
    );

    expect(screen.getByText("Order Metrics")).toBeInTheDocument();
    expect(screen.getByText("Overview of sales")).toBeInTheDocument();
    expect(screen.getByText("Panel Body")).toBeInTheDocument();
  });

  it("renders Header with eyebrow, title, and connected status pill", () => {
    render(
      <Header
        eyebrow="ANALYTICS"
        title="Customer Directory"
        text="Search and explore"
      />
    );

    expect(screen.getByText("ANALYTICS")).toBeInTheDocument();
    expect(screen.getByText("Customer Directory")).toBeInTheDocument();
    expect(screen.getByText("Search and explore")).toBeInTheDocument();
    expect(screen.getByText("● MySQL connected")).toBeInTheDocument();
  });
});
