import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import fs from "node:fs/promises";
import path from "node:path";
import {
  initProject,
  saveConfig,
  setConfigValue,
  parseMarkdownFile,
  writeMarkdownFile,
  createEntity,
  createChapter,
  findChapterFile,
  buildStoryGraph,
  saveStoryGraph,
  graphToMermaid,
  loadAllMarkdownFiles,
  searchProject,
  promoteToCanon,
  archiveFile,
  analyzeStyle,
  saveStyleProfile,
  loadStyleProfile,
  scanStructuralPlotHoles,
  savePlotHoleReport,
  parseLlmPlotHoleFindings,
  hasCriticalFindings,
  buildPlotHolePromptContext,
  buildContextBundle,
  contextBundleToPrompt,
  createAgentServices,
  runInterviewerAgent,
  runBatchInterviewerAgent,
  runWhatIfAgent,
  runPlotHoleAgent,
  runChapterAgent,
  writeChapterOutput,
  GitAutoCommitter,
  validateAiSetup,
  loadProjectEnv,
  walkMarkdownFiles,
  fileExists,
} from "@storyloom/core";
import { ENTITY_FOLDERS, REPORTS_DIR } from "@storyloom/shared";
import type { EntityFolder, WriteMode } from "@storyloom/shared";
import {
  closeProject,
  getSession,
  openProject,
  refreshSession,
  requireSession,
  setSessionConfig,
} from "./session.js";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/project", (c) => {
  const session = getSession();
  if (!session) return c.json({ open: false });
  return c.json({
    open: true,
    projectRoot: session.projectRoot,
    config: session.config,
  });
});

app.post("/api/project/open", async (c) => {
  const { path: projectPath } = await c.req.json<{ path: string }>();
  const session = await openProject(projectPath);
  return c.json({ projectRoot: session.projectRoot, config: session.config });
});

app.post("/api/project/close", (c) => {
  closeProject();
  return c.json({ ok: true });
});

app.post("/api/project/init", async (c) => {
  const body = await c.req.json<{
    targetDir: string;
    title?: string;
    author?: string;
    genre?: string;
    initGit?: boolean;
  }>();
  const projectRoot = await initProject({
    targetDir: body.targetDir,
    title: body.title,
    author: body.author,
    genre: body.genre,
    initGit: body.initGit ?? true,
  });
  const session = await openProject(projectRoot);
  return c.json({ projectRoot: session.projectRoot, config: session.config });
});

app.get("/api/config", async (c) => {
  const session = requireSession();
  return c.json(session.config);
});

app.put("/api/config", async (c) => {
  const session = requireSession();
  const config = await c.req.json();
  await saveConfig(session.configPath, config);
  setSessionConfig(config);
  return c.json(config);
});

app.post("/api/config/set", async (c) => {
  const session = requireSession();
  const { key, value } = await c.req.json<{ key: string; value: unknown }>();
  const updated = setConfigValue(session.config, key, value);
  await saveConfig(session.configPath, updated);
  setSessionConfig(updated);
  return c.json(updated);
});

app.get("/api/tree", async (c) => {
  const session = requireSession();
  const folders = [...ENTITY_FOLDERS, REPORTS_DIR] as const;
  const tree: Array<{ folder: string; files: string[] }> = [];

  for (const folder of folders) {
    const dir = path.join(session.projectRoot, folder);
    try {
      const files = await walkMarkdownFiles(dir, session.projectRoot);
      tree.push({
        folder,
        files: files.map((f) => path.relative(session.projectRoot, f).split(path.sep).join("/")),
      });
    } catch {
      tree.push({ folder, files: [] });
    }
  }

  return c.json(tree);
});

app.get("/api/file", async (c) => {
  const session = requireSession();
  const relativePath = c.req.query("path");
  if (!relativePath) return c.json({ error: "path required" }, 400);
  const filePath = path.join(session.projectRoot, relativePath);
  if (!(await fileExists(filePath))) return c.json({ error: "not found" }, 404);
  const parsed = await parseMarkdownFile(filePath, session.projectRoot);
  return c.json(parsed);
});

app.put("/api/file", async (c) => {
  const session = requireSession();
  const body = await c.req.json<{
    relativePath: string;
    body: string;
    frontmatter?: Record<string, unknown>;
  }>();
  const filePath = path.join(session.projectRoot, body.relativePath);
  if (body.frontmatter) {
    const existing = await parseMarkdownFile(filePath, session.projectRoot);
    await writeMarkdownFile(filePath, { ...existing.frontmatter, ...body.frontmatter } as typeof existing.frontmatter, body.body);
  } else {
    const existing = await parseMarkdownFile(filePath, session.projectRoot);
    await writeMarkdownFile(filePath, existing.frontmatter, body.body);
  }
  return c.json({ ok: true });
});

app.post("/api/entities", async (c) => {
  const session = requireSession();
  const { folder, name } = await c.req.json<{ folder: EntityFolder; name: string }>();
  const filePath = await createEntity({
    projectRoot: session.projectRoot,
    folder,
    name,
    config: session.config,
  });
  return c.json({ path: path.relative(session.projectRoot, filePath).split(path.sep).join("/") });
});

