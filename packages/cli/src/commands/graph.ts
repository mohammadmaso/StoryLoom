import fs from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { t, getLocale, REPORTS_DIR } from "@storyloom/shared";
import {
  buildStoryGraph,
  saveStoryGraph,
  graphToMermaid,
} from "@storyloom/core";
import { loadProject, handleProjectError } from "../project.js";

export function registerGraphCommands(program: Command): void {
  const graph = program.command("graph").description("Story graph operations");

  graph
    .command("build")
    .description("Build the wikilink story graph")
    .option("--export <format>", "Export format: mermaid")
    .option("--include-drafts", "Include draft entities")
    .option("--include-archived", "Include archived entities")
    .action(async (options) => {
      try {
        const project = await loadProject();
        const locale = getLocale(project.config);
        const storyGraph = await buildStoryGraph(
          project.projectRoot,
          project.config,
          {
            includeDrafts: options.includeDrafts,
            includeArchived: options.includeArchived,
          },
        );
        const outPath = await saveStoryGraph(project.projectRoot, storyGraph);
        console.log(
          t(
            "success.graphBuilt",
            {
              nodes: storyGraph.nodes.length,
              edges: storyGraph.edges.length,
              warnings: storyGraph.warnings.length,
            },
            locale,
          ),
        );
        console.log(`Saved: ${outPath}`);

        if (storyGraph.warnings.length > 0) {
          console.log(
            t("commands.graph.warnings", { count: storyGraph.warnings.length }, locale),
          );
          for (const warning of storyGraph.warnings.slice(0, 10)) {
            console.log(`  - ${warning.message}`);
          }
        }

        if (options.export === "mermaid") {
          const mermaid = graphToMermaid(storyGraph);
          const reportPath = path.join(
            project.projectRoot,
            REPORTS_DIR,
            "graph.mmd",
          );
          await fs.mkdir(path.dirname(reportPath), { recursive: true });
          await fs.writeFile(reportPath, mermaid, "utf8");
          console.log(`Mermaid export: ${reportPath}`);
        }
      } catch (err) {
        handleProjectError(err);
      }
    });
}
