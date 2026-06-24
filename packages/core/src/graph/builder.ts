import fs from "node:fs/promises";
import path from "node:path";
import {
  FOLDER_RESOLUTION_ORDER,
  WIKILINK_REGEX,
  type EntityFolder,
  type GraphEdge,
  type GraphNode,
  type GraphWarning,
  type ParsedMarkdownFile,
  type StoryConfig,
  type StoryGraph,
} from "@storyloom/shared";
import { parseMarkdownFile } from "../config/manager.js";
import { filterCanonFiles } from "../canon/filter.js";
import {
  ensureStoryloomDir,
  slugify,
  titleCase,
  walkMarkdownFiles,
} from "../utils/paths.js";

export interface GraphBuildOptions {
  includeDrafts?: boolean;
  includeArchived?: boolean;
}

export async function buildStoryGraph(
  projectRoot: string,
  config: StoryConfig,
  options: GraphBuildOptions = {},
): Promise<StoryGraph> {
  const folders = config.memory.wikilink_folders;
  const allFiles: ParsedMarkdownFile[] = [];
  const warnings: GraphWarning[] = [];

  for (const folder of folders) {
    const dir = path.join(projectRoot, folder);
    try {
      const mdFiles = await walkMarkdownFiles(dir, projectRoot);
      for (const filePath of mdFiles) {
        try {
          allFiles.push(await parseMarkdownFile(filePath, projectRoot));
        } catch (err) {
          warnings.push({
            type: "unresolved_link",
            message: `Failed to parse ${path.relative(projectRoot, filePath)}: ${err instanceof Error ? err.message : String(err)}`,
            sourceFile: path.relative(projectRoot, filePath).split(path.sep).join("/"),
          });
        }
      }
    } catch {
      // folder may not exist yet
    }
  }

  const index = buildEntityIndex(allFiles, projectRoot);
  const nodes: GraphNode[] = allFiles.map((file) => ({
    id: file.frontmatter.id,
    label: extractTitle(file),
    filePath: file.filePath,
    relativePath: file.relativePath,
    type: file.frontmatter.type,
    status: file.frontmatter.status,
  }));

  const edges: GraphEdge[] = [];

  for (const file of allFiles) {
    const links = extractWikilinks(file.body);
    for (const linkLabel of links) {
      const targets = resolveLink(linkLabel, index);

      if (targets.length === 0) {
        warnings.push({
          type: "missing_target",
          message: `Unresolved wikilink [[${linkLabel}]] in ${file.relativePath}`,
          sourceFile: file.relativePath,
          linkLabel,
        });
        continue;
      }

      if (targets.length > 1) {
        warnings.push({
          type: "ambiguous_link",
          message: `Ambiguous wikilink [[${linkLabel}]] in ${file.relativePath} (${targets.map((t) => t.relativePath).join(", ")})`,
          sourceFile: file.relativePath,
          linkLabel,
        });
      }

      const target = targets[0]!;
      edges.push({
        source: file.frontmatter.id,
        target: target.frontmatter.id,
        label: linkLabel,
      });
    }
  }

  return {
    nodes,
    edges,
    warnings,
    builtAt: new Date().toISOString(),
  };
}

interface EntityIndexEntry {
  file: ParsedMarkdownFile;
  labels: Set<string>;
}

function buildEntityIndex(
  files: ParsedMarkdownFile[],
  projectRoot: string,
): Map<string, EntityIndexEntry[]> {
  const byLabel = new Map<string, EntityIndexEntry[]>();

  for (const file of files) {
    const labels = new Set<string>();
    labels.add(file.frontmatter.id);
    labels.add(slugify(extractTitle(file)));
    labels.add(extractTitle(file).toLowerCase());
    for (const alias of file.frontmatter.aliases) {
      labels.add(alias.toLowerCase());
      labels.add(slugify(alias));
    }

    for (const label of labels) {
      const key = label.toLowerCase();
      const entries = byLabel.get(key) ?? [];
      entries.push({ file, labels });
      byLabel.set(key, entries);
    }
  }

  // Also index by folder priority for bare names
  for (const folder of FOLDER_RESOLUTION_ORDER) {
    const folderPath = path.join(projectRoot, folder);
    // indexed via files already
    void folderPath;
  }

  return byLabel;
}

