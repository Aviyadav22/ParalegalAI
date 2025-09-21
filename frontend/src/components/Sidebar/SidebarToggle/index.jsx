import React, { useEffect, useState } from "react";
import { SidebarSimple } from "@phosphor-icons/react";
import { useLocation } from "react-router-dom";
import paths from "@/utils/paths";
import { Tooltip } from "react-tooltip";
const SIDEBAR_TOGGLE_STORAGE_KEY = "anythingllm_sidebar_toggle";

/**
 * Returns the previous state of the sidebar from localStorage.
 * If the sidebar was closed, returns false.
 * If the sidebar was open, returns true.
 * If the sidebar state is not set, returns true.
 * @returns {boolean}
 */
function previousSidebarState() {
  const previousState = window.localStorage.getItem(SIDEBAR_TOGGLE_STORAGE_KEY);
  if (previousState === "closed") return false;
  return true;
}

export function useSidebarToggle() {
  const [showSidebar, setShowSidebar] = useState(previousSidebarState());
  const [canToggleSidebar, setCanToggleSidebar] = useState(true);
  const location = useLocation();

  useEffect(() => {
    function checkPath() {
      const currentPath = location.pathname;
      const isVisible =
        currentPath === paths.home() ||
        /^\/workspace\/[^\/]+$/.test(currentPath) ||
        /^\/workspace\/[^\/]+\/t\/[^\/]+$/.test(currentPath);
      setCanToggleSidebar(isVisible);
    }
    checkPath();
  }, [location.pathname]);

  useEffect(() => {
    function toggleSidebar(e) {
      if (!canToggleSidebar) return;
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "s"
      ) {
        setShowSidebar((prev) => {
          const newState = !prev;
          window.localStorage.setItem(
            SIDEBAR_TOGGLE_STORAGE_KEY,
            newState ? "open" : "closed"
          );
          return newState;
        });
      }
    }
    window.addEventListener("keydown", toggleSidebar);
    return () => {
      window.removeEventListener("keydown", toggleSidebar);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_TOGGLE_STORAGE_KEY,
      showSidebar ? "open" : "closed"
    );
  }, [showSidebar]);

  return { showSidebar, setShowSidebar, canToggleSidebar };
}

export function ToggleSidebarButton({ showSidebar, setShowSidebar }) {
  const isMac = navigator.userAgent.includes("Mac");
  const shortcut = isMac ? "⌘ + Shift + S" : "Ctrl + Shift + S";

  return (
    <>
      <button
        type="button"
        className="h-10 w-10 flex items-center justify-center rounded-full bg-[#F9F8F6] border border-gray-200 hover:bg-[#C2A97F] hover:border-[#C2A97F] transition-all duration-300 ease-in-out"
        onClick={() => setShowSidebar((prev) => !prev)}
        data-tooltip-id="sidebar-toggle"
        data-tooltip-content={
          showSidebar
            ? `Hide Sidebar (${shortcut})`
            : `Show Sidebar (${shortcut})`
        }
        aria-label={
          showSidebar
            ? `Hide Sidebar (${shortcut})`
            : `Show Sidebar (${shortcut})`
        }
      >
        <SidebarSimple
          className="text-slate-700 hover:text-white transition-colors duration-300"
          size={20}
        />
      </button>
      <Tooltip
        id="sidebar-toggle"
        place="top"
        delayShow={300}
        className="!bg-[#F9F8F6] !text-slate-700 !border !border-gray-200 !text-xs !font-medium !px-3 !py-2 !rounded-lg !shadow-lg"
      />
    </>
  );
}
