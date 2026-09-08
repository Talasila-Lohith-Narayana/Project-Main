import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Shell from "./Shell";
import * as AuthContextModule from "../context/AuthContext";
import * as ThemeContextModule from "../context/ThemeContext";

describe("Shell Navigation & Layout Component", () => {
  const mockLogout = vi.fn();
  const mockLogoutAll = vi.fn();
  const mockToggleTheme = vi.fn();
  const mockSwitchToAccount = vi.fn();
  const mockLoginAndSwitch = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: "admin",
      role: "admin",
      accounts: { admin: { username: "admin", role: "admin", access_token: "tok_admin" } },
      isAdmin: true,
      logout: mockLogout,
      logoutAll: mockLogoutAll,
      switchToAccount: mockSwitchToAccount,
      loginAndSwitch: mockLoginAndSwitch,
    });

    vi.spyOn(ThemeContextModule, "useTheme").mockReturnValue({
      theme: "light",
      isDark: false,
      toggleTheme: mockToggleTheme,
    });
  });

  it("renders workspace branding and main navigation links", () => {
    render(
      <MemoryRouter>
        <Shell />
      </MemoryRouter>
    );

    expect(screen.getByTitle("Customer Sphere")).toBeInTheDocument();
    expect(screen.getByText("Customer")).toBeInTheDocument();
    expect(screen.getByText("Sphere")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
  });

  it("displays logged-in user profile badge and role indicator", () => {
    render(
      <MemoryRouter>
        <Shell />
      </MemoryRouter>
    );

    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument();
  });

  it("toggles light/dark theme on button click", () => {
    render(
      <MemoryRouter>
        <Shell />
      </MemoryRouter>
    );

    const themeToggleBtn = screen.getByTitle(/switch to dark mode/i);
    fireEvent.click(themeToggleBtn);

    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("opens and closes AuditLogModal when clicking Activity Logs button", () => {
    render(
      <MemoryRouter>
        <Shell />
      </MemoryRouter>
    );

    const logsBtn = screen.getByRole("button", { name: /admin activity/i });
    fireEvent.click(logsBtn);

    expect(screen.getByText(/Admin Data Activity Log/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = document.querySelector(".modalBg button.close");
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Admin Data Activity Log/i)).not.toBeInTheDocument();
  });

  it("calls logoutAll when clicking Sign out button", () => {
    render(
      <MemoryRouter>
        <Shell />
      </MemoryRouter>
    );

    const logoutBtn = screen.getByTitle("Sign out");
    fireEvent.click(logoutBtn);

    expect(mockLogoutAll).toHaveBeenCalledTimes(1);
  });

  it("toggles sidebar minimize and expand state", () => {
    render(
      <MemoryRouter>
        <Shell />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByTitle("Minimize sidebar");
    fireEvent.click(toggleBtn);

    expect(screen.getByTitle("Expand sidebar")).toBeInTheDocument();
  });

  it("switches directly to an already authenticated session", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: "admin",
      role: "admin",
      accounts: {
        admin: { username: "admin", role: "admin", access_token: "tok_admin" },
        analyst: { username: "analyst", role: "analyst", access_token: "tok_analyst" },
      },
      isAdmin: true,
      logout: mockLogout,
      logoutAll: mockLogoutAll,
      switchToAccount: mockSwitchToAccount,
      loginAndSwitch: mockLoginAndSwitch,
    });

    render(
      <MemoryRouter>
        <Shell />
      </MemoryRouter>
    );

    const analystBtn = screen.getByTitle(/Switch to logged-in Analyst session/i);
    fireEvent.click(analystBtn);

    expect(mockSwitchToAccount).toHaveBeenCalledWith("analyst");
  });

  it("opens login modal for unauthenticated account and authenticates successfully", async () => {
    mockLoginAndSwitch.mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <Shell />
      </MemoryRouter>
    );

    const analystBtn = screen.getByTitle(/Authenticate & switch to Analyst/i);
    fireEvent.click(analystBtn);

    expect(screen.getByRole("heading", { name: /sign in as analyst/i })).toBeInTheDocument();

    const passwordInput = screen.getByPlaceholderText(/Enter password for analyst/i);
    fireEvent.change(passwordInput, { target: { value: "pass123" } });

    fireEvent.submit(document.querySelector("form.modal"));

    await waitFor(() => {
      expect(mockLoginAndSwitch).toHaveBeenCalledWith({
        username: "analyst",
        password: "pass123",
      });
    });
  });

  it("shows login error message when switch authentication fails", async () => {
    mockLoginAndSwitch.mockRejectedValueOnce(new Error("Invalid analyst credentials"));

    render(
      <MemoryRouter>
        <Shell />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle(/Authenticate & switch to Analyst/i));

    const passwordInput = screen.getByPlaceholderText(/Enter password for analyst/i);
    fireEvent.change(passwordInput, { target: { value: "wrongpass" } });

    fireEvent.submit(document.querySelector("form.modal"));

    await waitFor(() => {
      expect(screen.getByText("Invalid analyst credentials")).toBeInTheDocument();
    });

    // Close modal via Cancel button
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: /sign in as analyst/i })).not.toBeInTheDocument();
  });

  it("switches profile from collapsed sidebar icon", () => {
    render(
      <MemoryRouter>
        <Shell />
      </MemoryRouter>
    );

    // Minimize sidebar
    fireEvent.click(screen.getByTitle("Minimize sidebar"));

    // Click profile switch button in collapsed mode
    const collapsedSwitchBtn = screen.getByTitle("Switch to Analyst");
    fireEvent.click(collapsedSwitchBtn);

    expect(screen.getByRole("heading", { name: /sign in as analyst/i })).toBeInTheDocument();

    // Close via close X button
    fireEvent.click(document.querySelector(".modalBg button.close"));
    expect(screen.queryByRole("heading", { name: /sign in as analyst/i })).not.toBeInTheDocument();
  });
});
