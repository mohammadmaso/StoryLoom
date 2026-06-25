import fs from "node:fs/promises";
import path from "node:path";
import {
  CONFIG_FILENAME,
  STORYLOOM_DIR,
  type ProjectContext,
} from "@storyloom/shared";

export async function findProjectRoot(
  startDir: string = process.cwd(),
): Promise<string | null> {
  let current = path.resolve(startDir);

  while (true) {
    const configPath = path.join(current, CONFIG_FILENAME);
    try {
      await fs.access(configPath);
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  }
}

export async function requireProjectRoot(
  startDir?: string,
): Promise<ProjectContext> {
  const projectRoot = await findProjectRoot(startDir);
  if (!projectRoot) {
    throw new Error("NOT_A_PROJECT");
  }
  return {
    projectRoot,
    configPath: path.join(projectRoot, CONFIG_FILENAME),
  };
}

export function storyloomDir(projectRoot: string): string {
  return path.join(projectRoot, STORYLOOM_DIR);
}

export async function ensureStoryloomDir(projectRoot: string): Promise<void> {
  await fs.mkdir(storyloomDir(projectRoot), { recursive: true });
}

export function toRelative(projectRoot: string, filePath: string): string {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function titleCase(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function walkMarkdownFiles(
  dir: string,
  baseDir?: string,
): Promise<string[]> {
  const root = baseDir ?? dir;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === STORYLOOM_DIR) {
        continue;
      }
      files.push(...(await walkMarkdownFiles(fullPath, root)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}
