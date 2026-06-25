export type {
  AiProvider,
  WriteMode,
  CanonStatus,
  EntityType,
  StoryConfig,
} from "./schemas/config.js";

export type {
  Frontmatter,
  ParsedMarkdownFile,
} from "./schemas/frontmatter.js";

export type {
  GraphNode,
  GraphEdge,
  GraphWarning,
  StoryGraph,
  PlotHoleSeverity,
  PlotHoleFinding,
  StyleProfile,
} from "./schemas/graph.js";

export type {
  StorySuggestion,
  StorySuggestionTarget,
  SuggestionTargetFolder,
  SuggestionApplyMode,
} from "./schemas/suggestions.js";

export interface SearchResult {
  filePath: string;
  relativePath: string;
  line: number;
  text: string;
  score: number;
}

export interface AiCommitInfo {
  hash: string;
  date: string;
  message: string;
}

export interface ProjectContext {
  projectRoot: string;
  configPath: string;
}

export interface ContextBundle {
  activeChapter?: string;
  entities: Array<{ path: string; content: string; label: string }>;
  graphSummary: string;
}
