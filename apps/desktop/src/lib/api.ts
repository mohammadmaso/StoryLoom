export const API_BASE =
  import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export interface ProjectState {
  open: boolean;
  projectRoot?: string;
  config?: Record<string, unknown>;
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
  getTree: () =>
    request<Array<{ folder: string; files: string[] }>>("/tree"),
  getFile: (path: string) =>
    request<ParsedFile>(`/file?path=${encodeURIComponent(path)}`),
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
    request<{ profile: { summary: string } }>("/style/analyze", { method: "POST" }),
  checkPlotHoles: (includeAi = true) =>
    request<{
      findings: Array<{
        severity: string;
        title: string;
        description: string;
        suggestion?: string;
      }>;
      hasCritical: boolean;
    }>("/plot-holes/check", {
      method: "POST",
      body: JSON.stringify({ includeAi }),
    }),
  interview: (data: {
    message?: string;
    history?: string;
    chapter?: string;
    batch?: boolean;
    resumeAnswers?: string;
  }) =>
    request<{ text: string }>("/ai/interview", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  whatIf: (chapter: string) =>
    request<{ text: string }>("/ai/what-if", {
      method: "POST",
      body: JSON.stringify({ chapter }),
    }),
  generate: (data: {
    chapter: string;
    mode?: string;
    outline?: boolean;
    force?: boolean;
  }) =>
    request<{ content: string; outputPath?: string }>("/ai/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  gitLogAi: () =>
    request<Array<{ hash: string; date: string; message: string }>>("/git/log-ai"),
  getReports: () => request<string[]>("/reports"),
  getReport: (name: string) =>
    request<{ name: string; content: string }>(`/reports/${encodeURIComponent(name)}`),
};
