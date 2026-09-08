/**
 * ================================================================================
 * THEME CONTEXT & DARK MODE MANAGER (context/ThemeContext.jsx)
 * ================================================================================
 * 
 * WHAT THIS FILE DOES (Plain English):
 * ------------------------------------
 * This file manages the visual look of the app (Light Mode vs Dark Mode).
 * It remembers your preferred theme in the browser and updates color variables instantly.
 * 
 * WHAT PART OF THE UI HANDLES THIS:
 * ---------------------------------
 * - Dark / Light theme toggle buttons in the sidebar (`Shell.jsx`).
 * ================================================================================
 */

import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("ci_theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ci_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
