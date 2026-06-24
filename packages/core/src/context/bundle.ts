import type { StoryConfig } from "@storyloom/shared";
import {
  buildCanonGraph,
  buildStoryGraph,
  getGraphContext,
  loadAllMarkdownFiles,
  summarizeGraphForContext,
} from "../graph/builder.js";
import { filterCanonFiles } from "../canon/filter.js";
import { findChapterFile } from "../entities/scaffold.js";
import type { ContextBundle } from "@storyloom/shared";

export async function buildContextBundle(
  projectRoot: string,
  config: StoryConfig,
  chapterRef?: string,
): Promise<ContextBundle> {
  const files = await loadAllMarkdownFiles(projectRoot, config);
  const canonFiles = filterCanonFiles(files);
  const graph = await buildCanonGraph(projectRoot, config);

  let activeChapter: string | undefined;
  let entityIds: string[] = [];

  if (chapterRef) {
    const chapterPath = await findChapterFile(projectRoot, chapterRef);
    if (chapterPath) {
      const chapterFile = canonFiles.find((f) => f.filePath === chapterPath)
        ?? files.find((f) => f.filePath === chapterPath);
      if (chapterFile) {
        activeChapter = chapterFile.relativePath;
        entityIds = getGraphContext(graph, chapterFile.frontmatter.id, 2);
      }
    }
  }

  if (entityIds.length === 0) {
    entityIds = canonFiles.slice(0, 10).map((f) => f.frontmatter.id);
  }

  const graphSummary = summarizeGraphForContext(graph, entityIds, canonFiles);
  const entities = canonFiles
    .filter((f) => entityIds.includes(f.frontmatter.id))
    .map((f) => ({
      path: f.relativePath,
      content: f.body,
      label: f.frontmatter.id,
    }));

  return {
    activeChapter,
    entities,
    graphSummary,
  };
}

export function contextBundleToPrompt(bundle: ContextBundle): string {
  const parts = [
    bundle.activeChapter ? `Active chapter: ${bundle.activeChapter}` : "",
    `Graph context:\n${bundle.graphSummary}`,
  ];
  return parts.filter(Boolean).join("\n\n");
}
