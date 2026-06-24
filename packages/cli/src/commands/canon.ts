import path from "node:path";
import type { Command } from "commander";
import { t, getLocale } from "@storyloom/shared";
import {
  parseMarkdownFile,
  writeMarkdownFile,
  promoteToCanon,
  archiveFile,
  scanStructuralPlotHoles,
  buildStoryGraph,
  loadAllMarkdownFiles,
  hasCriticalFindings,
} from "@storyloom/core";
import { loadProject, handleProjectError } from "../project.js";

export function registerCanonCommands(program: Command): void {
  const canon = program.command("canon").description("Canon lifecycle management");

  canon
    .command("promote")
    .description("Promote a file to canon status")
    .argument("<file>", "Relative path to markdown file")
    .action(async (file) => {
      try {
        const project = await loadProject();
        const locale = getLocale(project.config);
        const filePath = path.resolve(project.projectRoot, file);
        const parsed = await parseMarkdownFile(filePath, project.projectRoot);

        const files = await loadAllMarkdownFiles(
          project.projectRoot,
          project.config,
        );
        const graph = await buildStoryGraph(project.projectRoot, project.config);
        const findings = scanStructuralPlotHoles(files, graph);
        if (hasCriticalFindings(findings)) {
          console.warn(t("info.plotHoleWarn", undefined, locale));
        }

        await promoteToCanon(parsed, async (fm, body) => {
          await writeMarkdownFile(filePath, fm, body);
        });
        console.log(t("success.promoted", { path: file }, locale));
      } catch (err) {
        handleProjectError(err);
      }
    });

  canon
    .command("archive")
    .description("Archive a markdown file")
    .argument("<file>", "Relative path to markdown file")
    .action(async (file) => {
      try {
        const project = await loadProject();
        const locale = getLocale(project.config);
        const filePath = path.resolve(project.projectRoot, file);
        const parsed = await parseMarkdownFile(filePath, project.projectRoot);
        await archiveFile(parsed, async (fm, body) => {
          await writeMarkdownFile(filePath, fm, body);
        });
        console.log(t("success.archived", { path: file }, locale));
      } catch (err) {
        handleProjectError(err);
      }
    });
}
