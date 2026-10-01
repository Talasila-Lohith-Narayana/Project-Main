import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Users from "./Users";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { userService } from "../services/api";

vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../context/ToastContext", () => ({ useToast: vi.fn() }));
vi.mock("../services/api", () => ({
  userService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

describe("User management page", () => {
  const toast = { success: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ isAdmin: true, user: "admin" });
    useToast.mockReturnValue(toast);
    userService.list.mockResolvedValue([
      { username: "admin", role: "admin" },
      { username: "analyst", role: "viewer" },
    ]);
  });

  it("shows account roles and creates a user", async () => {
    userService.create.mockResolvedValue({ username: "new_user", role: "viewer" });

    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    expect(await screen.findByText("analyst")).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument();
    expect(screen.getByText("Viewer")).toBeInTheDocument();
    expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Create user" }));
    expect(screen.getByRole("tabpanel", { name: "Create user" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "new_user" },
    });
    fireEvent.change(screen.getByLabelText(/Temporary password/), {
      target: { value: "safe-password" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /create user/i }).closest("form"),
    );

    await waitFor(() => {
      expect(userService.create).toHaveBeenCalledWith({
        username: "new_user",
        password: "safe-password",
        role: "viewer",
      });
    });
    expect(screen.getByRole("tab", { name: "View & edit users" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByText("new_user")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('User "new_user" can now sign in.');
  });

  it("redirects non-admin users away from user management", () => {
    useAuth.mockReturnValue({ isAdmin: false });

    render(
      <MemoryRouter initialEntries={["/users"]}>
        <Users />
      </MemoryRouter>
    );

    expect(screen.queryByText("User management")).not.toBeInTheDocument();
  });

  it("updates an existing account username and optional password", async () => {
    userService.update.mockResolvedValue({
      username: "renamed_analyst",
      role: "viewer",
    });
    useAuth.mockReturnValue({
      isAdmin: true,
      user: "admin",
      updateCurrentSession: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    await screen.findByText("analyst");
    fireEvent.click(screen.getByRole("button", { name: "Edit analyst" }));
    const editDialog = screen.getByRole("dialog", { name: "Edit analyst" });
    fireEvent.change(within(editDialog).getByLabelText("Username"), {
      target: { value: "renamed_analyst" },
    });
    fireEvent.change(within(editDialog).getByLabelText(/New password/), {
      target: { value: "replacement-password" },
    });
    fireEvent.submit(within(editDialog).getByRole("button", { name: /save changes/i }).closest("form"));

    await waitFor(() => {
      expect(userService.update).toHaveBeenCalledWith("analyst", {
        username: "renamed_analyst",
        password: "replacement-password",
      });
    });
    expect(await screen.findByText("renamed_analyst")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('User "renamed_analyst" updated.');
  });

  it("requires confirmation before deleting an account and refreshes the user list", async () => {
    userService.delete.mockResolvedValue({ username: "analyst", role: "viewer" });

    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    await screen.findByText("analyst");
    fireEvent.click(screen.getByRole("button", { name: "Delete analyst" }));
    expect(screen.getByRole("dialog", { name: "Delete user?" })).toBeInTheDocument();
    expect(screen.getByText(/active sessions will be revoked/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete user" }));

    await waitFor(() => {
      expect(userService.delete).toHaveBeenCalledWith("analyst");
    });
    expect(screen.queryByText("analyst")).not.toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('User "analyst" deleted.');
  });

  it("prevents deleting the active account and the last administrator", async () => {
    userService.list.mockResolvedValue([
      { username: "admin", role: "admin" },
      { username: "analyst", role: "viewer" },
    ]);

    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    await screen.findByText("analyst");

    expect(screen.getByRole("button", { name: "Delete admin" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete analyst" })).toBeEnabled();
  });
});
