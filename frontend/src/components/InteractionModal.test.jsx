import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InteractionModal from "./InteractionModal";

describe("InteractionModal Component", () => {
  const mockInteraction = {
    id: 10,
    interaction_type: "Email",
    title: "Support Ticket #4910",
    description: "Assisted user with delivery timeline questions.",
  };

  it("renders with edit title and pre-filled fields when editing", () => {
    render(
      <InteractionModal
        interaction={mockInteraction}
        close={vi.fn()}
        save={vi.fn()}
      />
    );

    expect(screen.getByText("Edit interaction")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Email")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Support Ticket #4910")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Assisted user with delivery timeline questions.")
    ).toBeInTheDocument();
  });

  it("renders add interaction modal with default values when interaction is null", () => {
    render(
      <InteractionModal
        interaction={null}
        close={vi.fn()}
        save={vi.fn()}
      />
    );

    expect(screen.getByText("Add interaction")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Call")).toBeInTheDocument();
  });

  it("validates empty title", () => {
    render(<InteractionModal interaction={null} close={vi.fn()} save={vi.fn()} />);

    const saveBtn = screen.getByRole("button", { name: "Save interaction" });
    fireEvent.click(saveBtn);

    expect(
      screen.getByText("Please provide a subject title for this activity note.")
    ).toBeInTheDocument();
  });

  it("validates short title (less than 3 characters)", () => {
    render(<InteractionModal interaction={null} close={vi.fn()} save={vi.fn()} />);

    const titleInput = screen.getByPlaceholderText(/discussed delivery experience/i);
    fireEvent.change(titleInput, { target: { value: "ab" } });

    const saveBtn = screen.getByRole("button", { name: "Save interaction" });
    fireEvent.click(saveBtn);

    expect(
      screen.getByText("Activity title is too short (minimum 3 characters required).")
    ).toBeInTheDocument();
  });

  it("validates empty description", () => {
    render(<InteractionModal interaction={null} close={vi.fn()} save={vi.fn()} />);

    const titleInput = screen.getByPlaceholderText(/discussed delivery experience/i);
    fireEvent.change(titleInput, { target: { value: "Valid Title" } });

    const saveBtn = screen.getByRole("button", { name: "Save interaction" });
    fireEvent.click(saveBtn);

    expect(
      screen.getByText("Please provide detailed notes describing what occurred.")
    ).toBeInTheDocument();
  });

  it("validates short description (less than 5 characters)", () => {
    render(<InteractionModal interaction={null} close={vi.fn()} save={vi.fn()} />);

    const titleInput = screen.getByPlaceholderText(/discussed delivery experience/i);
    fireEvent.change(titleInput, { target: { value: "Valid Title" } });

    const descInput = screen.getByPlaceholderText(/write a useful interaction note/i);
    fireEvent.change(descInput, { target: { value: "word" } });

    const saveBtn = screen.getByRole("button", { name: "Save interaction" });
    fireEvent.click(saveBtn);

    expect(
      screen.getByText("Activity description is too brief (minimum 5 characters required).")
    ).toBeInTheDocument();
  });

  it("allows selecting interaction type and editing description before saving", async () => {
    const mockSave = vi.fn().mockResolvedValue({});

    render(
      <InteractionModal
        interaction={null}
        close={vi.fn()}
        save={mockSave}
      />
    );

    const typeSelect = screen.getByRole("combobox");
    fireEvent.change(typeSelect, { target: { value: "Support" } });

    const titleInput = screen.getByPlaceholderText(/discussed delivery experience/i);
    fireEvent.change(titleInput, { target: { value: "Resolved Return Request" } });

    const descInput = screen.getByPlaceholderText(/write a useful interaction note/i);
    fireEvent.change(descInput, { target: { value: "Processed refund for order #1234." } });

    const saveBtn = screen.getByRole("button", { name: "Save interaction" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        interaction_type: "Support",
        title: "Resolved Return Request",
        description: "Processed refund for order #1234.",
      });
    });
  });

  it("displays error message when save rejects", async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error("Network write failure"));

    render(
      <InteractionModal
        interaction={mockInteraction}
        close={vi.fn()}
        save={mockSave}
      />
    );

    const saveBtn = screen.getByRole("button", { name: "Save interaction" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText("Network write failure")).toBeInTheDocument();
    });
  });

  it("triggers close when clicking Cancel button or close icon button", () => {
    const mockClose = vi.fn();

    const { container } = render(
      <InteractionModal
        interaction={null}
        close={mockClose}
        save={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);
    expect(mockClose).toHaveBeenCalledTimes(1);

    const closeBtn = container.querySelector("button.close");
    fireEvent.click(closeBtn);
    expect(mockClose).toHaveBeenCalledTimes(2);
  });
});
