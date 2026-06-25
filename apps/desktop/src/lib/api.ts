import type { StorySuggestion, SuggestionApplyMode } from "@storyloom/shared";

const API_PORT = import.meta.env.VITE_API_PORT ?? "3847";

export type { StorySuggestion, SuggestionApplyMode };

export interface PlotHoleFinding {
  severity: string;
  title: string;
  description: string;
  suggestion?: string;
}

export interface StyleProfileData {
  analyzedAt: string;
  chapterCount: number;
  avgSentenceLength: number;
  dialogueRatio: number;
  commonWords: string[];
  povMarkers: string[];
  summary: string;
}

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(message: string, status: number, body: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  isCriticalPlotHoles(): boolean {
    return this.message === "CRITICAL_PLOT_HOLES" && Array.isArray(this.body.findings);
  }

  getPlotHoleFindings(): PlotHoleFinding[] {
    return (this.body.findings as PlotHoleFinding[] | undefined) ?? [];
  }
}

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

/** Vite dev proxy in browser; direct URL in Tauri webview (proxy is unreliable there). */
export const API_BASE =
  import.meta.env.VITE_API_URL ??
  (isTauriRuntime()
    ? `http://127.0.0.1:${API_PORT}/api`
    : "/api");

export const LAST_PROJECT_KEY = "storyloom-last-project";

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as Record<
      string,
      unknown
    >;
    throw new ApiError(
      typeof err.error === "string" ? err.error : res.statusText,
      res.status,
      err,
    );
  }
  return res.json() as Promise<T>;
}

export interface ProjectState {
  open: boolean;
  projectRoot?: string;
  config?: Record<string, unknown>;
}

export function normalizeProjectState(
  state: ProjectState | Partial<ProjectState>,
): ProjectState | null {
  if (state.open === false) return null;
  if (state.projectRoot) {
    return {
      open: true,
      projectRoot: state.projectRoot,
      config: state.config,
    };
  }
  return null;
}

export interface ParsedFile {
  frontmatter: Record<string, unknown>;
  body: string;
  filePath: string;
  relativePath: string;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    relativePath: string;
    type: string;
    status: string;
  }>;
  edges: Array<{ source: string; target: string; label: string }>;
  warnings: Array<{ type: string; message: string }>;
}

export interface EnvSettings {
  openaiApiKeySet: boolean;
  anthropicApiKeySet: boolean;
  openaiBaseUrl: string;
  anthropicBaseUrl: string;
  ollamaBaseUrl: string;
}

export interface EnvSettingsUpdate {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  openaiBaseUrl?: string;
  anthropicBaseUrl?: string;
  ollamaBaseUrl?: string;
}

export const api = {
  health: () => request<{ ok: boolean }>("/health"),
  getProject: () => request<ProjectState>("/project"),
  openProject: (path: string) =>
    request<ProjectState>("/project/open", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  closeProject: () =>
    request<{ ok: boolean }>("/project/close", { method: "POST" }),
  initProject: (data: {
    targetDir: string;
    title?: string;
    author?: string;
    genre?: string;
  }) =>
    request<ProjectState>("/project/init", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getConfig: () => request<Record<string, unknown>>("/config"),
  setConfigKey: (key: string, value: unknown) =>
    request<Record<string, unknown>>("/config/set", {
      method: "POST",
      body: JSON.stringify({ key, value }),
    }),
  getEnv: () => request<EnvSettings>("/env"),
  saveEnv: (data: EnvSettingsUpdate) =>
    request<EnvSettings>("/env", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getTree: () =>
    request<Array<{ folder: string; files: string[] }>>("/tree"),
  getFile: (path: string) =>
    request<ParsedFile>(`/file?path=${encodeURIComponent(path)}`),
  deleteFile: (relativePath: string) =>
    request<{ ok: boolean }>(`/file?path=${encodeURIComponent(relativePath)}`, {
      method: "DELETE",
    }),
  resolveWikilink: (label: string) =>
    request<{ path: string | null; ambiguous: string[] }>(
      `/wikilink/resolve?label=${encodeURIComponent(label)}`,
    ),
  saveFile: (relativePath: string, body: string, frontmatter?: Record<string, unknown>) =>
    request<{ ok: boolean }>("/file", {
      method: "PUT",
      body: JSON.stringify({ relativePath, body, frontmatter }),
    }),
  createEntity: (folder: string, name: string) =>
    request<{ path: string }>("/entities", {
      method: "POST",
      body: JSON.stringify({ folder, name }),
    }),
  createChapter: (name: string) =>
    request<{ path: string }>("/chapters", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  promoteCanon: (relativePath: string) =>
    request<{ ok: boolean }>("/canon/promote", {
      method: "POST",
      body: JSON.stringify({ relativePath }),
    }),
  archiveCanon: (relativePath: string) =>
    request<{ ok: boolean }>("/canon/archive", {
      method: "POST",
      body: JSON.stringify({ relativePath }),
    }),
  buildGraph: (exportMermaid = true) =>
    request<{ graph: GraphData }>("/graph/build", {
      method: "POST",
      body: JSON.stringify({ exportMermaid }),
    }),
  getGraph: () => request<GraphData>("/graph"),
  search: (q: string) =>
    request<Array<{ relativePath: string; line: number; text: string }>>(
      `/search?q=${encodeURIComponent(q)}`,
    ),
  analyzeStyle: () =>
    request<{ profile: StyleProfileData; suggestions: StorySuggestion[] }>(
      "/style/analyze",
      { method: "POST" },
    ),
  checkPlotHoles: (data: { includeAi?: boolean; chapter?: string } = {}) =>
    request<{
      findings: PlotHoleFinding[];
      suggestions: StorySuggestion[];
      hasCritical: boolean;
      reportPath?: string;
    }>("/plot-holes/check", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  interview: (data: {
    message?: string;
    history?: string;
    chapter?: string;
    batch?: boolean;
    resumeAnswers?: string;
  }) =>
    request<{ text: string; suggestions: StorySuggestion[]; reportPath?: string }>(
      "/ai/interview",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),
  whatIf: (chapter: string) =>
    request<{ text: string; suggestions: StorySuggestion[]; reportPath?: string }>(
      "/ai/what-if",
      {
        method: "POST",
        body: JSON.stringify({ chapter }),
      },
    ),
  generate: (data: {
    chapter: string;
    mode?: string;
    outline?: boolean;
    force?: boolean;
    preview?: boolean;
  }) =>
    request<{ content: string; suggestions: StorySuggestion[]; outputPath?: string }>(
      "/ai/generate",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),
  applySuggestions: (data: {
    suggestions: StorySuggestion[];
    chapterPath?: string;
    mode?: SuggestionApplyMode;
  }) =>
    request<{
      applied: Array<{ id: string; path: string; mode: SuggestionApplyMode }>;
      skipped: Array<{ id: string; reason: string }>;
    }>("/ai/apply-suggestions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  gitLogAi: () =>
    request<Array<{ hash: string; date: string; message: string }>>("/git/log-ai"),
  getReports: () => request<string[]>("/reports"),
  getReport: (name: string) =>
    request<{ name: string; content: string }>(`/reports/${encodeURIComponent(name)}`),
};
