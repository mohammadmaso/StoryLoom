import { simpleGit, type SimpleGit } from "simple-git";
import type { AiCommitInfo, StoryConfig } from "@storyloom/shared";

export class GitAutoCommitter {
  private git: SimpleGit;
  private config: StoryConfig;

  constructor(projectRoot: string, config: StoryConfig) {
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

    await this.git.add(files);
    const status = await this.git.status();
    if (status.staged.length === 0) {
      return null;
    }

    const prefix = this.config.git.commit_prefix;
    const fullMessage = `${prefix}: ${message}`;
    const result = await this.git.commit(fullMessage);
    return result.commit ?? null;
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
