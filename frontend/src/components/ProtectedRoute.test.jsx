import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import * as AuthContextModule from "../context/AuthContext";

describe("ProtectedRoute Component", () => {
  it("renders protected content when user is authenticated", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Secret Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Secret Dashboard")).toBeInTheDocument();
  });

  it("redirects to /login when user is unauthenticated", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      isAuthenticated: false,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Secret Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText("Secret Dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });
});
