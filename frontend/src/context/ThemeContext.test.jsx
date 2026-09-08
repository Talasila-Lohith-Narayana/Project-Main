import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeContext";

function TestThemeConsumer() {
  const { theme, isDark, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="isDark">{isDark ? "yes" : "no"}</span>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides default light theme and toggles between light and dark", () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("isDark").textContent).toBe("no");

    // Toggle to dark
    fireEvent.click(screen.getByText("Toggle Theme"));
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(screen.getByTestId("isDark").textContent).toBe("yes");
    expect(localStorage.getItem("ci_theme")).toBe("dark");

    // Toggle back to light
    fireEvent.click(screen.getByText("Toggle Theme"));
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("isDark").textContent).toBe("no");
    expect(localStorage.getItem("ci_theme")).toBe("light");
  });

  it("initializes from localStorage when dark theme was saved and supports setTheme", () => {
    localStorage.setItem("ci_theme", "dark");

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(screen.getByTestId("isDark").textContent).toBe("yes");

    fireEvent.click(screen.getByText("Set Dark"));
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });
});
