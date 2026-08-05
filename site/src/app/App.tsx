import { useState, useMemo } from "react";
import { useGmailAuth } from "./hooks/useGmailAuth";
import { useWorkspaceState } from "./hooks/useWorkspaceState";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Dashboard } from "./components/Dashboard";
import { Timeline } from "./components/Timeline";
import { Sources } from "./components/Sources";
import { Health } from "./components/Health";
import { AuthOverlay } from "./components/AuthOverlay";

export function App() {
  const { token, user, isLoading, error, login, logout, retryInit } = useGmailAuth();
  const workspace = useWorkspaceState(token);
  const [darkMode, setDarkMode] = useState(true);

  const activeProjectId = workspace.activeProject?.id;

  // Events for the active project. Unassigned events (the model couldn't tell
  // which project) stay visible everywhere rather than disappearing.
  const projectEvents = useMemo(
    () => workspace.events.filter((e) => e.projectId === activeProjectId || !e.projectId),
    [workspace.events, activeProjectId]
  );

  if (isLoading) {
    // Same background as the loaded shell so there is no colour flash.
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a1628]">
        <div role="status" aria-label="Loading" className="animate-spin text-4xl text-[#c9a227]">
          <span aria-hidden="true">↻</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full overflow-hidden transition-colors duration-300 ${darkMode ? "bg-[#0a1628]" : "bg-gray-100"}`}>
      <Sidebar
        projects={workspace.projects}
        activeProject={workspace.activeProject}
        onSelectProject={workspace.setActiveProject}
        activePanel={workspace.activePanel}
        onSelectPanel={workspace.setActivePanel}
        darkMode={darkMode}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          activeProject={workspace.activeProject}
          activePanel={workspace.activePanel}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(!darkMode)}
          user={user}
          onLogout={logout}
          events={projectEvents}
          reviewCount={workspace.reviewQueue.length}
          onOpenSources={() => workspace.setActivePanel("sources")}
        />

        <main className="relative min-h-0 flex-1 overflow-hidden">
          {workspace.activePanel === "dashboard" && (
            <Dashboard
              events={projectEvents}
              reviewQueue={workspace.reviewQueue}
              stats={workspace.stats}
              project={workspace.activeProject}
              intelligence={workspace.activeIntelligence}
              reasoningEnabled={workspace.reasoningEnabled}
              syncing={workspace.syncState === "syncing"}
              darkMode={darkMode}
              onOpenTimeline={() => workspace.setActivePanel("timeline")}
              onOpenSources={() => workspace.setActivePanel("sources")}
              onReanalyse={workspace.reanalyse}
            />
          )}
          {workspace.activePanel === "timeline" && (
            <Timeline
              events={projectEvents}
              darkMode={darkMode}
              syncing={workspace.syncState === "syncing"}
            />
          )}
          {workspace.activePanel === "sources" && (
            <Sources
              stats={workspace.stats}
              reviewQueue={workspace.reviewQueue}
              connectors={workspace.connectors}
              user={user}
              syncState={workspace.syncState}
              stage={workspace.stage}
              lastSync={workspace.lastSync}
              syncError={workspace.syncError}
              onSync={workspace.sync}
              onAccept={workspace.acceptReview}
              onDismiss={workspace.dismissReview}
              darkMode={darkMode}
            />
          )}
          {workspace.activePanel === "health" && (
            <Health connectors={workspace.connectors} darkMode={darkMode} />
          )}

          {/* Auth overlay blocks the content if not signed in */}
          {!token && <AuthOverlay onLogin={login} onRetry={retryInit} error={error} darkMode={darkMode} />}
        </main>
      </div>
    </div>
  );
}
