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
    <form onSubmit={handleSubmit} className="w-full">
      <div className="w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-light text-[#777] dark:text-[#888] mb-2">
            {t("login.password-reset.title")}
          </h2>
          <p className="text-sm text-[#777] dark:text-[#888] leading-relaxed">
            {t("login.password-reset.description")}
          </p>
        </div>
      </div>
      
      <div className="w-full space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2B2B2B] dark:text-[#EDEDED] mb-2">
              {t("login.multi-user.placeholder-username")}
            </label>
            <input
              name="username"
              type="text"
              placeholder={t("login.multi-user.placeholder-username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-12 px-4 bg-white dark:bg-[#222] border border-[#DDD] dark:border-[#333] rounded-lg text-[#2B2B2B] dark:text-[#EDEDED] placeholder:text-[#999] dark:placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:border-transparent transition-all duration-200 shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2B2B2B] dark:text-[#EDEDED] mb-2">
              {t("login.password-reset.recovery-codes")}
            </label>
            {recoveryCodeInputs.map((code, index) => (
              <div key={index} className="mb-3">
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
                  className="w-full h-12 px-4 bg-white dark:bg-[#222] border border-[#DDD] dark:border-[#333] rounded-lg text-[#2B2B2B] dark:text-[#EDEDED] placeholder:text-[#999] dark:placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:border-transparent transition-all duration-200 shadow-sm"
                  required
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="w-full space-y-4 mt-8">
        <button
          type="submit"
          className="w-full h-12 bg-white dark:bg-[#C9A86A] text-[#C9A86A] dark:text-white font-semibold rounded-lg border border-[#C9A86A] dark:border-[#C9A86A] hover:bg-[#C9A86A] hover:text-white dark:hover:bg-[#E3C889] dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:ring-opacity-50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-sm"
        >
          {t("login.password-reset.title")}
        </button>
        <button
          type="button"
          className="w-full text-[#777] dark:text-[#888] text-sm hover:text-[#C9A86A] dark:hover:text-[#C9A86A] hover:underline transition-colors duration-200"
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
    <form onSubmit={handleSubmit} className="w-full">
      <div className="w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-light text-[#777] dark:text-[#888] mb-2">
            Reset Password
          </h2>
          <p className="text-sm text-[#777] dark:text-[#888] leading-relaxed">
            Enter your new password.
          </p>
        </div>
      </div>
      
      <div className="w-full space-y-6">
        <div className="space-y-4">
          <div>
            <input
              type="password"
              name="newPassword"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-12 px-4 bg-white dark:bg-[#222] border border-[#DDD] dark:border-[#333] rounded-lg text-[#2B2B2B] dark:text-[#EDEDED] placeholder:text-[#999] dark:placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:border-transparent transition-all duration-200 shadow-sm"
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
              className="w-full h-12 px-4 bg-white dark:bg-[#222] border border-[#DDD] dark:border-[#333] rounded-lg text-[#2B2B2B] dark:text-[#EDEDED] placeholder:text-[#999] dark:placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:border-transparent transition-all duration-200 shadow-sm"
              required
            />
          </div>
        </div>
      </div>
      
      <div className="w-full space-y-4 mt-8">
        <button
          type="submit"
          className="w-full h-12 bg-white dark:bg-[#C9A86A] text-[#C9A86A] dark:text-white font-semibold rounded-lg border border-[#C9A86A] dark:border-[#C9A86A] hover:bg-[#C9A86A] hover:text-white dark:hover:bg-[#E3C889] dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:ring-opacity-50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-sm"
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
  const [showSignup, setShowSignup] = useState(false);
  const [signupError, setSignupError] = useState(null);

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
  const handleGoogleLogin = () => {
    window.location = System.googleLoginUrl();
  };
  const handleShowSignup = () => {
    setShowSignup(true);
  };
  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError(null);
    const form = new FormData(e.target);
    const username = form.get("su_username");
    const email = form.get("su_email");
    const password = form.get("su_password");
    const res = await System.signup({ username, email, password });
    if (!res?.success) {
      setSignupError(res?.error || "Failed to sign up");
      return;
    }
    // On success, auto-login using returned token if any, else ask user to login
    if (res?.token && res?.user) {
      window.localStorage.setItem(AUTH_USER, JSON.stringify(res.user));
      window.localStorage.setItem(AUTH_TOKEN, res.token);
      window.location = paths.home();
    } else {
      showToast("Account created. Please log in.", "success", { clear: true });
      setShowSignup(false);
    }
  };
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
      {showSignup ? (
        <form onSubmit={handleSignup} className="w-full">
          <div className="w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-light text-[#777] dark:text-[#888] mb-2">
                Create your account
              </h2>
              <p className="text-sm text-[#777] dark:text-[#888] leading-relaxed">
                Join Paralegal AI and start your legal journey
              </p>
            </div>
          </div>
          
          <div className="w-full space-y-6">
            <div className="space-y-4">
              <div>
                <input 
                  name="su_username" 
                  type="text" 
                  placeholder="Username" 
                  className="w-full h-12 px-4 bg-white dark:bg-[#222] border border-[#DDD] dark:border-[#333] rounded-lg text-[#2B2B2B] dark:text-[#EDEDED] placeholder:text-[#999] dark:placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:border-transparent transition-all duration-200 shadow-sm" 
                  required 
                />
              </div>
              <div>
                <input 
                  name="su_email" 
                  type="email" 
                  placeholder="Email" 
                  className="w-full h-12 px-4 bg-white dark:bg-[#222] border border-[#DDD] dark:border-[#333] rounded-lg text-[#2B2B2B] dark:text-[#EDEDED] placeholder:text-[#999] dark:placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:border-transparent transition-all duration-200 shadow-sm" 
                  required 
                />
              </div>
              <div>
                <input 
                  name="su_password" 
                  type="password" 
                  placeholder="Password" 
                  className="w-full h-12 px-4 bg-white dark:bg-[#222] border border-[#DDD] dark:border-[#333] rounded-lg text-[#2B2B2B] dark:text-[#EDEDED] placeholder:text-[#999] dark:placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:border-transparent transition-all duration-200 shadow-sm" 
                  required 
                />
              </div>
              {signupError && (
                <p className="text-red-500 text-sm text-center">Error: {signupError}</p>
              )}
            </div>
          </div>
          
          <div className="w-full space-y-4 mt-8">
            <button 
              type="submit" 
              className="w-full h-12 bg-white dark:bg-[#C9A86A] text-[#C9A86A] dark:text-white font-semibold rounded-lg border border-[#C9A86A] dark:border-[#C9A86A] hover:bg-[#C9A86A] hover:text-white dark:hover:bg-[#E3C889] dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:ring-opacity-50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              Sign up
            </button>
            <button 
              type="button" 
              onClick={() => setShowSignup(false)} 
              className="w-full text-[#777] dark:text-[#888] text-sm hover:text-[#C9A86A] dark:hover:text-[#C9A86A] hover:underline transition-colors duration-200"
            >
              Back to login
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="w-full">
          <div className="w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-light text-[#777] dark:text-[#888] mb-2">
                Welcome to
              </h2>
              <h1 className="text-4xl font-light text-[#C9A86A] dark:text-[#C9A86A] mb-4">
                {customAppName || "Paralegal AI"}
              </h1>
              <p className="text-sm text-[#777] dark:text-[#888] leading-relaxed">
                {t("login.sign-in.start")} {customAppName || "Paralegal AI"}{" "}
                {t("login.sign-in.end")}
              </p>
            </div>
          </div>
          <div className="w-full space-y-6">
            <div className="space-y-4">
              <div>
                <input
                  name="username"
                  type="text"
                  placeholder={t("login.multi-user.placeholder-username")}
                  className="w-full h-12 px-4 bg-white dark:bg-[#222] border border-[#DDD] dark:border-[#333] rounded-lg text-[#2B2B2B] dark:text-[#EDEDED] placeholder:text-[#999] dark:placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:border-transparent transition-all duration-200 shadow-sm"
                  required={true}
                  autoComplete="off"
                />
              </div>
              <div>
                <input
                  name="password"
                  type="password"
                  placeholder={t("login.multi-user.placeholder-password")}
                  className="w-full h-12 px-4 bg-white dark:bg-[#222] border border-[#DDD] dark:border-[#333] rounded-lg text-[#2B2B2B] dark:text-[#EDEDED] placeholder:text-[#999] dark:placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:border-transparent transition-all duration-200 shadow-sm"
                  required={true}
                  autoComplete="off"
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">Error: {error}</p>}
            </div>
          </div>
          <div className="w-full space-y-4 mt-8">
            <button
              disabled={loading}
              type="submit"
              className="w-full h-12 bg-white dark:bg-[#C9A86A] text-[#C9A86A] dark:text-white font-semibold rounded-lg border border-[#C9A86A] dark:border-[#C9A86A] hover:bg-[#C9A86A] hover:text-white dark:hover:bg-[#E3C889] dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:ring-opacity-50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              {loading
                ? t("login.multi-user.validating")
                : t("login.multi-user.login")}
            </button>
            
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full h-12 bg-white dark:bg-[#222] text-[#2B2B2B] dark:text-[#EDEDED] font-medium rounded-lg border border-[#DDD] dark:border-[#333] hover:bg-[#F8F8F8] dark:hover:bg-[#333] focus:outline-none focus:ring-2 focus:ring-[#C9A86A] focus:ring-opacity-50 transition-all duration-200 shadow-sm"
            >
              Continue with Google
            </button>
            
            <div className="flex flex-col space-y-3 text-center">
              <button
                type="button"
                className="text-[#777] dark:text-[#888] text-sm hover:text-[#C9A86A] dark:hover:text-[#C9A86A] hover:underline transition-colors duration-200"
                onClick={handleShowSignup}
              >
                Create account
              </button>
              <button
                type="button"
                className="text-[#777] dark:text-[#888] text-sm hover:text-[#C9A86A] dark:hover:text-[#C9A86A] hover:underline transition-colors duration-200"
                onClick={handleResetPassword}
              >
                {t("login.multi-user.forgot-pass")}? 
                <span className="font-semibold ml-1">{t("login.multi-user.reset")}</span>
              </button>
            </div>
          </div>
        </form>
      )}

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
