import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DeferredDashboardSection from "./DeferredDashboardSection";

describe("DeferredDashboardSection", () => {
  it("refreshes an already loaded section when the polling token changes", async () => {
    const loadSection = vi
      .fn()
      .mockResolvedValueOnce({ value: "initial" })
      .mockResolvedValueOnce({ value: "updated" });
    const { rerender } = render(
      <DeferredDashboardSection
        section="geography"
        title="Geographic analytics"
        loadSection={loadSection}
        refreshToken={0}
      >
        {(data) => <p>{data.value}</p>}
      </DeferredDashboardSection>,
    );

    await waitFor(() => expect(screen.getByText("initial")).toBeInTheDocument());
    expect(loadSection).toHaveBeenCalledTimes(1);

    rerender(
      <DeferredDashboardSection
        section="geography"
        title="Geographic analytics"
        loadSection={loadSection}
        refreshToken={1}
      >
        {(data) => <p>{data.value}</p>}
      </DeferredDashboardSection>,
    );

    await waitFor(() => expect(screen.getByText("updated")).toBeInTheDocument());
    expect(loadSection).toHaveBeenCalledTimes(2);
  });
});
