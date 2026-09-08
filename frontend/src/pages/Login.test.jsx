import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";
import * as AuthContextModule from "../context/AuthContext";
import * as ApiModule from "../services/api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Login Page Component", () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      isAuthenticated: false,
      login: mockLogin,
    });
  });

  it("renders login form with inputs and sign in button", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("admin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("admin123@qwe#")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("shows error when password is shorter than 6 characters", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const passwordInput = screen.getByDisplayValue("admin123@qwe#");
    fireEvent.change(passwordInput, { target: { value: "123" } });

    const submitBtn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText("Enter a username and a password with at least 6 characters.")
    ).toBeInTheDocument();
  });

  it("authenticates and navigates to dashboard on valid credentials", async () => {
    vi.spyOn(ApiModule.authService, "login").mockResolvedValue({
      access_token: "test_token",
      username: "admin",
      role: "admin",
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        access_token: "test_token",
        username: "admin",
        role: "admin",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("displays server error message on login failure", async () => {
    vi.spyOn(ApiModule.authService, "login").mockRejectedValue(
      new Error("Invalid username or password")
    );

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Invalid username or password")
      ).toBeInTheDocument();
    });
  });
});
