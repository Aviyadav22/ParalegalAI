import React, { useState, useEffect, useRef } from "react";
import { Trash, DotsThreeVertical, TreeView } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

function ActionMenu({ chatId, forkThread, isEditing, role }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const toggleMenu = () => setOpen(!open);

  const handleFork = () => {
    forkThread(chatId);
    setOpen(false);
  };

  const handleDelete = () => {
    window.dispatchEvent(
      new CustomEvent("delete-message", { detail: { chatId } })
    );
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!chatId || isEditing || role === "user") return null;

  return (
    <div className="mt-2 -ml-0.5 relative" ref={menuRef}>
      <button
        onClick={toggleMenu}
        className="border-none text-[var(--theme-sidebar-footer-icon-fill)] hover:text-[var(--theme-sidebar-footer-icon-fill)] transition-colors duration-200"
        data-tooltip-id="action-menu"
        data-tooltip-content={t("chat_window.more_actions")}
        aria-label={t("chat_window.more_actions")}
      >
        <DotsThreeVertical size={24} weight="bold" />
      </button>
      {open && (
        <div className="absolute -top-1 left-7 mt-1 dropdown-menu flex flex-col z-99 md:z-10">
          <button
            onClick={handleFork}
            className="border-none rounded-t-lg flex items-center gap-x-2 py-1.5 px-2 w-full text-left"
          >
            <TreeView size={18} />
            <span className="text-sm">{t("chat_window.fork")}</span>
          </button>
          <button
            onClick={handleDelete}
            className="border-none flex rounded-b-lg items-center gap-x-2 py-1.5 px-2 w-full text-left hover:bg-red-500/20 hover:text-red-600"
          >
            <Trash size={18} />
            <span className="text-sm">{t("chat_window.delete")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ActionMenu;
