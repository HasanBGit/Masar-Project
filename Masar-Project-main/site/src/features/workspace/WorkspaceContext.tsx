// Shared workspace state — active project, active panel, dark mode
// Consumed by all workspace sub-components.
import { createContext, useContext, useState, type ReactNode } from "react";
import { PROJECTS, type Project } from "./mockData";

export type WorkspacePanel = "timeline" | "comms" | "health";

interface WorkspaceCtx {
  activeProject: Project;
  setActiveProject: (p: Project) => void;
  activePanel: WorkspacePanel;
  setActivePanel: (p: WorkspacePanel) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProject] = useState(PROJECTS[0]);
  const [activePanel, setActivePanel] = useState<WorkspacePanel>("timeline");
  const [darkMode, setDarkMode] = useState(true);

  return (
    <Ctx.Provider
      value={{
        activeProject,
        setActiveProject,
        activePanel,
        setActivePanel,
        darkMode,
        toggleDarkMode: () => setDarkMode((v) => !v),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
