import fs from "node:fs/promises";
import path from "node:path";
import type { ParsedMarkdownFile, StyleProfile } from "@storyloom/shared";
import { ensureStoryloomDir } from "../utils/paths.js";

export function analyzeStyle(files: ParsedMarkdownFile[]): StyleProfile {
  const canonChapters = files.filter(
    (f) => f.frontmatter.type === "chapter" && f.frontmatter.status === "canon",
  );

  if (canonChapters.length === 0) {
    return {
      analyzedAt: new Date().toISOString(),
      chapterCount: 0,
      avgSentenceLength: 0,
      dialogueRatio: 0,
      commonWords: [],
      povMarkers: [],
      summary: "No canon chapters available for style analysis.",
    };
  }

  let totalSentences = 0;
  let totalWords = 0;
  let dialogueLines = 0;
  let totalLines = 0;
  const wordFreq = new Map<string, number>();
  const povMarkers = new Set<string>();

  for (const chapter of canonChapters) {
    const lines = chapter.body.split("\n");
    for (const line of lines) {
      totalLines++;
      if (/^[\s>*-]*["']/.test(line) || /["'][\s,.!?]*$/.test(line.trim())) {
        dialogueLines++;
      }
    }

    const sentences = chapter.body
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const sentence of sentences) {
      totalSentences++;
      const words = sentence
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/[^a-z']/g, ""))
        .filter((w) => w.length > 3);
      totalWords += words.length;
      for (const word of words) {
        wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
      }

      for (const marker of [" i ", " me ", " my ", " we ", " our "]) {
        if (sentence.toLowerCase().includes(marker)) {
          povMarkers.add("first-person");
        }
      }
      for (const marker of [" he ", " she ", " they ", " his ", " her "]) {
        if (sentence.toLowerCase().includes(marker)) {
          povMarkers.add("third-person");
        }
      }
    }
  }

  const commonWords = [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word);

  const avgSentenceLength =
    totalSentences > 0 ? Math.round((totalWords / totalSentences) * 10) / 10 : 0;
  const dialogueRatio =
    totalLines > 0
      ? Math.round((dialogueLines / totalLines) * 1000) / 1000
      : 0;

  const summary = [
    `Analyzed ${canonChapters.length} canon chapter(s).`,
    `Average sentence length: ${avgSentenceLength} words.`,
    `Dialogue ratio: ${(dialogueRatio * 100).toFixed(1)}% of lines.`,
    `POV tendency: ${[...povMarkers].join(", ") || "unclear"}.`,
    `Common vocabulary: ${commonWords.slice(0, 8).join(", ")}.`,
  ].join(" ");

  return {
    analyzedAt: new Date().toISOString(),
    chapterCount: canonChapters.length,
    avgSentenceLength,
    dialogueRatio,
    commonWords,
    povMarkers: [...povMarkers],
    summary,
  };
}

export async function saveStyleProfile(
  projectRoot: string,
  profile: StyleProfile,
): Promise<string> {
  await ensureStoryloomDir(projectRoot);
  const outPath = path.join(projectRoot, ".storyloom", "style-profile.json");
  await fs.writeFile(outPath, JSON.stringify(profile, null, 2), "utf8");
  return outPath;
}

export async function loadStyleProfile(
  projectRoot: string,
): Promise<StyleProfile | null> {
  const outPath = path.join(projectRoot, ".storyloom", "style-profile.json");
  try {
    const raw = await fs.readFile(outPath, "utf8");
    return JSON.parse(raw) as StyleProfile;
  } catch {
    return null;
  }
}
