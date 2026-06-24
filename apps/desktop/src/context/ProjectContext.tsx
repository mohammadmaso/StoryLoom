import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, type ProjectState } from "@/lib/api";

interface ProjectContextValue {
  project: ProjectState | null;
  apiOnline: boolean;
  refresh: () => Promise<void>;
  openProject: (path: string) => Promise<void>;
  closeProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<ProjectState | null>(null);
  const [apiOnline, setApiOnline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      await api.health();
      setApiOnline(true);
      const state = await api.getProject();
      setProject(state.open ? state : null);
    } catch {
      setApiOnline(false);
      setProject(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openProject = useCallback(async (path: string) => {
    const state = await api.openProject(path);
    setProject(state);
  }, []);

  const closeProject = useCallback(async () => {
    await api.closeProject();
    setProject(null);
  }, []);

  return (
    <ProjectContext.Provider
      value={{ project, apiOnline, refresh, openProject, closeProject }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject outside provider");
  return ctx;
}