app.post("/api/chapters", async (c) => {
  const session = requireSession();
  const { name, chapterNumber } = await c.req.json<{ name: string; chapterNumber?: number }>();
  const filePath = await createChapter(
    session.projectRoot,
    name,
    session.config,
    chapterNumber,
  );
  return c.json({ path: path.relative(session.projectRoot, filePath).split(path.sep).join("/") });
});

app.post("/api/canon/promote", async (c) => {
  const session = requireSession();
  const { relativePath } = await c.req.json<{ relativePath: string }>();
  const filePath = path.join(session.projectRoot, relativePath);
  const parsed = await parseMarkdownFile(filePath, session.projectRoot);
  await promoteToCanon(parsed, async (fm, body) => writeMarkdownFile(filePath, fm, body));
  return c.json({ ok: true });
});

app.post("/api/canon/archive", async (c) => {
  const session = requireSession();
  const { relativePath } = await c.req.json<{ relativePath: string }>();
  const filePath = path.join(session.projectRoot, relativePath);
  const parsed = await parseMarkdownFile(filePath, session.projectRoot);
  await archiveFile(parsed, async (fm, body) => writeMarkdownFile(filePath, fm, body));
  return c.json({ ok: true });
});

app.post("/api/graph/build", async (c) => {
  const session = requireSession();
  const body = await c.req.json<{ exportMermaid?: boolean }>().catch(() => ({ exportMermaid: undefined }));
  const graph = await buildStoryGraph(session.projectRoot, session.config);
  const jsonPath = await saveStoryGraph(session.projectRoot, graph);
  let mermaidPath: string | undefined;
  if (body.exportMermaid) {
    const mermaid = graphToMermaid(graph);
    mermaidPath = path.join(session.projectRoot, REPORTS_DIR, "graph.mmd");
    await fs.mkdir(path.dirname(mermaidPath), { recursive: true });
    await fs.writeFile(mermaidPath, mermaid, "utf8");
  }
  return c.json({ graph, jsonPath, mermaidPath });
});

app.get("/api/graph", async (c) => {
  const session = requireSession();
  const graphPath = path.join(session.projectRoot, ".storyloom", "graph.json");
  try {
    const raw = await fs.readFile(graphPath, "utf8");
    return c.json(JSON.parse(raw));
  } catch {
    const graph = await buildStoryGraph(session.projectRoot, session.config);
    return c.json(graph);
  }
});

app.get("/api/search", async (c) => {
  const session = requireSession();
  const query = c.req.query("q") ?? "";
  const results = await searchProject(session.projectRoot, session.config, query);
  return c.json(results);
});

app.post("/api/style/analyze", async (c) => {
  const session = requireSession();
  const files = await loadAllMarkdownFiles(session.projectRoot, session.config);
  const profile = analyzeStyle(files);
  const outPath = await saveStyleProfile(session.projectRoot, profile);
  const git = new GitAutoCommitter(session.projectRoot, session.config);
  await git.commitAiChange("style analysis profile", [outPath]);
  return c.json({ profile, outPath });
});

app.get("/api/style/profile", async (c) => {
  const session = requireSession();
  const profile = await loadStyleProfile(session.projectRoot);
  return c.json(profile);
});

app.post("/api/plot-holes/check", async (c) => {
  const session = requireSession();
  const body = await c.req.json<{ includeAi?: boolean; includeDrafts?: boolean }>().catch(() => ({ includeAi: undefined, includeDrafts: undefined }));
  const files = await loadAllMarkdownFiles(session.projectRoot, session.config);
  const graph = await buildStoryGraph(session.projectRoot, session.config);
  let findings = scanStructuralPlotHoles(files, graph, {
    includeDrafts: body.includeDrafts,
  });

  const env = await loadProjectEnv(session.projectRoot);
  const aiCheck = validateAiSetup(session.config, env);
  if (body.includeAi !== false && aiCheck.ok) {
    const services = await createAgentServices(session.projectRoot, session.config);
    const llmText = await runPlotHoleAgent(
      services,
      buildPlotHolePromptContext(files, graph),
    );
    findings = [...findings, ...parseLlmPlotHoleFindings(llmText)];
  }

  const reportPath = await savePlotHoleReport(session.projectRoot, findings);
  const git = new GitAutoCommitter(session.projectRoot, session.config);
  await git.commitAiChange("plot-hole report", [reportPath]);
  return c.json({ findings, reportPath, hasCritical: hasCriticalFindings(findings) });
});

