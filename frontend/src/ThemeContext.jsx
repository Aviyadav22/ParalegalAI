import React, { createContext, useContext } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Light theme only - no theme switching
  const themeValue = {
    theme: "light",
    setTheme: () => {}, // no-op
    availableThemes: {}
  };

  return (
    <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
