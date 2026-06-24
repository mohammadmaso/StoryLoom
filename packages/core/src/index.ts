export {
  loadConfig,
  saveConfig,
  createDefaultConfig,
  setConfigValue,
  parseMarkdownFile,
  writeMarkdownFile,
  buildFrontmatter,
} from "./config/manager.js";

export {
  loadProjectEnv,
  validateAiSetup,
  ensureEnvTemplate,
  applyEnvToProcess,
  resolveMastraModel,
  type EnvConfig,
} from "./config/env.js";

export {
  findProjectRoot,
  requireProjectRoot,
  storyloomDir,
  ensureStoryloomDir,
  toRelative,
  slugify,
  titleCase,
  fileExists,
  walkMarkdownFiles,
} from "./utils/paths.js";

export { initProject, type InitProjectOptions } from "./project/init.js";

export {
  createEntity,
  createChapter,
  findChapterFile,
  resolveChapterPath,
} from "./entities/scaffold.js";

export {
  matchesCanonFilter,
  filterCanonFiles,
  defaultCanonOptions,
  promoteToCanon,
  archiveFile,
  type CanonFilterOptions,
} from "./canon/filter.js";

export {
  buildStoryGraph,
  saveStoryGraph,
  graphToMermaid,
  loadAllMarkdownFiles,
  getGraphContext,
  summarizeGraphForContext,
  buildCanonGraph,
  type GraphBuildOptions,
} from "./graph/builder.js";

export { searchProject, type SearchOptions } from "./search/keyword.js";

export { GitAutoCommitter, isGitRepo } from "./git/committer.js";

export {
  analyzeStyle,
  saveStyleProfile,
  loadStyleProfile,
} from "./style/profiler.js";

export {
  scanStructuralPlotHoles,
  savePlotHoleReport,
  hasCriticalFindings,
  filterBySeverity,
  buildPlotHolePromptContext,
  parseLlmPlotHoleFindings,
  type PlotHoleScanOptions,
} from "./plot-hole/analyzer.js";

export {
  createAgentServices,
  runInterviewerAgent,
  runBatchInterviewerAgent,
  runWhatIfAgent,
  runPlotHoleAgent,
  runChapterAgent,
  type AgentServices,
} from "./agents/index.js";

export {
  buildContextBundle,
  contextBundleToPrompt,
} from "./context/bundle.js";

export {
  writeChapterOutput,
  type WriteChapterOptions,
  type WriteChapterResult,
} from "./generate/writer.js";
