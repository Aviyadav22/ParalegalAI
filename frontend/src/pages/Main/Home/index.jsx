import React, { useState, useEffect } from "react";
import { isMobile } from "react-device-detect";
import { BookOpen, ArrowRight } from "@phosphor-icons/react";
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const allWorkspaces = await Workspace.all();
        // Get top 3 workspaces
        setWorkspaces(allWorkspaces.slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch workspaces:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchWorkspaces();
  }, []);

  const handleWorkspaceClick = (workspace) => {
    navigate(paths.workspace.chat(workspace.slug));
  };

  return (
    <div
      style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
      className="relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-container w-full h-full"
    >
      <div className="w-full h-full flex flex-col items-center overflow-y-auto no-scroll">
        <div className="w-full max-w-[1000px] flex flex-col items-center gap-y-8 p-4 pt-16 md:p-12 md:pt-24">
          {/* Welcome Section */}
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-semibold text-theme-text-primary mb-4">
              Welcome to Paralegal AI
            </h1>
            <p className="text-lg md:text-xl text-theme-text-secondary font-light max-w-[700px]">
              Select a workspace to begin your legal research. Upload documents, ask questions, or analyze case law with AI assistance.
            </p>
          </div>

          {/* Workspaces Grid */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {loading ? (
              // Loading skeleton
              <>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-theme-bg-secondary light:bg-white light:border light:border-theme-sidebar-border rounded-xl p-6 animate-pulse"
                  >
                    <div className="w-12 h-12 bg-theme-bg-primary rounded-lg mb-4"></div>
                    <div className="h-6 bg-theme-bg-primary rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-theme-bg-primary rounded w-1/2"></div>
                  </div>
                ))}
              </>
            ) : workspaces.length > 0 ? (
              workspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onClick={() => handleWorkspaceClick(workspace)}
                />
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-theme-text-secondary">
                  No workspaces available. Create one to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceCard({ workspace, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group bg-theme-bg-secondary light:bg-white light:border light:border-theme-sidebar-border rounded-xl p-6 hover:bg-theme-bg-primary light:hover:bg-gray-50 transition-all duration-200 text-left flex flex-col justify-between min-h-[160px]"
    >
      <div>
        <div className="w-12 h-12 bg-amber-600/20 light:bg-amber-100 rounded-lg flex items-center justify-center mb-4">
          <BookOpen className="w-6 h-6 text-amber-600" weight="duotone" />
        </div>
        <h3 className="text-lg font-semibold text-theme-text-primary mb-2 group-hover:text-amber-600 transition-colors">
          {workspace.name}
        </h3>
        <p className="text-sm text-theme-text-secondary">
          0 Active Threads
        </p>
      </div>
      <div className="flex items-center justify-end mt-4">
        <ArrowRight className="w-5 h-5 text-theme-text-secondary group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
      </div>
    </button>
  );
}
