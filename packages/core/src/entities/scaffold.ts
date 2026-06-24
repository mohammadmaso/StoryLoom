import fs from "node:fs/promises";
import path from "node:path";
import {
  ENTITY_TYPE_BY_FOLDER,
  type EntityFolder,
  type EntityType,
} from "@storyloom/shared";
import {
  buildFrontmatter,
  writeMarkdownFile,
} from "../config/manager.js";
import { fileExists, slugify, titleCase } from "../utils/paths.js";
import type { StoryConfig } from "@storyloom/shared";

const ENTITY_TEMPLATES: Record<
  Exclude<EntityType, "chapter" | "lore">,
  (title: string) => string
> = {
  character: (title) => `# ${title}

## Physical Description

## Personality Traits

## Motivations

## Strengths

## Weaknesses

## Relationships

## Character Arc

## Known Secrets

## Story Appearances
`,
  location: (title) => `# ${title}

## Description

## Atmosphere

## History

## Notable Features

## Connected Places
`,
  item: (title) => `# ${title}

## Description

## Origin

## Powers or Significance

## Current Location

## Story Appearances
`,
};

export interface CreateEntityOptions {
  projectRoot: string;
  folder: EntityFolder;
  name: string;
  config: StoryConfig;
}

export async function createEntity(
  options: CreateEntityOptions,
): Promise<string> {
  const id = slugify(options.name);
  const title = titleCase(options.name);
  const type = ENTITY_TYPE_BY_FOLDER[options.folder] as EntityType;
  const filePath = path.join(options.projectRoot, options.folder, `${id}.md`);

  if (await fileExists(filePath)) {
    throw new Error(`ENTITY_EXISTS:${filePath}`);
  }

  const frontmatter = buildFrontmatter({
    id,
    type,
    status: options.config.canon.default_status,
  });

  let body: string;
  if (type === "chapter") {
    body = `# ${title}\n\n`;
  } else if (type === "lore") {
    body = `# ${title}\n\n`;
  } else {
    body = ENTITY_TEMPLATES[type](title);
  }

  await writeMarkdownFile(filePath, frontmatter, body);
  return filePath;
}

export async function createChapter(
  projectRoot: string,
  name: string,
  config: StoryConfig,
  chapterNumber?: number,
): Promise<string> {
  const id = slugify(name);
  const num =
    chapterNumber ??
    (await nextChapterNumber(path.join(projectRoot, "chapters")));
  const fileName = `chapter-${String(num).padStart(2, "0")}-${id}.md`;
  const filePath = path.join(projectRoot, "chapters", fileName);

  if (await fileExists(filePath)) {
    throw new Error(`ENTITY_EXISTS:${filePath}`);
  }

  const frontmatter = buildFrontmatter({
    id,
    type: "chapter",
    status: config.canon.default_status,
    chapterNumber: num,
  });

  const title = titleCase(name);
  await writeMarkdownFile(
    filePath,
    frontmatter,
    `# Chapter ${num}: ${title}\n\n`,
  );
  return filePath;
}

async function nextChapterNumber(chaptersDir: string): Promise<number> {
  try {
    const files = await fs.readdir(chaptersDir);
    const numbers = files
      .map((f) => {
        const match = f.match(/^chapter-(\d+)-/);
        return match ? Number(match[1]) : 0;
      })
      .filter((n) => n > 0);
    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  } catch {
    return 1;
  }
}

export function resolveChapterPath(
  projectRoot: string,
  chapterRef: string,
): string {
  const chaptersDir = path.join(projectRoot, "chapters");
  if (chapterRef.endsWith(".md")) {
    return path.join(projectRoot, chapterRef);
  }
  const slug = slugify(chapterRef);
  return path.join(chaptersDir, `${slug}.md`);
}

export async function findChapterFile(
  projectRoot: string,
  chapterRef: string,
): Promise<string | null> {
  const direct = resolveChapterPath(projectRoot, chapterRef);
  if (await fileExists(direct)) {
    return direct;
  }

  const chaptersDir = path.join(projectRoot, "chapters");
  const files = await fs.readdir(chaptersDir);
  const slug = slugify(chapterRef);

  const match = files.find(
    (f) =>
      f.endsWith(".md") &&
      (f.includes(slug) || f.replace(/\.md$/, "") === chapterRef),
  );
  return match ? path.join(chaptersDir, match) : null;
}
