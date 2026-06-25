import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  LAST_PROJECT_KEY,
  normalizeProjectState,
  type ProjectState,
} from "@/lib/api";

interface ProjectContextValue {
  project: ProjectState | null;
  apiOnline: boolean;
  refresh: () => Promise<void>;
  openProject: (path: string) => Promise<ProjectState>;
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
      setProject(normalizeProjectState(state));
    } catch {
      setApiOnline(false);
      setProject(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!apiOnline || project?.open) return;
    const last = localStorage.getItem(LAST_PROJECT_KEY);
    if (!last) return;
    void api
      .openProject(last)
      .then((state) => {
        const normalized = normalizeProjectState(state);
        if (normalized) setProject(normalized);
      })
      .catch(() => {
        localStorage.removeItem(LAST_PROJECT_KEY);
      });
  }, [apiOnline, project?.open]);

  const openProject = useCallback(async (path: string) => {
    const state = await api.openProject(path);
    const normalized = normalizeProjectState(state);
    if (!normalized) {
      throw new Error("Failed to open project");
    }
    localStorage.setItem(LAST_PROJECT_KEY, normalized.projectRoot!);
    setProject(normalized);
    return normalized;
  }, []);

  const closeProject = useCallback(async () => {
    await api.closeProject();
    localStorage.removeItem(LAST_PROJECT_KEY);
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

export function isProjectOpen(
  project: ProjectState | null,
): project is ProjectState & { open: true; projectRoot: string } {
  return Boolean(project?.open && project.projectRoot);
}
