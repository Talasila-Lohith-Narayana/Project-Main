import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast } from "./ToastContext";

// Helper component that exposes toast methods via buttons
function ToastTrigger() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success("Success message")}>show-success</button>
      <button onClick={() => toast.error("Error message")}>show-error</button>
      <button onClick={() => toast.warning("Warning message")}>show-warning</button>
      <button onClick={() => toast.info("Info message")}>show-info</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <ToastTrigger />
    </ToastProvider>
  );
}

describe("ToastContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a success toast when toast.success() is called", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("show-success"));
    expect(screen.getByText("Success message")).toBeInTheDocument();
    expect(screen.getByText("Success message").closest(".toast")).toHaveClass("toast--success");
  });

  it("renders an error toast when toast.error() is called", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("show-error"));
    expect(screen.getByText("Error message")).toBeInTheDocument();
    expect(screen.getByText("Error message").closest(".toast")).toHaveClass("toast--error");
  });

  it("renders a warning toast when toast.warning() is called", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("show-warning"));
    expect(screen.getByText("Warning message")).toBeInTheDocument();
    expect(screen.getByText("Warning message").closest(".toast")).toHaveClass("toast--warning");
  });

  it("renders an info toast when toast.info() is called", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("show-info"));
    expect(screen.getByText("Info message")).toBeInTheDocument();
    expect(screen.getByText("Info message").closest(".toast")).toHaveClass("toast--info");
  });

  it("auto-dismisses a success toast after its duration", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("show-success"));
    expect(screen.getByText("Success message")).toBeInTheDocument();

    // Advance past the 4000ms success duration
    act(() => { vi.advanceTimersByTime(4000); });

    // The exit animation class should be applied
    expect(screen.getByText("Success message").closest(".toast")).toHaveClass("toast--exit");

    // After exit animation (320ms), the toast is removed from the DOM
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.queryByText("Success message")).not.toBeInTheDocument();
  });

  it("auto-dismisses an error toast after its longer duration", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("show-error"));
    expect(screen.getByText("Error message")).toBeInTheDocument();

    // Error toasts last 6000ms
    act(() => { vi.advanceTimersByTime(6000); });
    expect(screen.getByText("Error message").closest(".toast")).toHaveClass("toast--exit");

    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.queryByText("Error message")).not.toBeInTheDocument();
  });

  it("removes a toast when the dismiss button is clicked", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("show-success"));

    const dismissButton = screen.getByLabelText("Dismiss notification");
    fireEvent.click(dismissButton);

    // Exit animation applied
    expect(screen.getByText("Success message").closest(".toast")).toHaveClass("toast--exit");

    // After exit animation, removed from DOM
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.queryByText("Success message")).not.toBeInTheDocument();
  });

  it("can display multiple toasts at the same time", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("show-success"));
    fireEvent.click(screen.getByText("show-error"));
    fireEvent.click(screen.getByText("show-warning"));

    expect(screen.getByText("Success message")).toBeInTheDocument();
    expect(screen.getByText("Error message")).toBeInTheDocument();
    expect(screen.getByText("Warning message")).toBeInTheDocument();
  });

  it("limits visible toasts to MAX_VISIBLE (5)", () => {
    renderWithProvider();

    // Trigger 6 toasts
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText("show-info"));
    }

    // Only 5 should be visible (the max)
    const toasts = screen.getAllByText("Info message");
    expect(toasts.length).toBeLessThanOrEqual(5);
  });

  it("renders the toast container with correct accessibility attributes", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("show-success"));

    const container = screen.getByLabelText("Notifications");
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute("aria-live", "polite");
  });

  it("each toast has role=status for screen readers", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("show-success"));

    const toast = screen.getByText("Success message").closest(".toast");
    expect(toast).toHaveAttribute("role", "status");
  });

  it("each toast has a countdown progress bar", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("show-success"));

    const toast = screen.getByText("Success message").closest(".toast");
    const progressBar = toast.querySelector(".toastProgress");
    expect(progressBar).toBeInTheDocument();
    // Success duration is 4000ms
    expect(progressBar.style.animationDuration).toBe("4000ms");
  });

  it("throws an error when useToast is used outside ToastProvider", () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ToastTrigger />)).toThrow(
      "useToast must be used within a ToastProvider"
    );
    spy.mockRestore();
  });
});
