import { REFETCH_LOGO_EVENT } from "@/LogoContext";
import { useEffect } from "react";

/**
 * Light theme only - no theme switching functionality
 * @returns {{theme: 'light', setTheme: function, availableThemes: object}} The current theme (always light), a no-op setTheme function, and empty availableThemes
 */
export function useTheme() {
  const theme = "light";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.classList.add("light");
    localStorage.setItem("theme", theme);
    window.dispatchEvent(new Event(REFETCH_LOGO_EVENT));
  }, []);

  /**
   * No-op function since theme switching is disabled
   * @param {string} newTheme The new theme to set (ignored)
   */
  function setTheme(newTheme) {
    // No-op: theme switching is disabled
  }

  return { theme, setTheme, availableThemes: {} };
}
