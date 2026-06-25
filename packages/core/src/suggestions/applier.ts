import fs from "node:fs/promises";
import path from "node:path";
import type {
  StoryConfig,
  StorySuggestion,
  SuggestionApplyMode,
} from "@storyloom/shared";
import { ENTITY_TYPE_BY_FOLDER, isEntityFolder } from "@storyloom/shared";
import type { AgentServices } from "../agents/index.js";
import { runIntegrateSuggestionsAgent } from "../agents/index.js";
import {
  buildFrontmatter,
  parseMarkdownFile,
  writeMarkdownFile,
} from "../config/manager.js";
import { createEntity } from "../entities/scaffold.js";
import { GitAutoCommitter } from "../git/committer.js";
import { fileExists, slugify } from "../utils/paths.js";

export interface ApplySuggestionsOptions {
  projectRoot: string;
  config: StoryConfig;
  suggestions: StorySuggestion[];
  defaultChapterPath?: string;
  mode?: SuggestionApplyMode;
  services?: AgentServices;
}

export interface ApplySuggestionsResult {
  applied: Array<{ id: string; path: string; mode: SuggestionApplyMode }>;
  skipped: Array<{ id: string; reason: string }>;
}

export async function applyStorySuggestions(
  options: ApplySuggestionsOptions,
): Promise<ApplySuggestionsResult> {
  const mode = options.mode ?? "append";
  if (mode === "integrate") {
    return applyIntegrateSuggestions(options);
  }
  return applyAppendSuggestions(options);
}

async function applyAppendSuggestions(
  options: ApplySuggestionsOptions,
): Promise<ApplySuggestionsResult> {
  const applied: ApplySuggestionsResult["applied"] = [];
  const skipped: ApplySuggestionsResult["skipped"] = [];
  const changedPaths = new Set<string>();

  for (const suggestion of options.suggestions) {
    try {
      const relativePath = await resolveTargetPath(
        options.projectRoot,
        suggestion,
        options.defaultChapterPath,
      );
      if (!relativePath) {
        skipped.push({ id: suggestion.id, reason: "NO_TARGET" });
        continue;
      }

      const filePath = path.join(options.projectRoot, relativePath);
      await ensureTargetFile(
        filePath,
        relativePath,
        suggestion,
        options.projectRoot,
        options.config,
      );

      const parsed = await parseMarkdownFile(filePath, options.projectRoot);
      const newBody = appendSuggestionContent(
        parsed.body,
        suggestion.content,
        suggestion.target.section,
      );

      await writeUpdatedBody(filePath, parsed, newBody);

      changedPaths.add(relativePath);
      applied.push({ id: suggestion.id, path: relativePath, mode: "append" });
    } catch (err) {
      skipped.push({
        id: suggestion.id,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await commitChanges(options, changedPaths, "applied copilot story suggestions");
  return { applied, skipped };
}

async function applyIntegrateSuggestions(
  options: ApplySuggestionsOptions,
): Promise<ApplySuggestionsResult> {
  if (!options.services) {
    throw new Error("AI_REQUIRED");
  }

  const applied: ApplySuggestionsResult["applied"] = [];
  const skipped: ApplySuggestionsResult["skipped"] = [];
  const changedPaths = new Set<string>();
  const groups = new Map<string, StorySuggestion[]>();

  for (const suggestion of options.suggestions) {
    const relativePath = await resolveTargetPath(
      options.projectRoot,
      suggestion,
      options.defaultChapterPath,
    );
    if (!relativePath) {
      skipped.push({ id: suggestion.id, reason: "NO_TARGET" });
      continue;
    }
    const list = groups.get(relativePath) ?? [];
    list.push(suggestion);
    groups.set(relativePath, list);
  }

  for (const [relativePath, group] of groups) {
    try {
      const filePath = path.join(options.projectRoot, relativePath);
      await ensureTargetFile(
        filePath,
        relativePath,
        group[0]!,
        options.projectRoot,
        options.config,
      );

      const parsed = await parseMarkdownFile(filePath, options.projectRoot);
      const newBody = await runIntegrateSuggestionsAgent(
        options.services,
        relativePath,
        parsed.body,
        group,
      );

      await writeUpdatedBody(filePath, parsed, newBody);
      changedPaths.add(relativePath);

      for (const suggestion of group) {
        applied.push({ id: suggestion.id, path: relativePath, mode: "integrate" });
      }
    } catch (err) {
      for (const suggestion of group) {
        skipped.push({
          id: suggestion.id,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  await commitChanges(
    options,
    changedPaths,
    "integrated copilot suggestions into story files",
  );
  return { applied, skipped };
}

async function writeUpdatedBody(
  filePath: string,
  parsed: Awaited<ReturnType<typeof parseMarkdownFile>>,
  newBody: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await writeMarkdownFile(
    filePath,
    {
      ...parsed.frontmatter,
      updated: today,
      ai_generated: true,
    },
    newBody,
    { plain: parsed.plain },
  );
}

async function commitChanges(
  options: ApplySuggestionsOptions,
  changedPaths: Set<string>,
  message: string,
): Promise<void> {
  if (changedPaths.size === 0) return;
  const git = new GitAutoCommitter(options.projectRoot, options.config);
  await git.commitAiChange(message, [...changedPaths]);
}

async function resolveTargetPath(
  projectRoot: string,
  suggestion: StorySuggestion,
  defaultChapterPath?: string,
): Promise<string | null> {
  if (suggestion.target.path) {
    return suggestion.target.path.replace(/\\/g, "/");
  }

  if (suggestion.target.folder === "chapters") {
    return defaultChapterPath ?? null;
  }

  if (suggestion.target.folder === "world") {
    return "world/story-notes.md";
  }

  if (suggestion.target.folder === "reports") {
    return `reports/copilot-${slugify(suggestion.id)}.md`;
  }

  return null;
}

async function ensureTargetFile(
  filePath: string,
  relativePath: string,
  suggestion: StorySuggestion,
  projectRoot: string,
  config: StoryConfig,
): Promise<void> {
  if (await fileExists(filePath)) return;

  const folder = suggestion.target.folder;
  if (isEntityFolder(folder) && folder !== "chapters") {
    const name = path.basename(relativePath, ".md").replace(/-/g, " ");
    await createEntity({ projectRoot, folder, name, config });
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const id = slugify(path.basename(relativePath, ".md"));
  const type = isEntityFolder(folder)
    ? (ENTITY_TYPE_BY_FOLDER[folder] as "chapter" | "lore")
    : "lore";

  await writeMarkdownFile(
    filePath,
    buildFrontmatter({
      id,
      type,
      status: config.canon.default_status,
      aiGenerated: true,
    }),
    `# ${suggestion.title}\n\n`,
  );
}

export function appendSuggestionContent(
  body: string,
  content: string,
  section?: string,
): string {
  const trimmedContent = content.trim();
  if (!section) {
    return body.trimEnd() + `\n\n${trimmedContent}\n`;
  }

  const heading = section.startsWith("#") ? section.trim() : `## ${section.trim()}`;
  const idx = body.indexOf(heading);
  if (idx === -1) {
    return `${body.trimEnd()}\n\n${heading}\n\n${trimmedContent}\n`;
  }

  const afterHeading = idx + heading.length;
  const rest = body.slice(afterHeading);
  const nextSection = rest.search(/\n##\s+/);
  const insertAt =
    nextSection === -1 ? body.length : afterHeading + nextSection;

  return (
    body.slice(0, insertAt).trimEnd() +
    `\n\n${trimmedContent}\n` +
    body.slice(insertAt)
  );
}
