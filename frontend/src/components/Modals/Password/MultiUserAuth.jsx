import React, { useEffect, useState } from "react";
import System from "../../../models/system";
import { AUTH_TOKEN, AUTH_USER } from "../../../utils/constants";
import paths from "../../../utils/paths";
import showToast from "@/utils/toast";
import ModalWrapper from "@/components/ModalWrapper";
import { useModal } from "@/hooks/useModal";
import RecoveryCodeModal from "@/components/Modals/DisplayRecoveryCodeModal";
import { useTranslation } from "react-i18next";
import { t } from "i18next";

const RecoveryForm = ({ onSubmit, setShowRecoveryForm }) => {
  const [username, setUsername] = useState("");
  const [recoveryCodeInputs, setRecoveryCodeInputs] = useState(
    Array(2).fill("")
  );

  const handleRecoveryCodeChange = (index, value) => {
    const updatedCodes = [...recoveryCodeInputs];
    updatedCodes[index] = value;
    setRecoveryCodeInputs(updatedCodes);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const recoveryCodes = recoveryCodeInputs.filter(
      (code) => code.trim() !== ""
    );
    onSubmit(username, recoveryCodes);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col justify-center items-center relative rounded-2xl border-none bg-theme-bg-secondary md:shadow-[0_4px_14px_rgba(0,0,0,0.25)] md:px-8 px-0 py-4 w-full md:w-fit mt-10 md:mt-0"
    >
      <div className="flex items-start justify-between pt-11 pb-9 w-screen md:w-full md:px-12 px-6 ">
        <div className="flex flex-col gap-y-4 w-full">
          <h3 className="text-4xl md:text-lg font-bold text-theme-text-primary text-center md:text-left">
            {t("login.password-reset.title")}
          </h3>
          <p className="text-sm text-theme-text-secondary md:text-left md:max-w-[300px] px-4 md:px-0 text-center">
            {t("login.password-reset.description")}
          </p>
        </div>
      </div>
      <div className="md:px-12 px-6 space-y-6 flex h-full w-full">
        <div className="w-full flex flex-col gap-y-4">
          <div className="flex flex-col gap-y-2">
            <label className="text-white text-sm font-bold">
              {t("login.multi-user.placeholder-username")}
            </label>
            <input
              name="username"
              type="text"
              placeholder={t("login.multi-user.placeholder-username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder focus:outline-primary-button active:outline-primary-button outline-none text-sm rounded-md p-2.5 w-full h-[48px] md:w-[300px] md:h-[34px]"
              required
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <label className="text-white text-sm font-bold">
              {t("login.password-reset.recovery-codes")}
            </label>
            {recoveryCodeInputs.map((code, index) => (
              <div key={index}>
                <input
                  type="text"
                  name={`recoveryCode${index + 1}`}
                  placeholder={t("login.password-reset.recovery-code", {
                    index: index + 1,
                  })}
                  value={code}
                  onChange={(e) =>
                    handleRecoveryCodeChange(index, e.target.value)
                  }
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder focus:outline-primary-button active:outline-primary-button outline-none text-sm rounded-md p-2.5 w-full h-[48px] md:w-[300px] md:h-[34px]"
                  required
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center md:p-12 md:px-0 px-6 mt-12 md:mt-0 space-x-2 border-gray-600 w-full flex-col gap-y-8">
        <button
          type="submit"
          className="md:text-primary-button md:bg-transparent md:w-[300px] text-dark-text text-sm font-bold focus:ring-4 focus:outline-none rounded-md border-[1.5px] border-primary-button md:h-[34px] h-[48px] md:hover:text-white md:hover:bg-primary-button bg-primary-button focus:z-10 w-full"
        >
          {t("login.password-reset.title")}
        </button>
        <button
          type="button"
          className="text-white text-sm flex gap-x-1 hover:text-primary-button hover:underline -mb-8"
          onClick={() => setShowRecoveryForm(false)}
        >
          {t("login.password-reset.back-to-login")}
        </button>
      </div>
    </form>
  );
};

const ResetPasswordForm = ({ onSubmit }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(newPassword, confirmPassword);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col justify-center items-center relative rounded-2xl bg-theme-bg-secondary md:shadow-[0_4px_14px_rgba(0,0,0,0.25)] md:px-8 px-0 py-4 w-full md:w-fit mt-10 md:mt-0"
    >
      <div className="flex items-start justify-between pt-11 pb-9 w-screen md:w-full md:px-12 px-6">
        <div className="flex flex-col gap-y-4 w-full">
          <h3 className="text-4xl md:text-2xl font-bold text-white text-center md:text-left">
            Reset Password
          </h3>
          <p className="text-sm text-white/90 md:text-left md:max-w-[300px] px-4 md:px-0 text-center">
            Enter your new password.
          </p>
        </div>
      </div>
      <div className="md:px-12 px-6 space-y-6 flex h-full w-full">
        <div className="w-full flex flex-col gap-y-4">
          <div>
            <input
              type="password"
              name="newPassword"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              required
            />
          </div>
          <div>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              required
            />
          </div>
        </div>
      </div>
      <div className="flex items-center md:p-12 md:px-0 px-6 mt-12 md:mt-0 space-x-2 border-gray-600 w-full flex-col gap-y-8">
        <button
          type="submit"
          className="md:text-primary-button md:bg-transparent md:w-[300px] text-dark-text text-sm font-bold focus:ring-4 focus:outline-none rounded-md border-[1.5px] border-primary-button md:h-[34px] h-[48px] md:hover:text-white md:hover:bg-primary-button bg-primary-button focus:z-10 w-full"
        >
          Reset Password
        </button>
      </div>
    </form>
  );
};

export default function MultiUserAuth() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
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
    const { valid, user, token, message, recoveryCodes } =
      await System.requestToken(data);
    if (valid && !!token && !!user) {
      setUser(user);
      setToken(token);

      if (recoveryCodes) {
        setRecoveryCodes(recoveryCodes);
        openRecoveryCodeModal();
      } else {
        window.localStorage.setItem(AUTH_USER, JSON.stringify(user));
        window.localStorage.setItem(AUTH_TOKEN, token);
        window.location = paths.home();
      }
    } else {
      setError(message);
      setLoading(false);
    }
    setLoading(false);
  };

  const handleDownloadComplete = () => setDownloadComplete(true);
  const handleResetPassword = () => setShowRecoveryForm(true);
  const handleRecoverySubmit = async (username, recoveryCodes) => {
    const { success, resetToken, error } = await System.recoverAccount(
      username,
      recoveryCodes
    );

    if (success && resetToken) {
      window.localStorage.setItem("resetToken", resetToken);
      setShowRecoveryForm(false);
      setShowResetPasswordForm(true);
    } else {
      showToast(error, "error", { clear: true });
    }
  };

  const handleResetSubmit = async (newPassword, confirmPassword) => {
    const resetToken = window.localStorage.getItem("resetToken");

    if (resetToken) {
      const { success, error } = await System.resetPassword(
        resetToken,
        newPassword,
        confirmPassword
      );

      if (success) {
        window.localStorage.removeItem("resetToken");
        setShowResetPasswordForm(false);
        showToast("Password reset successful", "success", { clear: true });
      } else {
        showToast(error, "error", { clear: true });
      }
    } else {
      showToast("Invalid reset token", "error", { clear: true });
    }
  };

  useEffect(() => {
    if (downloadComplete && user && token) {
      window.localStorage.setItem(AUTH_USER, JSON.stringify(user));
      window.localStorage.setItem(AUTH_TOKEN, token);
      window.location = paths.home();
    }
  }, [downloadComplete, user, token]);

  useEffect(() => {
    const fetchCustomAppName = async () => {
      const { appName } = await System.fetchCustomAppName();
      setCustomAppName(appName || "");
      setLoading(false);
    };
    fetchCustomAppName();
  }, []);

  if (showRecoveryForm) {
    return (
      <RecoveryForm
        onSubmit={handleRecoverySubmit}
        setShowRecoveryForm={setShowRecoveryForm}
      />
    );
  }

  if (showResetPasswordForm)
    return <ResetPasswordForm onSubmit={handleResetSubmit} />;
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
            <button
              type="button"
              className="text-[var(--paralegal-slate)] text-sm hover:text-[var(--paralegal-gold)] hover:underline transition-colors duration-200"
              onClick={handleResetPassword}
            >
              Forgot password? <span className="font-bold">Reset</span>
            </button>
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
