import fs from "node:fs/promises";
import path from "node:path";
import type { StoryConfig, WriteMode } from "@storyloom/shared";
import { REPORTS_DIR } from "@storyloom/shared";
import {
  buildFrontmatter,
  writeMarkdownFile,
} from "../config/manager.js";
import { GitAutoCommitter } from "../git/committer.js";
import { findChapterFile } from "../entities/scaffold.js";
import { slugify } from "../utils/paths.js";

export interface WriteChapterOptions {
  projectRoot: string;
  config: StoryConfig;
  chapterRef: string;
  content: string;
  mode: WriteMode;
  aiGenerated?: boolean;
}

export interface WriteChapterResult {
  mode: WriteMode;
  outputPath?: string;
  stdout?: string;
}

export async function writeChapterOutput(
  options: WriteChapterOptions,
): Promise<WriteChapterResult> {
  const { projectRoot, config, chapterRef, content, mode } = options;

  switch (mode) {
    case "suggest": {
      const reportsDir = path.join(projectRoot, REPORTS_DIR);
      await fs.mkdir(reportsDir, { recursive: true });
      const outPath = path.join(
        reportsDir,
        `generate-${slugify(chapterRef)}-${Date.now()}.md`,
      );
      await fs.writeFile(outPath, content, "utf8");
      const git = new GitAutoCommitter(projectRoot, config);
      await git.commitAiChange(`generated suggestion for ${chapterRef}`, [
        outPath,
      ]);
      return { mode, outputPath: outPath, stdout: content };
    }
    case "draft_file": {
      const chapterPath = await findChapterFile(projectRoot, chapterRef);
      let outPath: string;
      if (chapterPath) {
        const base = chapterPath.replace(/\.md$/, "");
        outPath = `${base}.draft.md`;
      } else {
        outPath = path.join(
          projectRoot,
          "chapters",
          `${slugify(chapterRef)}.draft.md`,
        );
      }
      const frontmatter = buildFrontmatter({
        id: slugify(chapterRef),
        type: "chapter",
        status: "draft",
        aiGenerated: options.aiGenerated ?? true,
      });
      await writeMarkdownFile(outPath, frontmatter, content);
      const git = new GitAutoCommitter(projectRoot, config);
      await git.commitAiChange(`generated ${chapterRef} draft`, [outPath]);
      return { mode, outputPath: outPath };
    }
    case "direct": {
      let outPath = await findChapterFile(projectRoot, chapterRef);
      if (!outPath) {
        outPath = path.join(
          projectRoot,
          "chapters",
          `${slugify(chapterRef)}.md`,
        );
      }
      const frontmatter = buildFrontmatter({
        id: slugify(chapterRef),
        type: "chapter",
        status: config.canon.default_status,
        aiGenerated: options.aiGenerated ?? true,
      });
      await writeMarkdownFile(outPath, frontmatter, content);
      const git = new GitAutoCommitter(projectRoot, config);
      await git.commitAiChange(`generated ${chapterRef}`, [outPath]);
      return { mode, outputPath: outPath };
    }
  }
}
