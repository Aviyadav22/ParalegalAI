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
                name="password"
                type="password"
                placeholder="Password"
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
