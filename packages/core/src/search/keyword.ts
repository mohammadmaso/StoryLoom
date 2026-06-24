import fs from "node:fs/promises";
import path from "node:path";
import type { SearchResult, StoryConfig } from "@storyloom/shared";
import { walkMarkdownFiles } from "../utils/paths.js";

export interface SearchOptions {
  caseSensitive?: boolean;
  maxResults?: number;
}

export async function searchProject(
  projectRoot: string,
  config: StoryConfig,
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const maxResults = options.maxResults ?? 50;
  const needle = options.caseSensitive ? query : query.toLowerCase();

  for (const folder of config.memory.wikilink_folders) {
    const dir = path.join(projectRoot, folder);
    try {
      const files = await walkMarkdownFiles(dir, projectRoot);
      for (const filePath of files) {
        const content = await fs.readFile(filePath, "utf8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;
          const haystack = options.caseSensitive ? line : line.toLowerCase();
          if (haystack.includes(needle)) {
            results.push({
              filePath,
              relativePath: path.relative(projectRoot, filePath).split(path.sep).join("/"),
              line: i + 1,
              text: line.trim(),
              score: scoreMatch(line, query),
            });
            if (results.length >= maxResults) {
              return results.sort((a, b) => b.score - a.score);
            }
          }
        }
      }
    } catch {
      // folder missing
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

function scoreMatch(line: string, query: string): number {
  const lowerLine = line.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (lowerLine === lowerQuery) return 100;
  if (lowerLine.startsWith(lowerQuery)) return 80;
  const words = lowerQuery.split(/\s+/).filter(Boolean);
  const matchedWords = words.filter((w) => lowerLine.includes(w)).length;
  return (matchedWords / Math.max(words.length, 1)) * 60;
}
