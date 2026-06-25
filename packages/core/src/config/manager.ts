import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  StoryConfigSchema,
  defaultStoryConfig,
  type StoryConfig,
} from "@storyloom/shared";
import {
  FrontmatterSchema,
  type Frontmatter,
  type ParsedMarkdownFile,
} from "@storyloom/shared";
import { toRelative } from "../utils/paths.js";

export async function loadConfig(configPath: string): Promise<StoryConfig> {
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = parseYaml(raw);
  const result = StoryConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`INVALID_CONFIG:${result.error.message}`);
  }
  return result.data;
}

export async function saveConfig(
  configPath: string,
  config: StoryConfig,
): Promise<void> {
  const validated = StoryConfigSchema.parse(config);
  const content = stringifyYaml(validated);
  await fs.writeFile(configPath, content, "utf8");
}

export function createDefaultConfig(overrides?: {
  title?: string;
  author?: string;
  genre?: string;
}): StoryConfig {
  return defaultStoryConfig(overrides);
}

export function setConfigValue(
  config: StoryConfig,
  keyPath: string,
  value: unknown,
): StoryConfig {
  const keys = keyPath.split(".");
  const clone = structuredClone(config) as Record<string, unknown>;
  let current: Record<string, unknown> = clone;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1]!;
  current[lastKey] = coerceConfigValue(keyPath, value);
  return StoryConfigSchema.parse(clone);
}

function coerceConfigValue(keyPath: string, value: unknown): unknown {
  if (keyPath.endsWith(".provider")) {
    if (value === "null") return null;
    return value;
  }
  if (keyPath.endsWith(".model") && value === "null") {
    return null;
  }
  if (keyPath.endsWith(".write_mode")) {
    return value;
  }
  if (
    keyPath.endsWith(".enabled") ||
    keyPath.endsWith(".auto_commit") ||
    keyPath.endsWith(".warn_on_generate")
  ) {
    return value === true || value === "true";
  }
  return value;
}

export async function parseMarkdownFile(
  filePath: string,
  projectRoot: string,
): Promise<ParsedMarkdownFile> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);
  const plain = !hasYamlFrontmatter(raw);
  const frontmatter = plain
    ? defaultFrontmatterForPlainFile(filePath)
    : FrontmatterSchema.parse(parsed.data);
  return {
    frontmatter,
    body: plain ? raw.trimEnd() : parsed.content.trim(),
    filePath,
    relativePath: toRelative(projectRoot, filePath),
    plain,
  };
}

function hasYamlFrontmatter(raw: string): boolean {
  return raw.trimStart().startsWith("---");
}

function defaultFrontmatterForPlainFile(filePath: string): Frontmatter {
  const base = path.basename(filePath, path.extname(filePath));
  const today = new Date().toISOString().slice(0, 10);
  return FrontmatterSchema.parse({
    id: base,
    type: "lore",
    status: "draft",
    created: today,
    updated: today,
    ai_generated: true,
    aliases: [],
  });
}

export async function writeMarkdownFile(
  filePath: string,
  frontmatter: Frontmatter,
  body: string,
  options?: { plain?: boolean },
): Promise<void> {
  if (options?.plain) {
    await fs.writeFile(filePath, body.trimEnd() + "\n", "utf8");
    return;
  }
  const validated = FrontmatterSchema.parse(frontmatter);
  const content = matter.stringify(body.trim() + "\n", validated);
  await fs.writeFile(filePath, content, "utf8");
}

export function buildFrontmatter(input: {
  id: string;
  type: Frontmatter["type"];
  status?: Frontmatter["status"];
  chapterNumber?: number;
  aiGenerated?: boolean;
}): Frontmatter {
  const today = new Date().toISOString().slice(0, 10);
  return FrontmatterSchema.parse({
    id: input.id,
    type: input.type,
    status: input.status ?? "draft",
    created: today,
    updated: today,
    ai_generated: input.aiGenerated ?? false,
    aliases: [],
    ...(input.chapterNumber !== undefined
      ? { chapter_number: input.chapterNumber }
      : {}),
  });
}