function resolveLink(
  linkLabel: string,
  index: Map<string, EntityIndexEntry[]>,
): ParsedMarkdownFile[] {
  const key = linkLabel.toLowerCase().trim();
  const slugKey = slugify(linkLabel);

  const matches = new Map<string, ParsedMarkdownFile>();

  for (const candidate of [key, slugKey, titleCase(linkLabel).toLowerCase()]) {
    const entries = index.get(candidate);
    if (entries) {
      for (const entry of entries) {
        matches.set(entry.file.frontmatter.id, entry.file);
      }
    }
  }

  const results = [...matches.values()];
  if (results.length <= 1) {
    return results;
  }

  // Prefer resolution order by folder
  results.sort((a, b) => {
    const folderA = getFolderPriority(a.relativePath);
    const folderB = getFolderPriority(b.relativePath);
    return folderA - folderB;
  });

  const topPriority = getFolderPriority(results[0]!.relativePath);
  return results.filter(
    (r) => getFolderPriority(r.relativePath) === topPriority,
  );
}

function getFolderPriority(relativePath: string): number {
  const folder = relativePath.split("/")[0] as EntityFolder | undefined;
  const idx = FOLDER_RESOLUTION_ORDER.indexOf(folder as EntityFolder);
  return idx === -1 ? 999 : idx;
}

function extractWikilinks(body: string): string[] {
  const links: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(WIKILINK_REGEX.source, "g");
  while ((match = regex.exec(body)) !== null) {
    links.push(match[1]!.trim());
  }
  return links;
}

function extractTitle(file: ParsedMarkdownFile): string {
  const heading = file.body.match(/^#\s+(.+)$/m);
  if (heading) {
    return heading[1]!.replace(/^Chapter\s+\d+:\s*/i, "").trim();
  }
  return titleCase(file.frontmatter.id);
}

export async function saveStoryGraph(
  projectRoot: string,
  graph: StoryGraph,
): Promise<string> {
  await ensureStoryloomDir(projectRoot);
  const outPath = path.join(projectRoot, ".storyloom", "graph.json");
  await fs.writeFile(outPath, JSON.stringify(graph, null, 2), "utf8");
  return outPath;
}

export function graphToMermaid(graph: StoryGraph): string {
  const lines = ["graph LR"];
  for (const edge of graph.edges) {
    const source = sanitizeMermaidId(edge.source);
    const target = sanitizeMermaidId(edge.target);
    lines.push(`  ${source} -->|${edge.label}| ${target}`);
  }
  return lines.join("\n");
}

function sanitizeMermaidId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

export async function loadAllMarkdownFiles(
  projectRoot: string,
  config: StoryConfig,
): Promise<ParsedMarkdownFile[]> {
  const files: ParsedMarkdownFile[] = [];
  for (const folder of config.memory.wikilink_folders) {
    const dir = path.join(projectRoot, folder);
    try {
      const mdFiles = await walkMarkdownFiles(dir, projectRoot);
      for (const filePath of mdFiles) {
        files.push(await parseMarkdownFile(filePath, projectRoot));
      }
    } catch {
      // ignore missing folders
    }
  }
  return files;
}

export function getGraphContext(
  graph: StoryGraph,
  activeEntityId: string,
  maxHops = 2,
): string[] {
  const adjacency = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    const out = adjacency.get(edge.source) ?? new Set();
    out.add(edge.target);
    adjacency.set(edge.source, out);

    const reverse = adjacency.get(edge.target) ?? new Set();
    reverse.add(edge.source);
    adjacency.set(edge.target, reverse);
  }

  const visited = new Set<string>([activeEntityId]);
  let frontier = [activeEntityId];

  for (let hop = 0; hop < maxHops; hop++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }

  return [...visited];
}

export function summarizeGraphForContext(
  graph: StoryGraph,
  entityIds: string[],
  files: ParsedMarkdownFile[],
): string {
  const fileById = new Map(files.map((f) => [f.frontmatter.id, f]));
  const sections: string[] = [];

  for (const id of entityIds) {
    const file = fileById.get(id);
    if (!file) continue;
    sections.push(
      `### ${extractTitle(file)} (${file.relativePath})\n${file.body.slice(0, 2000)}`,
    );
  }

  return sections.join("\n\n");
}

export async function buildCanonGraph(
  projectRoot: string,
  config: StoryConfig,
): Promise<StoryGraph> {
  const graph = await buildStoryGraph(projectRoot, config);
  const canonIds = new Set(
    filterCanonFiles(await loadAllMarkdownFiles(projectRoot, config)).map(
      (f) => f.frontmatter.id,
    ),
  );
  return {
    ...graph,
    nodes: graph.nodes.filter((n) => canonIds.has(n.id)),
    edges: graph.edges.filter(
      (e) => canonIds.has(e.source) && canonIds.has(e.target),
    ),
  };
}
