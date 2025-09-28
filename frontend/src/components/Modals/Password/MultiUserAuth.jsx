import React, { useEffect, useState } from "react";
import System from "../../../models/system";
import Registration from "../../../models/registration";
import { AUTH_TOKEN, AUTH_USER } from "../../../utils/constants";
import paths from "../../../utils/paths";
import showToast from "@/utils/toast";
import ModalWrapper from "@/components/ModalWrapper";
import { useModal } from "@/hooks/useModal";
import RecoveryCodeModal from "@/components/Modals/DisplayRecoveryCodeModal";
import { useTranslation } from "react-i18next";
import { t } from "i18next";

const RegistrationForm = ({ onSubmit, onSwitchToLogin, loading, error }) => {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Username validation (optional)
    if (formData.username && !/^[a-z0-9_\-.]+$/.test(formData.username)) {
      newErrors.username =
        "Username must only contain lowercase letters, periods, numbers, underscores, and hyphens";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const checkEmailAvailability = async (email) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(null);
      return;
    }

    try {
      const result = await Registration.checkEmail(email);
      setEmailAvailable(result.available);
    } catch (error) {
      console.error("Error checking email:", error);
    }
  };

  const checkUsernameAvailability = async (username) => {
    if (!username || !/^[a-z0-9_\-.]+$/.test(username)) {
      setUsernameAvailable(null);
      return;
    }

    try {
      const result = await Registration.checkUsername(username);
      setUsernameAvailable(result.available);
    } catch (error) {
      console.error("Error checking username:", error);
    }
  };

  // Debounced email check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkEmailAvailability(formData.email);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  // Debounced username check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(formData.username);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (emailAvailable === false) {
      setErrors((prev) => ({
        ...prev,
        email: "Email is already registered",
      }));
      return;
    }

    if (formData.username && usernameAvailable === false) {
      setErrors((prev) => ({
        ...prev,
        username: "Username is already taken",
      }));
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
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
          <p className="text-sm text-[var(--paralegal-slate)] text-center">
            Create your account
          </p>
        </div>

        {/* Desktop Logo and Branding */}
        <div className="hidden md:flex items-center justify-center mb-10">
          <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-[var(--paralegal-gold)] mr-4 shadow-lg">
            <svg className="w-6 h-6 text-[var(--paralegal-charcoal)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3c-.5 0-1 .4-1 1v1h2V4c0-.6-.4-1-1-1zm0 3c-.6 0-1 .4-1 1v8h2V7c0-.6-.4-1-1-1zm-8 2l3 3c.6.6 1.4.6 2 0l1-1v2l-1 1c-.6.6-.6 1.4 0 2l3 3H4l3-3c.6-.6.6-1.4 0-2l-1-1v-2l1-1c.6-.6 1.4-.6 2 0l3-3H4zm16 0h-8l3 3c.6.6 1.4.6 2 0l1 1v2l-1 1c-.6.6-.6 1.4 0 2l3 3h8l-3-3c-.6-.6-.6-1.4 0-2l1-1v-2l-1-1c-.6-.6-1.4-.6-2 0l-3-3zm-8 10c-.6 0-1 .4-1 1v1h2v-1c0-.6-.4-1-1-1z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--paralegal-charcoal)] font-serif">
              Paralegal AI
            </h1>
            <p className="text-sm text-[var(--paralegal-slate)]">
              Create your account
            </p>
          </div>
        </div>

        {/* Form Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-[var(--paralegal-charcoal)] font-serif mb-2">
            Join Paralegal AI
          </h2>
          <p className="text-sm text-[var(--paralegal-slate)] font-sans">
            Create your account to get started
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-[var(--paralegal-charcoal)] mb-2">
              Email Address *
            </label>
            <div className="relative">
              <input
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full h-12 px-4 bg-white border ${
                  errors.email ? "border-red-300" : "border-[var(--paralegal-border)]"
                } rounded-lg text-[var(--paralegal-charcoal)] placeholder:text-[var(--paralegal-slate)] focus:outline-none focus:ring-2 focus:ring-[var(--paralegal-gold)] focus:border-transparent transition-all duration-200`}
                required
                autoComplete="email"
              />
              {emailAvailable !== null && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {emailAvailable ? (
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              )}
            </div>
            {errors.email && (
              <p className="mt-2 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Username Field */}
          <div>
            <label className="block text-sm font-medium text-[var(--paralegal-charcoal)] mb-2">
              Username (optional)
            </label>
            <div className="relative">
              <input
                name="username"
                type="text"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full h-12 px-4 bg-white border ${
                  errors.username ? "border-red-300" : "border-[var(--paralegal-border)]"
                } rounded-lg text-[var(--paralegal-charcoal)] placeholder:text-[var(--paralegal-slate)] focus:outline-none focus:ring-2 focus:ring-[var(--paralegal-gold)] focus:border-transparent transition-all duration-200`}
                autoComplete="username"
              />
              {usernameAvailable !== null && formData.username && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {usernameAvailable ? (
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              )}
            </div>
            {errors.username && (
              <p className="mt-2 text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-[var(--paralegal-charcoal)] mb-2">
              Password *
            </label>
            <input
              name="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full h-12 px-4 bg-white border ${
                errors.password ? "border-red-300" : "border-[var(--paralegal-border)]"
              } rounded-lg text-[var(--paralegal-charcoal)] placeholder:text-[var(--paralegal-slate)] focus:outline-none focus:ring-2 focus:ring-[var(--paralegal-gold)] focus:border-transparent transition-all duration-200`}
              required
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="mt-2 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-sm font-medium text-[var(--paralegal-charcoal)] mb-2">
              Confirm Password *
            </label>
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full h-12 px-4 bg-white border ${
                errors.confirmPassword ? "border-red-300" : "border-[var(--paralegal-border)]"
              } rounded-lg text-[var(--paralegal-charcoal)] placeholder:text-[var(--paralegal-slate)] focus:outline-none focus:ring-2 focus:ring-[var(--paralegal-gold)] focus:border-transparent transition-all duration-200`}
              required
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>
          
          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
              Error: {error}
            </div>
          )}
        </div>

        {/* Register Button */}
        <button
          disabled={loading}
          type="submit"
          className="w-full h-12 bg-white border-2 border-[var(--paralegal-charcoal)] text-[var(--paralegal-charcoal)] font-semibold rounded-lg hover:bg-[var(--paralegal-charcoal)] hover:text-white transition-all duration-200 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        {/* Switch to Login */}
        <div className="text-center mt-6">
          <p className="text-sm text-[var(--paralegal-slate)]">
            Already have an account?{" "}
            <button
              type="button"
              className="text-[var(--paralegal-gold)] hover:text-[var(--paralegal-charcoal)] font-semibold hover:underline transition-colors duration-200"
              onClick={onSwitchToLogin}
            >
              Sign in
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t border-[var(--paralegal-border)]">
          <p className="text-xs text-[var(--paralegal-slate)] opacity-70">
            © 2025 Paralegal AI · All Rights Reserved
          </p>
        </div>
      </div>
    </form>
  );
};

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
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
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

  const handleRegistration = async (formData) => {
    setError(null);
    setLoading(true);
    
    try {
      const result = await Registration.register({
        email: formData.email,
        username: formData.username || null,
        password: formData.password,
      });

      if (result.success) {
        setRegistrationSuccess(true);
        showToast("Account created successfully! Please check your email to verify your account.", "success");
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToRegistration = () => {
    setShowRegistrationForm(true);
    setError(null);
    setRegistrationSuccess(false);
  };

  const handleSwitchToLogin = () => {
    setShowRegistrationForm(false);
    setError(null);
    setRegistrationSuccess(false);
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
  
  if (showRegistrationForm) {
    return (
      <RegistrationForm
        onSubmit={handleRegistration}
        onSwitchToLogin={handleSwitchToLogin}
        loading={loading}
        error={error}
      />
    );
  }

  if (registrationSuccess) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-[var(--paralegal-ivory)] border border-[var(--paralegal-gold)] rounded-xl p-8 md:p-12 shadow-lg text-center">
          <div className="mx-auto h-16 w-16 text-green-600 mb-6">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[var(--paralegal-charcoal)] font-serif mb-4">
            Registration Successful!
          </h2>
          <p className="text-sm text-[var(--paralegal-slate)] mb-6">
            Please check your email and click the verification link to complete your registration.
          </p>
          <button
            onClick={handleSwitchToLogin}
            className="w-full h-12 bg-white border-2 border-[var(--paralegal-charcoal)] text-[var(--paralegal-charcoal)] font-semibold rounded-lg hover:bg-[var(--paralegal-charcoal)] hover:text-white transition-all duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

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
                Username or Email
              </label>
              <input
                name="username"
                type="text"
                placeholder="Enter your username or email"
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

          {/* Registration Link */}
          <div className="text-center mt-4">
            <p className="text-sm text-[var(--paralegal-slate)]">
              Don't have an account?{" "}
              <button
                type="button"
                className="text-[var(--paralegal-gold)] hover:text-[var(--paralegal-charcoal)] font-semibold hover:underline transition-colors duration-200"
                onClick={handleSwitchToRegistration}
              >
                Sign up
              </button>
            </p>
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
