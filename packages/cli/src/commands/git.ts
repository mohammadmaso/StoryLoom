import type { Command } from "commander";
import { GitAutoCommitter } from "@storyloom/core";
import { t } from "@storyloom/shared";
import { loadProject, handleProjectError } from "../project.js";

export function registerGitCommands(program: Command): void {
  const git = program.command("git").description("Git integration helpers");

  git
    .command("log-ai")
    .description("Show AI-prefixed commits")
    .option("--limit <n>", "Max commits", "20")
    .action(async (options) => {
      try {
        const project = await loadProject();
        const committer = new GitAutoCommitter(
          project.projectRoot,
          project.config,
        );
        const commits = await committer.logAiCommits(Number(options.limit));

        if (commits.length === 0) {
          console.log("No AI commits found.");
          return;
        }

        for (const commit of commits) {
          console.log(`${commit.hash.slice(0, 7)} ${commit.date} ${commit.message}`);
        }
      } catch (err) {
        if (err instanceof Error && err.message === "NOT_A_GIT_REPO") {
          console.error(t("errors.gitNotRepo"));
          process.exit(1);
        }
        handleProjectError(err);
      }
    });
}
