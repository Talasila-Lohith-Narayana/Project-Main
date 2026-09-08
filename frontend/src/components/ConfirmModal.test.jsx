import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmModal from "./ConfirmModal";

describe("ConfirmModal Component", () => {
  it("renders with default props", () => {
    render(<ConfirmModal onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders custom title, message, and button labels", () => {
    render(
      <ConfirmModal
        title="Delete Order #12345?"
        message="All payments will be deleted permanently."
        confirmLabel="Delete Permanently"
        cancelLabel="Keep Order"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Delete Order #12345?")).toBeInTheDocument();
    expect(screen.getByText("All payments will be deleted permanently.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Permanently" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep Order" })).toBeInTheDocument();
  });

  it("triggers onConfirm callback when clicking the confirm button", () => {
    const handleConfirm = vi.fn();
    render(<ConfirmModal onConfirm={handleConfirm} onCancel={vi.fn()} />);

    const confirmBtn = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("triggers onCancel callback when clicking cancel button or close icon", () => {
    const handleCancel = vi.fn();
    render(<ConfirmModal onConfirm={vi.fn()} onCancel={handleCancel} />);

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(handleCancel).toHaveBeenCalledTimes(2);
  });

  it("disables buttons and shows loading text while loading", () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmModal
        loading={true}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: /processing/i });
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    const closeBtn = screen.getByRole("button", { name: "Close" });

    expect(confirmBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(closeBtn).toBeDisabled();

    fireEvent.click(confirmBtn);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it("supports non-danger styling without warning icon", () => {
    render(
      <ConfirmModal
        isDanger={false}
        confirmLabel="Save"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: "Save" });
    expect(confirmBtn).toHaveClass("primary");
    expect(confirmBtn).not.toHaveClass("danger");
  });
});
