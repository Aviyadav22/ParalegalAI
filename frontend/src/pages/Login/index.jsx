import React, { useEffect, useRef } from "react";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import { Navigate } from "react-router-dom";
import paths from "@/utils/paths";
import useQuery from "@/hooks/useQuery";
import useSimpleSSO from "@/hooks/useSimpleSSO";
import { AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { API_BASE } from "@/utils/constants";
import showToast from "@/utils/toast";

/**
 * Login page that handles both single and multi-user login.
 *
 * If Simple SSO is enabled and no login is allowed, the user will be redirected to the SSO login page
 * which may not have a token so the login will fail.
 *
 * @returns {JSX.Element}
 */
export default function Login() {
  const query = useQuery();
  const { loading: ssoLoading, ssoConfig } = useSimpleSSO();
  const { loading, requiresAuth, mode } = usePasswordModal(!!query.get("nt"));
  const oauthProcessed = useRef(false);

  // Handle OAuth callback token -> store token, fetch user, redirect
  useEffect(() => {
    const token = query.get("token");
    const success = query.get("success");
    const error = query.get("error");
    
    // Prevent processing the same OAuth callback multiple times
    if (oauthProcessed.current) {
      console.log('[OAuth] Already processed, skipping duplicate request');
      return;
    }
    
    // Show error message if OAuth failed
    if (error && !token) {
      oauthProcessed.current = true;
      
      const errorMessages = {
        'google_auth_expired': 'Google authentication expired. Please try again.',
        'google_config_error': 'Google OAuth configuration error. Please contact support.',
        'token_exchange_failed': 'Failed to authenticate with Google. Please try again.',
        'invalid_state': 'Security verification failed. Please try again.',
        'no_code': 'Authentication code missing. Please try again.',
        'no_email': 'Could not retrieve email from Google account.',
        'authentication_failed': 'Authentication failed. Please try again.'
      };
      
      const message = errorMessages[error] || 'Login failed. Please try again.';
      console.error('[OAuth] Error:', error, message);
      
      // Show error notification to user
      showToast(message, 'error', { autoClose: 8000 });
      
      setTimeout(() => {
        // Clear the error from URL after showing
        window.history.replaceState({}, document.title, paths.login());
        oauthProcessed.current = false; // Allow retry after error
      }, 100);
      return;
    }
    
    if (!token) return;

    // Mark as processed immediately to prevent race conditions
    oauthProcessed.current = true;

    async function persistOAuthLogin() {
      try {
        console.log('[OAuth] Processing token from callback');
        window.localStorage.setItem(AUTH_TOKEN, token);
        
        // Fetch current user
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        console.log('[OAuth] User data received:', data);
        
        if (data?.success && data?.user) {
          window.localStorage.setItem(AUTH_USER, JSON.stringify(data.user));
          console.log('[OAuth] Login successful, redirecting to home...');
          
          // Redirect immediately without delay to prevent re-renders
          window.location.href = paths.home();
          return;
        } else {
          console.error('[OAuth] Failed to get user data:', data);
          showToast('Failed to retrieve user information. Please try again.', 'error');
          oauthProcessed.current = false; // Allow retry on failure
        }
      } catch (e) {
        console.error('[OAuth] Error during login:', e);
        showToast('An error occurred during login. Please try again.', 'error');
        oauthProcessed.current = false; // Allow retry on error
      }
    }
    persistOAuthLogin();
  }, [query]);

  if (loading || ssoLoading) return <FullScreenLoader />;

  // If simple SSO is enabled and no login is allowed, redirect to the SSO login page.
  if (ssoConfig.enabled && ssoConfig.noLogin) {
    // If a noLoginRedirect is provided and no token is provided, redirect to that webpage.
    if (!!ssoConfig.noLoginRedirect && !query.has("token"))
      return window.location.replace(ssoConfig.noLoginRedirect);
    // Otherwise, redirect to the SSO login page.
    else return <Navigate to={paths.sso.login()} />;
  }

  if (requiresAuth === false) return <Navigate to={paths.home()} />;

  return <PasswordModal mode={mode} />;
}
