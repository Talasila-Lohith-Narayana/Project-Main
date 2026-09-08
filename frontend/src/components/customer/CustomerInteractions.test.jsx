import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CustomerInteractions from "./CustomerInteractions";

describe("CustomerInteractions Component", () => {
  const mockInteractions = [
    {
      id: 1,
      interaction_type: "Call",
      title: "Onboarding Call",
      description: "Discussed account setup and catalog interests.",
      created_at: "2026-09-01T10:00:00Z",
    },
    {
      id: null,
      interaction_type: "Email",
      title: "Follow-up Email",
      description: "Sent catalog brochure.",
      created_at: "2026-09-02T12:00:00", // does not end with Z
    },
  ];

  it("renders CRM interaction timeline with titles and types", () => {
    render(
      <CustomerInteractions
        items={mockInteractions}
        isAdmin={false}
        onEditInteraction={vi.fn()}
      />
    );

    expect(screen.getByText("Onboarding Call")).toBeInTheDocument();
    expect(screen.getByText("Call")).toBeInTheDocument();
    expect(screen.getByText("Discussed account setup and catalog interests.")).toBeInTheDocument();
    expect(screen.getByText("Follow-up Email")).toBeInTheDocument();
  });

  it("triggers onEditInteraction when Admin clicks Edit button", () => {
    const mockEdit = vi.fn();

    render(
      <CustomerInteractions
        items={mockInteractions}
        isAdmin={true}
        onEditInteraction={mockEdit}
      />
    );

    const editBtns = screen.getAllByRole("button", { name: /edit/i });
    expect(editBtns).toHaveLength(2);
    fireEvent.click(editBtns[0]);
    expect(mockEdit).toHaveBeenCalledWith(mockInteractions[0]);
  });

  it("renders empty state when no interactions exist or prop is omitted", () => {
    const { rerender } = render(
      <CustomerInteractions
        items={[]}
        isAdmin={false}
        onEditInteraction={vi.fn()}
      />
    );
    expect(screen.getByText(/No app activity yet/i)).toBeInTheDocument();

    rerender(<CustomerInteractions items={null} />);
    expect(screen.getByText(/No app activity yet/i)).toBeInTheDocument();

    rerender(<CustomerInteractions />);
    expect(screen.getByText(/No app activity yet/i)).toBeInTheDocument();
  });
});
