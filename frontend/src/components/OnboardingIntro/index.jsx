import React, { useState, useEffect } from "react";
import { Scales, FileText, ChartLineUp } from "@phosphor-icons/react";
import paralegalLogo from "@/media/logo/paralegal-ai.png";

const ONBOARDING_COMPLETE_KEY = "paralegalai_onboarding_complete";

// Helper function to reset onboarding (for testing)
export const resetOnboarding = () => {
  localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
  console.log("Onboarding reset. Refresh the page to see it again.");
};

// Make it available globally for easy testing
if (typeof window !== 'undefined') {
  window.resetOnboarding = resetOnboarding;
}

export default function OnboardingIntro({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);
  const [animationStage, setAnimationStage] = useState(0);

  useEffect(() => {
    // Check if user has already seen the onboarding
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    if (hasSeenOnboarding === "true") {
      setIsVisible(false);
      onComplete?.();
      return;
    }

    // Trigger animation stages
    const timers = [
      setTimeout(() => setAnimationStage(1), 100), // Logo
      setTimeout(() => setAnimationStage(2), 600), // Headline
      setTimeout(() => setAnimationStage(3), 1100), // Subheadline
      setTimeout(() => setAnimationStage(4), 1400), // Feature cards
      setTimeout(() => setAnimationStage(5), 2000), // CTA
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleEnterWorkspace = () => {
    // Store flag to not show again
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    
    // Fade out animation
    setIsVisible(false);
    setTimeout(() => {
      onComplete?.();
    }, 600);
  };

  if (!isVisible && localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true") {
    return null;
  }

  const features = [
    {
      icon: Scales,
      title: "AI Legal Research",
      description: "Find judgments and draft research memo in seconds.",
    },
    {
      icon: FileText,
      title: "Smart Drafting",
      description: "Generate and review petitions, contracts, and notices.",
    },
    {
      icon: ChartLineUp,
      title: "Case Insight",
      description: "Analyze trends and uncover similar precedents.",
    },
  ];

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-theme-bg-primary transition-opacity duration-600 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Subtle animated background */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div
          className="absolute w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[600px] md:h-[600px] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(197, 168, 128, 0.2) 0%, transparent 70%)",
            top: "10%",
            left: "20%",
            animation: "float 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] md:w-[500px] md:h-[500px] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(197, 168, 128, 0.15) 0%, transparent 70%)",
            bottom: "10%",
            right: "15%",
            animation: "float 25s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center max-w-3xl px-4 sm:px-6 text-center pb-8 sm:pb-12 md:pb-20 min-h-screen sm:min-h-0 justify-center onboarding-mobile-container pt-16 sm:pt-0">
        {/* Logo */}
        <div
          className={`mb-3 sm:mb-4 transition-all duration-600 ${
            animationStage >= 1
              ? "opacity-50 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <img
            src={paralegalLogo}
            alt="Paralegal AI"
            className="h-10 sm:h-12 w-auto"
          />
        </div>

        {/* Headline */}
        <h1
          className={`text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-theme-text-primary mb-2 sm:mb-3 transition-all duration-500 delay-100 ${
            animationStage >= 2
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
          style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
        >
          Welcome to Paralegal AI
        </h1>

        {/* Subheadline */}
        <p
          className={`text-sm sm:text-base md:text-lg text-theme-text-secondary max-w-xl mb-6 sm:mb-8 transition-all duration-500 delay-200 ${
            animationStage >= 3
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          Your intelligent legal workspace for research, drafting, and discovery.
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 w-full max-w-2xl">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`p-3 sm:p-4 rounded-lg bg-theme-bg-secondary border border-theme-modal-border transition-all duration-500 hover:bg-theme-bg-container hover:border-[#c5a880]/30 ${
                animationStage >= 4
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: `${300 + index * 100}ms`,
              }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-2 sm:mb-3 p-1.5 sm:p-2 rounded-lg bg-[#c5a880]/20">
                  <feature.icon size={24} className="sm:w-7 sm:h-7 text-[#c5a880]" weight="duotone" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-theme-text-primary mb-1 sm:mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-xs text-theme-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Glowing divider */}
        <div
          className={`w-32 sm:w-48 h-px mb-4 sm:mb-6 transition-all duration-500 ${
            animationStage >= 5
              ? "opacity-100 scale-x-100"
              : "opacity-0 scale-x-0"
          }`}
          style={{
            background: "linear-gradient(90deg, transparent, #c5a880, transparent)",
            boxShadow: "0 0 15px rgba(197, 168, 128, 0.4)",
          }}
        />

        {/* CTA Button */}
        <button
          onClick={handleEnterWorkspace}
          className={`group relative px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold text-white transition-all duration-500 hover:scale-105 active:scale-95 min-h-[44px] onboarding-cta-button ${
            animationStage >= 5
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
          style={{
            background: "linear-gradient(135deg, #c5a880 0%, #b8975f 100%)",
            boxShadow: "0 4px 15px rgba(197, 168, 128, 0.3)",
            paddingBottom: "env(safe-area-inset-bottom, 0.75rem)",
          }}
        >
          <span className="relative z-10">Enter Workspace</span>
          <div
            className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: "linear-gradient(135deg, #d4b890 0%, #c5a880 100%)",
              boxShadow: "0 6px 25px rgba(197, 168, 128, 0.5)",
            }}
          />
        </button>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        /* Mobile-specific optimizations */
        @media (max-width: 767px) {
          .onboarding-mobile-container {
            padding-top: env(safe-area-inset-top, 1rem);
            padding-bottom: env(safe-area-inset-bottom, 1rem);
            min-height: 100vh;
            min-height: 100dvh; /* Dynamic viewport height for mobile browsers */
          }
        }
        
        /* Ensure button is always accessible on mobile */
        @media (max-width: 400px) {
          .onboarding-cta-button {
            min-height: 44px;
            font-size: 0.875rem;
            padding: 0.75rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
