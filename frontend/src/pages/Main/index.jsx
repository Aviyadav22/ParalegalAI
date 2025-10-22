import React, { useState, useEffect } from "react";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import Home from "./Home";
import DefaultChatContainer from "@/components/DefaultChat";
import { isMobile } from "react-device-detect";
import Sidebar, { SidebarMobileHeader } from "@/components/Sidebar";
import { userFromStorage } from "@/utils/request";
import OnboardingIntro from "@/components/OnboardingIntro";

const ONBOARDING_COMPLETE_KEY = "paralegalai_onboarding_complete";

export default function Main() {
  const { loading, requiresAuth, mode } = usePasswordModal();
  const [showOnboarding, setShowOnboarding] = useState(null); // null = checking, true = show, false = hide
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompleted = localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";
    setShowOnboarding(!hasCompleted);
    setOnboardingComplete(hasCompleted);
  }, []);

  if (loading) return <FullScreenLoader />;
  if (requiresAuth !== false)
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;

  // Still checking onboarding status
  if (showOnboarding === null) return <FullScreenLoader />;

  const user = userFromStorage();
  
  // Show onboarding screen (hides everything else)
  if (showOnboarding && !onboardingComplete) {
    return (
      <OnboardingIntro 
        onComplete={() => {
          setShowOnboarding(false);
          setOnboardingComplete(true);
        }} 
      />
    );
  }

  // Show main app
  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex" style={{ paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : '0px' }}>
      {!isMobile ? <Sidebar /> : <SidebarMobileHeader />}
      {!!user && user?.role !== "admin" ? <DefaultChatContainer /> : <Home />}
    </div>
  );
}
