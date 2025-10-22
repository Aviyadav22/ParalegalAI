import React, { useState, useEffect } from "react";
import System from "../../../models/system";
import SingleUserAuth from "./SingleUserAuth";
import MultiUserAuth from "./MultiUserAuth";
import {
  AUTH_TOKEN,
  AUTH_USER,
  AUTH_TIMESTAMP,
} from "../../../utils/constants";
import useLogo from "../../../hooks/useLogo";
import illustration from "@/media/illustrations/login-illustration.svg";
import paralegalLogo from "@/media/logo/paralegal-ai-dark.png";

export default function PasswordModal({ mode = "single" }) {
  const { loginLogo } = useLogo();
  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] h-full flex flex-col md:flex-row items-center justify-center min-h-screen">
      {/* Light Mode Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFFDF8] to-[#F8F4E8] login-bg-light" />
      
      {/* Dark Mode Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0E0E0E] to-[#1A1A1A] login-bg-dark" />
      
      {/* Left Side - Brand/Logo Area */}
      <div className="hidden md:flex md:w-1/2 md:h-full md:items-center md:justify-center relative">
        <div className="flex flex-col items-center space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-center">
            <img
              src={paralegalLogo}
              alt="Paralegal AI Logo"
              className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain"
              style={{ objectFit: "contain" }}
            />
          </div>
          
          {/* Tagline */}
          <div className="text-center space-y-2">
            <p className="text-2xl font-serif font-light tracking-wide login-tagline">
              Precision. Integrity. Intelligence.
            </p>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#C9A86A] to-transparent mx-auto" />
          </div>
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div className="flex flex-col items-center justify-center h-full w-full md:w-1/2 z-50 relative px-4 sm:px-6 md:px-0">
      {/* Mobile Logo */}
      <div className="md:hidden mb-4 sm:mb-6">
        <div className="flex items-center justify-center">
          <img
            src={paralegalLogo}
            alt="Paralegal AI Logo"
            className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
            style={{ objectFit: "contain" }}
          />
        </div>
        <div className="text-center mt-3 sm:mt-4">
          <p className="text-sm sm:text-lg font-serif font-light tracking-wide login-tagline">
            Precision. Integrity. Intelligence.
          </p>
        </div>
      </div>
        
        {/* Login Form Container */}
        <div className="w-full max-w-md px-6 py-8 sm:px-6 sm:py-8 md:px-8 md:py-12 backdrop-blur-sm rounded-2xl shadow-2xl login-form-container">
          {mode === "single" ? <SingleUserAuth /> : <MultiUserAuth />}
        </div>
      </div>
    </div>
  );
}

export function usePasswordModal(notry = false) {
  const [auth, setAuth] = useState({
    loading: true,
    requiresAuth: false,
    mode: "single",
  });

  useEffect(() => {
    async function checkAuthReq() {
      if (!window) return;

      // If the last validity check is still valid
      // we can skip the loading.
      if (!System.needsAuthCheck() && notry === false) {
        setAuth({
          loading: false,
          requiresAuth: false,
          mode: "multi",
        });
        return;
      }

      const settings = await System.keys();
      if (settings?.MultiUserMode) {
        const currentToken = window.localStorage.getItem(AUTH_TOKEN);
        if (!!currentToken) {
          const valid = notry ? false : await System.checkAuth(currentToken);
          if (!valid) {
            setAuth({
              loading: false,
              requiresAuth: true,
              mode: "multi",
            });
            window.localStorage.removeItem(AUTH_USER);
            window.localStorage.removeItem(AUTH_TOKEN);
            window.localStorage.removeItem(AUTH_TIMESTAMP);
            return;
          } else {
            setAuth({
              loading: false,
              requiresAuth: false,
              mode: "multi",
            });
            return;
          }
        } else {
          setAuth({
            loading: false,
            requiresAuth: true,
            mode: "multi",
          });
          return;
        }
      } else {
        // Running token check in single user Auth mode.
        // If Single user Auth is disabled - skip check
        const requiresAuth = settings?.RequiresAuth || false;
        if (!requiresAuth) {
          setAuth({
            loading: false,
            requiresAuth: false,
            mode: "single",
          });
          return;
        }

        const currentToken = window.localStorage.getItem(AUTH_TOKEN);
        if (!!currentToken) {
          const valid = notry ? false : await System.checkAuth(currentToken);
          if (!valid) {
            setAuth({
              loading: false,
              requiresAuth: true,
              mode: "single",
            });
            window.localStorage.removeItem(AUTH_TOKEN);
            window.localStorage.removeItem(AUTH_USER);
            window.localStorage.removeItem(AUTH_TIMESTAMP);
            return;
          } else {
            setAuth({
              loading: false,
              requiresAuth: false,
              mode: "single",
            });
            return;
          }
        } else {
          setAuth({
            loading: false,
            requiresAuth: true,
            mode: "single",
          });
          return;
        }
      }
    }
    checkAuthReq();
  }, []);

  return auth;
}
