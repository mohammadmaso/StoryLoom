import type { Command } from "commander";
import { searchProject } from "@storyloom/core";
import { loadProject, handleProjectError } from "../project.js";

export function registerSearchCommands(program: Command): void {
  program
    .command("search")
    .description("Keyword search across story markdown files")
    .argument("<query>", "Search query")
    .option("--case-sensitive", "Case sensitive search")
    .option("--limit <n>", "Max results", "50")
    .action(async (query, options) => {
      try {
        const project = await loadProject();
        const results = await searchProject(
          project.projectRoot,
          project.config,
          query,
          {
            caseSensitive: options.caseSensitive,
            maxResults: Number(options.limit),
          },
        );

        if (results.length === 0) {
          console.log("No results found.");
          return;
        }

        for (const result of results) {
          console.log(`${result.relativePath}:${result.line}: ${result.text}`);
        }
      } catch (err) {
        handleProjectError(err);
      }
    });
}
