import React, { useState, useEffect } from "react";
import { BookOpen, Plus, Question, ArrowRight, Scales } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import { useNewWorkspaceModal } from "@/components/Modals/NewWorkspace";
import NewWorkspaceModal from "@/components/Modals/NewWorkspace";
import { useTranslation } from "react-i18next";
import { isMobile } from "react-device-detect";

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const {
    showing: showingNewWsModal,
    showModal: showNewWsModal,
    hideModal: hideNewWsModal,
  } = useNewWorkspaceModal();

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const allWorkspaces = await Workspace.all();
        // Limit to 3 most recent workspaces
        setWorkspaces(allWorkspaces.slice(0, 3));
      } catch (error) {
        console.error("Error fetching workspaces:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  const handleWorkspaceClick = (workspace) => {
    navigate(paths.workspace.chat(workspace.slug));
  };

  const handleCreateWorkspace = () => {
    showNewWsModal();
  };

  const handleHelp = () => {
    // Add help functionality
    console.log("Help clicked");
  };

  return (
    <div
      style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
      className="relative bg-[#FAF9F6] w-full h-full overflow-y-auto"
    >
      {/* Background Watermark - Scales of Justice */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[300px] h-[300px] opacity-[0.03]">
          <Scales className="w-full h-full text-[#C2A97F]" />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4 pt-20 md:pt-8">
        <div className="w-full max-w-6xl">
          {/* Premium Header Section */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-black font-serif mb-6 tracking-tight">
              Welcome to Paralegal AI
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-gray-600 font-sans max-w-4xl mx-auto leading-relaxed">
              Select a workspace to begin your legal research. Upload documents, ask questions, or analyze case law with AI assistance.
            </p>
          </div>

          {/* Premium Workspace Cards Section */}
          <div className="mb-16">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 md:h-40 p-6 bg-[#FAF9F6] border border-[#C2A97F] rounded-xl animate-pulse shadow-sm">
                    <div className="flex items-center gap-4 h-full">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : workspaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {workspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    onClick={() => handleWorkspaceClick(workspace)}
                    className="h-32 md:h-40 p-6 bg-[#FAF9F6] border border-[#C2A97F] rounded-xl cursor-pointer transition-all duration-300 hover:bg-[#C2A97F] hover:text-black hover:shadow-lg group"
                  >
                    <div className="flex items-center gap-4 h-full">
                      <div className="w-12 h-12 bg-[#C2A97F] group-hover:bg-black rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300">
                        <BookOpen className="w-6 h-6 text-black group-hover:text-[#C2A97F] transition-colors duration-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-black text-lg md:text-xl truncate mb-2 group-hover:text-black">
                          {workspace.name}
                        </h3>
                        <p className="text-sm md:text-base text-gray-600 group-hover:text-black transition-colors duration-300">
                          {workspace.threadCount || 0} Active Threads
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors duration-300" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-[#C2A97F] rounded-full flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-black" />
                </div>
                <h3 className="text-2xl font-bold text-black mb-3 font-serif">
                  No Recent Workspaces
                </h3>
                <p className="text-gray-600 mb-8 text-lg">
                  Create your first workspace to get started with legal research
                </p>
              </div>
            )}
          </div>

          {/* Premium Quick Actions */}
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <button
              onClick={handleCreateWorkspace}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-[#C2A97F] text-black font-bold text-lg rounded-xl hover:bg-black hover:text-[#C2A97F] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-6 h-6" />
              Create New Workspace
            </button>
            
            <button
              onClick={handleHelp}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-transparent text-gray-600 font-semibold text-lg rounded-xl border-2 border-gray-300 hover:bg-gray-100 hover:border-[#C2A97F] hover:text-[#C2A97F] transition-all duration-300"
            >
              <Question className="w-6 h-6" />
              Help
            </button>
          </div>
        </div>
      </div>

      {showingNewWsModal && <NewWorkspaceModal hideModal={hideNewWsModal} />}
    </div>
  );
}
