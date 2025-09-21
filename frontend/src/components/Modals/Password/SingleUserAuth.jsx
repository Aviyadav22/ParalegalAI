import React, { useEffect, useState } from "react";
import System from "../../../models/system";
import { AUTH_TOKEN } from "../../../utils/constants";
import paths from "../../../utils/paths";
import ModalWrapper from "@/components/ModalWrapper";
import { useModal } from "@/hooks/useModal";
import RecoveryCodeModal from "@/components/Modals/DisplayRecoveryCodeModal";
import { useTranslation } from "react-i18next";

export default function SingleUserAuth() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [token, setToken] = useState(null);
  const [customAppName, setCustomAppName] = useState(null);

  const {
    isOpen: isRecoveryCodeModalOpen,
    openModal: openRecoveryCodeModal,
    closeModal: closeRecoveryCodeModal,
  } = useModal();

  const handleLogin = async (e) => {
    setError(null);
    setLoading(true);
    e.preventDefault();
    const data = {};
    const form = new FormData(e.target);
    for (var [key, value] of form.entries()) data[key] = value;
    const { valid, token, message, recoveryCodes } =
      await System.requestToken(data);
    if (valid && !!token) {
      setToken(token);
      if (recoveryCodes) {
        setRecoveryCodes(recoveryCodes);
        openRecoveryCodeModal();
      } else {
        window.localStorage.setItem(AUTH_TOKEN, token);
        window.location = paths.home();
      }
    } else {
      setError(message);
      setLoading(false);
    }
    setLoading(false);
  };

  const handleDownloadComplete = () => {
    setDownloadComplete(true);
  };

  useEffect(() => {
    if (downloadComplete && token) {
      window.localStorage.setItem(AUTH_TOKEN, token);
      window.location = paths.home();
    }
  }, [downloadComplete, token]);

  useEffect(() => {
    const fetchCustomAppName = async () => {
      const { appName } = await System.fetchCustomAppName();
      setCustomAppName(appName || "");
      setLoading(false);
    };
    fetchCustomAppName();
  }, []);

  return (
    <>
      <form onSubmit={handleLogin} className="w-full max-w-md">
        <div className="bg-[var(--paralegal-ivory)] border border-[var(--paralegal-gold)] rounded-xl p-8 md:p-12 shadow-lg">
          {/* Mobile Logo and Branding */}
          <div className="md:hidden flex flex-col items-center mb-10">
            <div className="flex items-center justify-center w-20 h-20 rounded-lg bg-[var(--paralegal-gold)] mb-4 shadow-lg">
              <svg className="w-8 h-8 text-[var(--paralegal-charcoal)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3c-.5 0-1 .4-1 1v1h2V4c0-.6-.4-1-1-1zm0 3c-.6 0-1 .4-1 1v8h2V7c0-.6-.4-1-1-1zm-8 2l3 3c.6.6 1.4.6 2 0l1-1v2l-1 1c-.6.6-.6 1.4 0 2l3 3H4l3-3c.6-.6.6-1.4 0-2l-1-1v-2l1-1c.6-.6 1.4-.6 2 0l3-3H4zm16 0h-8l3 3c.6.6 1.4.6 2 0l1 1v2l-1 1c-.6.6-.6 1.4 0 2l3 3h8l-3-3c-.6-.6-.6-1.4 0-2l1-1v-2l-1-1c-.6-.6-1.4-.6-2 0l-3-3zm-8 10c-.6 0-1 .4-1 1v1h2v-1c0-.6-.4-1-1-1z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[var(--paralegal-charcoal)] font-serif mb-2">
              Paralegal AI
            </h1>
            <p className="text-base text-[var(--paralegal-slate)] font-sans mb-4">
              The AI-Powered Legal Assistant
            </p>
            <div className="w-16 h-1 bg-[var(--paralegal-gold)] rounded"></div>
          </div>

          {/* Form Header */}
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[var(--paralegal-charcoal)] font-serif mb-2">
              Welcome to Paralegal AI
            </h2>
            <p className="text-sm text-[var(--paralegal-slate)] font-sans">
              Sign in to your account
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--paralegal-charcoal)] mb-2">
                Username
              </label>
              <input
                name="username"
                type="text"
                placeholder="Enter your username"
                className="w-full h-12 px-4 bg-white border border-[var(--paralegal-border)] rounded-lg text-[var(--paralegal-charcoal)] placeholder:text-[var(--paralegal-slate)] focus:outline-none focus:ring-2 focus:ring-[var(--paralegal-gold)] focus:border-transparent transition-all duration-200"
                required={true}
                autoComplete="off"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--paralegal-charcoal)] mb-2">
                Password
              </label>
              <input
                name="password"
                type="password"
                placeholder="Enter your password"
                className="w-full h-12 px-4 bg-white border border-[var(--paralegal-border)] rounded-lg text-[var(--paralegal-charcoal)] placeholder:text-[var(--paralegal-slate)] focus:outline-none focus:ring-2 focus:ring-[var(--paralegal-gold)] focus:border-transparent transition-all duration-200"
                required={true}
                autoComplete="off"
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                Error: {error}
              </div>
            )}
          </div>

          {/* Login Button */}
          <button
            disabled={loading}
            type="submit"
            className="w-full h-12 bg-white border-2 border-[var(--paralegal-charcoal)] text-[var(--paralegal-charcoal)] font-semibold rounded-lg hover:bg-[var(--paralegal-charcoal)] hover:text-white transition-all duration-200 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {/* Forgot Password */}
          <div className="text-center mt-6">
            <a 
              href="#" 
              className="text-[var(--paralegal-slate)] text-sm hover:text-[var(--paralegal-gold)] hover:underline transition-colors duration-200"
            >
              Forgot password? <span className="font-bold">Reset</span>
            </a>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t border-[var(--paralegal-border)]">
            <p className="text-xs text-[var(--paralegal-slate)] opacity-70">
              © 2025 Paralegal AI · All Rights Reserved
            </p>
          </div>
        </div>
      </form>

      <ModalWrapper isOpen={isRecoveryCodeModalOpen} noPortal={true}>
        <RecoveryCodeModal
          recoveryCodes={recoveryCodes}
          onDownloadComplete={handleDownloadComplete}
          onClose={closeRecoveryCodeModal}
        />
      </ModalWrapper>
    </>
  );
}
