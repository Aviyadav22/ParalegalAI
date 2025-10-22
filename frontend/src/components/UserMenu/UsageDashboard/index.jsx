import React, { useState, useEffect } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import { X, ChartBar, Clock, ChatCircle, FileText, Lightning } from "@phosphor-icons/react";
import System from "@/models/system";
import ModalWrapper from "@/components/ModalWrapper";
import { useTranslation } from "react-i18next";
import "react-circular-progressbar/dist/styles.css";

export default function UsageDashboard({ hideModal }) {
  const { t } = useTranslation();
  const [usage, setUsage] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        setLoading(true);
        const [usageRes, planRes] = await Promise.all([
          System.subscription.usage(),
          System.subscription.current()
        ]);
        
        setUsage(usageRes?.usage || null);
        setPlan(planRes?.subscription || null);
      } catch (err) {
        console.error("Failed to fetch usage data:", err);
        setError("Failed to load usage data");
      } finally {
        setLoading(false);
      }
    };

    fetchUsageData();
  }, []);

  const getUsagePercentage = (current, limit) => {
    if (!limit || limit === 0) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return "#EF4444"; // Red
    if (percentage >= 70) return "#F59E0B"; // Amber
    return "#10B981"; // Green
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <ModalWrapper isOpen={true}>
        <div className="w-full max-w-3xl bg-theme-bg-secondary rounded-lg shadow-lg border border-theme-sidebar-border overflow-hidden">
          <div className="p-4 border-b border-theme-sidebar-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-theme-text-primary">
                Usage Dashboard
              </h2>
              <button
                onClick={hideModal}
                className="p-1.5 hover:bg-theme-bg-primary rounded-lg transition-colors"
              >
                <X size={18} className="text-theme-text-secondary" />
              </button>
            </div>
          </div>
          <div className="p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-text-secondary mx-auto mb-3"></div>
              <p className="text-theme-text-secondary text-sm">Loading usage data...</p>
            </div>
          </div>
        </div>
      </ModalWrapper>
    );
  }

  if (error) {
    return (
      <ModalWrapper isOpen={true}>
        <div className="w-full max-w-3xl bg-theme-bg-secondary rounded-lg shadow-lg border border-theme-sidebar-border overflow-hidden">
          <div className="p-4 border-b border-theme-sidebar-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-theme-text-primary">
                Usage Dashboard
              </h2>
              <button
                onClick={hideModal}
                className="p-1.5 hover:bg-theme-bg-primary rounded-lg transition-colors"
              >
                <X size={18} className="text-theme-text-secondary" />
              </button>
            </div>
          </div>
          <div className="p-6 text-center">
            <div className="text-red-500 mb-3">
              <ChartBar size={32} className="mx-auto" />
            </div>
            <p className="text-theme-text-secondary text-sm">{error}</p>
          </div>
        </div>
      </ModalWrapper>
    );
  }

  const messagesToday = usage?.messagesToday || 0;
  const dailyLimit = usage?.dailyLimit || 0;
  const remainingToday = usage?.remainingToday || 0;
  const messagesPercentage = getUsagePercentage(messagesToday, dailyLimit);
  const messagesColor = getUsageColor(messagesPercentage);
  
  // Extract real usage data
  const documentsThisMonth = usage?.byType?.['document_upload'] || 0;
  const totalDocuments = usage?.totalActions || 0;
  const documentPercentage = Math.min((documentsThisMonth / 50) * 100, 100); // Assuming 50 docs per month limit

  return (
    <ModalWrapper isOpen={true}>
      <div className="w-full max-w-3xl bg-theme-bg-secondary rounded-lg shadow-lg border border-theme-sidebar-border overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-theme-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-theme-bg-primary rounded-lg flex items-center justify-center">
                <ChartBar size={18} className="text-theme-text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-theme-text-primary">Usage Dashboard</h2>
                <p className="text-theme-text-secondary text-xs">Live usage analytics and insights</p>
              </div>
            </div>
            <button
              onClick={hideModal}
              className="p-1.5 hover:bg-theme-bg-primary rounded-lg transition-colors"
            >
              <X size={18} className="text-theme-text-secondary" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Plan Overview */}
          <div className="bg-theme-bg-primary rounded-lg p-4 border border-theme-sidebar-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-theme-text-primary mb-1">
                  Current Plan
                </h3>
                <p className="text-lg font-bold text-theme-text-primary">
                  {plan?.tier || "Free"}
                </p>
                <p className="text-xs text-theme-text-secondary">
                  Status: {plan?.status || "Active"}
                </p>
              </div>
              <div className="w-10 h-10 bg-theme-bg-secondary rounded-lg flex items-center justify-center">
                <Lightning size={18} className="text-theme-text-primary" />
              </div>
            </div>
          </div>

          {/* Usage Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Messages Today */}
            <div className="bg-theme-bg-primary rounded-lg p-4 border border-theme-sidebar-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <ChatCircle size={16} className="text-theme-text-secondary" />
                  <h4 className="font-medium text-theme-text-primary text-sm">Messages Today</h4>
                </div>
                <div className="w-12 h-12">
                  <CircularProgressbar
                    value={messagesPercentage}
                    text={`${Math.round(messagesPercentage)}%`}
                    styles={buildStyles({
                      pathColor: messagesColor,
                      textColor: messagesColor,
                      trailColor: "var(--theme-sidebar-border)",
                      textSize: "12px",
                      fontWeight: "bold"
                    })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-theme-text-secondary">Used:</span>
                  <span className="font-medium text-theme-text-primary text-sm">
                    {formatNumber(messagesToday)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-theme-text-secondary">Limit:</span>
                  <span className="font-medium text-theme-text-primary text-sm">
                    {dailyLimit ? formatNumber(dailyLimit) : "Unlimited"}
                  </span>
                </div>
                {remainingToday !== null && (
                  <div className="flex justify-between">
                    <span className="text-xs text-theme-text-secondary">Remaining:</span>
                    <span className="font-medium text-[#10B981] text-sm">
                      {formatNumber(remainingToday)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Documents Processed */}
            <div className="bg-theme-bg-primary rounded-lg p-4 border border-theme-sidebar-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <FileText size={16} className="text-theme-text-secondary" />
                  <h4 className="font-medium text-theme-text-primary text-sm">Documents</h4>
                </div>
                <div className="w-12 h-12">
                  <CircularProgressbar
                    value={documentPercentage}
                    text={`${Math.round(documentPercentage)}%`}
                    styles={buildStyles({
                      pathColor: "#10B981",
                      textColor: "#10B981",
                      trailColor: "var(--theme-sidebar-border)",
                      textSize: "12px",
                      fontWeight: "bold"
                    })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-theme-text-secondary">This Month:</span>
                  <span className="font-medium text-theme-text-primary text-sm">{formatNumber(documentsThisMonth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-theme-text-secondary">Total:</span>
                  <span className="font-medium text-theme-text-primary text-sm">{formatNumber(totalDocuments)}</span>
                </div>
              </div>
            </div>

            {/* Usage Summary */}
            <div className="bg-theme-bg-primary rounded-lg p-4 border border-theme-sidebar-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Clock size={16} className="text-theme-text-secondary" />
                  <h4 className="font-medium text-theme-text-primary text-sm">Usage Summary</h4>
                </div>
                <div className="w-12 h-12">
                  <CircularProgressbar
                    value={Math.min((totalDocuments / 100) * 100, 100)}
                    text={`${Math.round(Math.min((totalDocuments / 100) * 100, 100))}%`}
                    styles={buildStyles({
                      pathColor: "#3B82F6",
                      textColor: "#3B82F6",
                      trailColor: "var(--theme-sidebar-border)",
                      textSize: "12px",
                      fontWeight: "bold"
                    })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-theme-text-secondary">Total Actions:</span>
                  <span className="font-medium text-theme-text-primary text-sm">{formatNumber(totalDocuments)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-theme-text-secondary">Period:</span>
                  <span className="font-medium text-theme-text-primary text-sm">{usage?.period || 30} days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Trends */}
          <div className="bg-theme-bg-primary rounded-lg p-4 border border-theme-sidebar-border">
            <h3 className="text-sm font-semibold text-theme-text-primary mb-3">
              Usage Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="text-center p-3 bg-theme-bg-secondary rounded-lg border border-theme-sidebar-border">
                <p className="text-lg font-bold text-theme-text-primary">{formatNumber(messagesToday)}</p>
                <p className="text-xs text-theme-text-secondary">Messages Today</p>
              </div>
              <div className="text-center p-3 bg-theme-bg-secondary rounded-lg border border-theme-sidebar-border">
                <p className="text-lg font-bold text-[#10B981]">{formatNumber(documentsThisMonth)}</p>
                <p className="text-xs text-theme-text-secondary">Documents This Month</p>
              </div>
              <div className="text-center p-3 bg-theme-bg-secondary rounded-lg border border-theme-sidebar-border">
                <p className="text-lg font-bold text-[#3B82F6]">{formatNumber(totalDocuments)}</p>
                <p className="text-xs text-theme-text-secondary">Total Actions</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={hideModal}
              className="px-4 py-2 text-theme-text-secondary hover:text-theme-text-primary transition-colors text-sm"
            >
              Close
            </button>
            <button
              className="px-4 py-2 bg-theme-text-primary text-theme-bg-secondary rounded-lg hover:bg-theme-text-secondary transition-colors text-sm"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
