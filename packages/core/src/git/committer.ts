import { simpleGit, type SimpleGit } from "simple-git";
import path from "node:path";
import type { AiCommitInfo, StoryConfig } from "@storyloom/shared";
import { STORYLOOM_DIR } from "@storyloom/shared";

export class GitAutoCommitter {
  private git: SimpleGit;
  private config: StoryConfig;
  private projectRoot: string;

  constructor(projectRoot: string, config: StoryConfig) {
    this.projectRoot = projectRoot;
    this.git = simpleGit(projectRoot);
    this.config = config;
  }

  async ensureRepo(): Promise<void> {
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      throw new Error("NOT_A_GIT_REPO");
    }
  }

  async commitAiChange(message: string, files: string[]): Promise<string | null> {
    if (!this.config.git.enabled || !this.config.git.auto_commit) {
      return null;
    }

    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      return null;
    }

    const trackable = await this.filterTrackableFiles(files);
    if (trackable.length === 0) {
      return null;
    }

    await this.git.add(trackable);
    const status = await this.git.status();
    if (status.staged.length === 0) {
      return null;
    }

    const prefix = this.config.git.commit_prefix;
    const fullMessage = `${prefix}: ${message}`;
    const result = await this.git.commit(fullMessage);
    return result.commit ?? null;
  }

  private async filterTrackableFiles(files: string[]): Promise<string[]> {
    const relativeFiles = files
      .map((file) => this.toRelativePath(file))
      .filter((file) => file.length > 0 && !file.startsWith(".."));

    if (relativeFiles.length === 0) return [];

    try {
      const ignored = await this.git.checkIgnore(relativeFiles);
      const ignoredSet = new Set(ignored);
      return relativeFiles.filter((file) => !ignoredSet.has(file));
    } catch {
      return relativeFiles.filter(
        (file) => file !== STORYLOOM_DIR && !file.startsWith(`${STORYLOOM_DIR}/`),
      );
    }
  }

  private toRelativePath(file: string): string {
    const relative = path.isAbsolute(file)
      ? path.relative(this.projectRoot, file)
      : file;
    return relative.split(path.sep).join("/");
  }

  async logAiCommits(limit = 20): Promise<AiCommitInfo[]> {
    await this.ensureRepo();
    const prefix = this.config.git.commit_prefix;
    const log = await this.git.log({
      maxCount: 100,
    });

    return log.all
      .filter((entry) => entry.message.startsWith(prefix))
      .slice(0, limit)
      .map((entry) => ({
        hash: entry.hash,
        date: entry.date,
        message: entry.message,
      }));
  }
}

export async function isGitRepo(projectRoot: string): Promise<boolean> {
  return simpleGit(projectRoot).checkIsRepo();
}
