import useLoginMode from "@/hooks/useLoginMode";
import usePfp from "@/hooks/usePfp";
import useUser from "@/hooks/useUser";
import System from "@/models/system";
import paths from "@/utils/paths";
import { userFromStorage } from "@/utils/request";
import { Person, ChartBar, Gear, Question, SignOut, Sun, Moon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import AccountModal from "../AccountModal";
import UsageDashboard from "../UsageDashboard";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";

export default function UserButton() {
  const { t } = useTranslation();
  const mode = useLoginMode();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const menuRef = useRef();
  const buttonRef = useRef();
  const [showMenu, setShowMenu] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showUsageDashboard, setShowUsageDashboard] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");

  const handleClose = (event) => {
    if (
      menuRef.current &&
      !menuRef.current.contains(event.target) &&
      !buttonRef.current.contains(event.target)
    ) {
      setShowMenu(false);
    }
  };

  const handleCloseModals = (event) => {
    if (
      !event.target.closest('[data-modal]') &&
      !event.target.closest('[data-dropdown]')
    ) {
      setShowAccountSettings(false);
      setShowUsageDashboard(false);
    }
  };

  const handleOpenAccountModal = () => {
    setShowAccountSettings(true);
    setShowMenu(false);
  };

  const handleOpenUsageDashboard = () => {
    setShowUsageDashboard(true);
    setShowMenu(false);
  };

  const handleSignOut = () => {
    window.localStorage.removeItem(AUTH_USER);
    window.localStorage.removeItem(AUTH_TOKEN);
    window.localStorage.removeItem(AUTH_TIMESTAMP);
    window.location.replace(paths.home());
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'default' : 'light');
  };

  useEffect(() => {
    if (showMenu) {
      document.addEventListener("mousedown", handleClose);
    }
    return () => document.removeEventListener("mousedown", handleClose);
  }, [showMenu]);

  useEffect(() => {
    if (showAccountSettings || showUsageDashboard) {
      document.addEventListener("mousedown", handleCloseModals);
    }
    return () => document.removeEventListener("mousedown", handleCloseModals);
  }, [showAccountSettings, showUsageDashboard]);

  useEffect(() => {
    const fetchSupportEmail = async () => {
      const supportEmail = await System.fetchSupportEmail();
      setSupportEmail(
        supportEmail?.email
          ? `mailto:${supportEmail.email}`
          : paths.mailToMintplex()
      );
    };
    fetchSupportEmail();
  }, []);

  if (mode === null) return null;
  return (
    <div className="absolute top-3 right-4 md:top-9 md:right-10 w-fit h-fit z-40">
      <button
        ref={buttonRef}
        onClick={() => setShowMenu(!showMenu)}
        type="button"
        className="uppercase transition-all duration-300 w-[35px] h-[35px] text-base font-semibold rounded-full flex items-center bg-theme-action-menu-bg hover:bg-theme-action-menu-item-hover justify-center text-white p-2 hover:border-slate-100 hover:border-opacity-50 border-transparent border"
      >
        {mode === "multi" ? <UserDisplay /> : <Person size={14} />}
      </button>

      {showMenu && (
        <div
          ref={menuRef}
          data-dropdown
          className="w-64 rounded-lg absolute top-12 right-0 bg-theme-bg-secondary border border-theme-sidebar-border shadow-lg overflow-hidden z-50"
        >
          {/* Profile Header */}
          <div className="px-4 py-3 border-b border-theme-sidebar-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-theme-bg-primary flex items-center justify-center">
                {mode === "multi" && user ? (
                  <UserDisplay />
                ) : (
                  <Person size={16} className="text-theme-text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-theme-text-primary font-medium text-sm truncate">
                  {mode === "multi" && user ? user.username : "User"}
                </p>
                <p className="text-theme-text-secondary text-xs truncate">
                  {mode === "multi" && user ? user.email || "user@paralegalai.com" : "user@paralegalai.com"}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {/* Usage Dashboard */}
            <button
              onClick={handleOpenUsageDashboard}
              className="w-full flex items-center px-4 py-2 text-left hover:bg-theme-bg-primary transition-colors duration-200 group"
            >
              <ChartBar size={16} className="text-theme-text-secondary mr-3 group-hover:text-theme-text-primary transition-colors" />
              <span className="text-theme-text-primary text-sm">Usage Dashboard</span>
              <span className="ml-auto text-theme-text-secondary group-hover:text-theme-text-primary transition-colors">→</span>
            </button>

            {/* Account Settings */}
            {mode === "multi" && !!user && (
              <button
                onClick={handleOpenAccountModal}
                className="w-full flex items-center px-4 py-2 text-left hover:bg-theme-bg-primary transition-colors duration-200 group"
              >
                <Gear size={16} className="text-theme-text-secondary mr-3 group-hover:text-theme-text-primary transition-colors" />
                <span className="text-theme-text-primary text-sm">Account</span>
                <span className="ml-auto text-theme-text-secondary group-hover:text-theme-text-primary transition-colors">→</span>
              </button>
            )}

            {/* Support */}
            <a
              href={supportEmail}
              className="w-full flex items-center px-4 py-2 text-left hover:bg-theme-bg-primary transition-colors duration-200 group"
            >
              <Question size={16} className="text-theme-text-secondary mr-3 group-hover:text-theme-text-primary transition-colors" />
              <span className="text-theme-text-primary text-sm">Support</span>
            </a>

            {/* Theme Toggle */}
            <div className="w-full flex items-center justify-between px-4 py-2 hover:bg-theme-bg-primary transition-colors duration-200 group">
              <div className="flex items-center">
                {theme === 'light' ? (
                  <Moon size={16} className="text-theme-text-secondary mr-3 group-hover:text-theme-text-primary transition-colors" />
                ) : (
                  <Sun size={16} className="text-theme-text-secondary mr-3 group-hover:text-theme-text-primary transition-colors" />
                )}
                <span className="text-theme-text-primary text-sm">
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </span>
              </div>
              <button
                onClick={toggleTheme}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-theme-text-secondary focus:ring-offset-2"
                style={{
                  backgroundColor: theme === 'light' ? '#E5E7EB' : '#6B7280'
                }}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    theme === 'light' ? 'translate-x-0.5' : 'translate-x-4'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Sign Out */}
          <div className="border-t border-theme-sidebar-border">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 group"
            >
              <SignOut size={16} className="text-red-500 mr-3 group-hover:text-red-600 transition-colors" />
              <span className="text-red-500 group-hover:text-red-600 text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      )}
      {user && showAccountSettings && (
        <div data-modal>
          <AccountModal
            user={user}
            hideModal={() => setShowAccountSettings(false)}
          />
        </div>
      )}
      {showUsageDashboard && (
        <div data-modal>
          <UsageDashboard
            hideModal={() => setShowUsageDashboard(false)}
          />
        </div>
      )}
    </div>
  );
}

function UserDisplay() {
  const { pfp } = usePfp();
  const user = userFromStorage();

  if (pfp) {
    return (
      <div className="w-[35px] h-[35px] rounded-full flex-shrink-0 overflow-hidden transition-all duration-300 bg-gray-100 hover:border-slate-100 hover:border-opacity-50 border-transparent border hover:opacity-60">
        <img
          src={pfp}
          alt="User profile picture"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return user?.username?.slice(0, 2) || "AA";
}