app.post("/api/ai/interview", async (c) => {
  const session = requireSession();
  const body = await c.req.json<{
    message?: string;
    history?: string;
    chapter?: string;
    batch?: boolean;
    resumeAnswers?: string;
  }>();

  const env = await loadProjectEnv(session.projectRoot);
  const check = validateAiSetup(session.config, env);
  if (!check.ok) return c.json({ error: check.reason }, 400);

  const services = await createAgentServices(session.projectRoot, session.config);
  const bundle = await buildContextBundle(session.projectRoot, session.config, body.chapter);
  const context = contextBundleToPrompt(bundle);

  if (body.batch) {
    const text = await runBatchInterviewerAgent(services, context);
    const reportPath = path.join(session.projectRoot, REPORTS_DIR, "interview-questions.md");
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, text, "utf8");
    const git = new GitAutoCommitter(session.projectRoot, session.config);
    await git.commitAiChange("generated interview questions", [reportPath]);
    return c.json({ text, reportPath });
  }

  const message =
    body.resumeAnswers ??
    body.message ??
    "Give me thoughtful questions about my story.";
  const text = await runInterviewerAgent(services, context, message, body.history);
  return c.json({ text });
});

app.post("/api/ai/what-if", async (c) => {
  const session = requireSession();
  const { chapter } = await c.req.json<{ chapter: string }>();
  const env = await loadProjectEnv(session.projectRoot);
  const check = validateAiSetup(session.config, env);
  if (!check.ok) return c.json({ error: check.reason }, 400);

  const services = await createAgentServices(session.projectRoot, session.config);
  const bundle = await buildContextBundle(session.projectRoot, session.config, chapter);
  const text = await runWhatIfAgent(services, contextBundleToPrompt(bundle), chapter);
  const reportPath = path.join(session.projectRoot, REPORTS_DIR, `what-if-${chapter.replace(/[^\w-]/g, "-")}.md`);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, text, "utf8");
  const git = new GitAutoCommitter(session.projectRoot, session.config);
  await git.commitAiChange(`what-if analysis for ${chapter}`, [reportPath]);
  return c.json({ text, reportPath });
});

app.post("/api/ai/generate", async (c) => {
  const session = requireSession();
  const body = await c.req.json<{
    chapter: string;
    mode?: WriteMode | "draft";
    outline?: boolean;
    force?: boolean;
  }>();

  const env = await loadProjectEnv(session.projectRoot);
  const check = validateAiSetup(session.config, env);
  if (!check.ok) return c.json({ error: check.reason }, 400);

  const files = await loadAllMarkdownFiles(session.projectRoot, session.config);
  const graph = await buildStoryGraph(session.projectRoot, session.config);
  const findings = scanStructuralPlotHoles(files, graph);

  if (
    session.config.canon.warn_on_generate &&
    hasCriticalFindings(findings) &&
    !body.force
  ) {
    return c.json({ error: "CRITICAL_PLOT_HOLES", findings }, 409);
  }

  const services = await createAgentServices(session.projectRoot, session.config);
  const bundle = await buildContextBundle(session.projectRoot, session.config, body.chapter);
  const styleProfile = await loadStyleProfile(session.projectRoot);
  const content = await runChapterAgent(
    services,
    contextBundleToPrompt(bundle),
    body.chapter,
    styleProfile,
    body.outline ? "outline" : "prose",
  );

  const mode: WriteMode =
    body.mode === "draft" || body.mode === "draft_file"
      ? "draft_file"
      : body.mode ?? session.config.ai.write_mode;

  const result = await writeChapterOutput({
    projectRoot: session.projectRoot,
    config: session.config,
    chapterRef: body.chapter,
    content,
    mode,
    aiGenerated: true,
  });

  return c.json({ content, ...result });
});

app.get("/api/git/log-ai", async (c) => {
  const session = requireSession();
  const git = new GitAutoCommitter(session.projectRoot, session.config);
  try {
    const commits = await git.logAiCommits(Number(c.req.query("limit") ?? 20));
    return c.json(commits);
  } catch {
    return c.json([]);
  }
});

app.get("/api/reports", async (c) => {
  const session = requireSession();
  const reportsDir = path.join(session.projectRoot, REPORTS_DIR);
  try {
    const files = await fs.readdir(reportsDir);
    return c.json(files.filter((f) => f.endsWith(".md") || f.endsWith(".mmd")));
  } catch {
    return c.json([]);
  }
});

app.get("/api/reports/:name", async (c) => {
  const session = requireSession();
  const name = c.req.param("name");
  const filePath = path.join(session.projectRoot, REPORTS_DIR, name);
  const content = await fs.readFile(filePath, "utf8");
  return c.json({ name, content });
});

app.onError((err, c) => {
  if (err.message === "NO_PROJECT_OPEN") {
    return c.json({ error: "NO_PROJECT_OPEN" }, 400);
  }
  console.error(err);
  return c.json({ error: err.message ?? "Internal error" }, 500);
});

const port = Number(process.env.STORYLOOM_API_PORT ?? 3847);

const server = serve({ fetch: app.fetch, port }, (info) => {
  const listenPort =
    info && typeof info === "object" && "port" in info ? info.port : port;
  console.log(`StoryLoom API listening on http://127.0.0.1:${listenPort}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the other process or set STORYLOOM_API_PORT.`,
    );
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
