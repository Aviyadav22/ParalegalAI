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

export default function PasswordModal({ mode = "single" }) {
  const { loginLogo } = useLogo();
  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] h-full bg-theme-bg-primary flex flex-col md:flex-row items-center justify-center">
      {/* Left Panel - Brand Area */}
      <div className="hidden md:flex md:w-1/2 md:h-full md:items-center md:justify-center relative">
        <div 
          className="w-full h-full flex flex-col items-center justify-center px-12"
          style={{
            background: 'linear-gradient(135deg, #FAF9F6 0%, #F7F5F0 100%)'
          }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center w-24 h-24 rounded-lg bg-[var(--paralegal-gold)] mb-6 shadow-lg">
            <svg className="w-8 h-8 text-[var(--paralegal-charcoal)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3c-.5 0-1 .4-1 1v1h2V4c0-.6-.4-1-1-1zm0 3c-.6 0-1 .4-1 1v8h2V7c0-.6-.4-1-1-1zm-8 2l3 3c.6.6 1.4.6 2 0l1-1v2l-1 1c-.6.6-.6 1.4 0 2l3 3H4l3-3c.6-.6.6-1.4 0-2l-1-1v-2l1-1c.6-.6 1.4-.6 2 0l3-3H4zm16 0h-8l3 3c.6.6 1.4.6 2 0l1 1v2l-1 1c-.6.6-.6 1.4 0 2l3 3h8l-3-3c-.6-.6-.6-1.4 0-2l1-1v-2l-1-1c-.6-.6-1.4-.6-2 0l-3-3zm-8 10c-.6 0-1 .4-1 1v1h2v-1c0-.6-.4-1-1-1z"/>
            </svg>
          </div>
          
          {/* App Name */}
          <h1 className="text-5xl font-bold text-[var(--paralegal-charcoal)] font-serif mb-4">
            Paralegal AI
          </h1>
          
          {/* Tagline */}
          <p className="text-xl text-[var(--paralegal-slate)] font-sans mb-8">
            The AI-Powered Legal Assistant
          </p>
          
          {/* Divider */}
          <div className="w-16 h-1 bg-[var(--paralegal-gold)] rounded"></div>
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <div className="flex flex-col items-center justify-center h-full w-full md:w-1/2 z-50 relative bg-theme-bg-secondary md:bg-transparent">
        {mode === "single" ? <SingleUserAuth /> : <MultiUserAuth />}
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
