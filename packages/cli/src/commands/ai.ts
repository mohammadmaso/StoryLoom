import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { Command } from "commander";
import type { WriteMode } from "@storyloom/shared";
import { t, getLocale, REPORTS_DIR } from "@storyloom/shared";
import {
  buildContextBundle,
  contextBundleToPrompt,
  createAgentServices,
  runInterviewerAgent,
  runBatchInterviewerAgent,
  runWhatIfAgent,
  runPlotHoleAgent,
  runChapterAgent,
  buildStoryGraph,
  loadAllMarkdownFiles,
  loadProjectEnv,
  validateAiSetup,
  scanStructuralPlotHoles,
  savePlotHoleReport,
  parseLlmPlotHoleFindings,
  hasCriticalFindings,
  analyzeStyle,
  saveStyleProfile,
  writeChapterOutput,
  loadStyleProfile,
  GitAutoCommitter,
  buildPlotHolePromptContext,
} from "@storyloom/core";
import { loadProject, requireAiReady, handleProjectError } from "../project.js";

export function registerAiCommands(program: Command): void {
  program
    .command("interview")
    .description("AI interviewer / co-pilot mode")
    .option("--batch", "Generate batch interview questions")
    .option("--resume", "Resume from saved interview answers")
    .option("--chapter <chapter>", "Focus chapter for context")
    .action(async (options) => {
      try {
        const project = await loadProject();
        await requireAiReady(project);
        const services = await createAgentServices(
          project.projectRoot,
          project.config,
        );
        const bundle = await buildContextBundle(
          project.projectRoot,
          project.config,
          options.chapter,
        );
        const context = contextBundleToPrompt(bundle);

        if (options.batch) {
          const questions = await runBatchInterviewerAgent(services, context);
          const reportPath = path.join(
            project.projectRoot,
            REPORTS_DIR,
            "interview-questions.md",
          );
          await fs.mkdir(path.dirname(reportPath), { recursive: true });
          await fs.writeFile(reportPath, questions, "utf8");
          const git = new GitAutoCommitter(project.projectRoot, project.config);
          await git.commitAiChange("generated interview questions", [reportPath]);
          console.log(questions);
          console.log(`\nSaved: ${reportPath}`);
          return;
        }

        if (options.resume) {
          const answersPath = path.join(
            project.projectRoot,
            REPORTS_DIR,
            "interview-answers.md",
          );
          try {
            const answers = await fs.readFile(answersPath, "utf8");
            const response = await runInterviewerAgent(
              services,
              context,
              `Author answers:\n${answers}\n\nProvide follow-up questions and insights.`,
            );
            console.log(response);
          } catch {
            console.error(`Missing ${answersPath}. Add your answers and retry.`);
            process.exit(1);
          }
          return;
        }

        console.log("StoryLoom Interviewer (type 'exit' to quit)\n");
        const rl = readline.createInterface({ input, output });
        let history = "";

        while (true) {
          const userMessage = await rl.question("You: ");
          if (userMessage.trim().toLowerCase() === "exit") {
            break;
          }
          const response = await runInterviewerAgent(
            services,
            context,
            userMessage,
            history,
          );
          console.log(`\nCopilot: ${response}\n`);
          history += `\nAuthor: ${userMessage}\nCopilot: ${response}`;
        }

        rl.close();
      } catch (err) {
        handleProjectError(err);
      }
    });

  program
    .command("what-if")
    .description("Generate branching story continuations")
    .argument("<chapter>", "Chapter reference")
    .action(async (chapter) => {
      try {
        const project = await loadProject();
        await requireAiReady(project);
        const services = await createAgentServices(
          project.projectRoot,
          project.config,
        );
        const bundle = await buildContextBundle(
          project.projectRoot,
          project.config,
          chapter,
        );
        const result = await runWhatIfAgent(
          services,
          contextBundleToPrompt(bundle),
          chapter,
        );
        const reportPath = path.join(
          project.projectRoot,
          REPORTS_DIR,
          `what-if-${chapter.replace(/[^\w-]/g, "-")}.md`,
        );
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, result, "utf8");
        const git = new GitAutoCommitter(project.projectRoot, project.config);
        await git.commitAiChange(`what-if analysis for ${chapter}`, [reportPath]);
        console.log(result);
        console.log(`\nSaved: ${reportPath}`);
      } catch (err) {
        handleProjectError(err);
      }
    });

  program
    .command("check-plot-holes")
    .description("Scan for plot inconsistencies")
    .option("--severity <level>", "critical|warning|all", "all")
    .option("--include-drafts", "Include draft files in scan")
    .action(async (options) => {
      try {
        const project = await loadProject();
        const files = await loadAllMarkdownFiles(
          project.projectRoot,
          project.config,
        );
        const graph = await buildStoryGraph(project.projectRoot, project.config);
        const structural = scanStructuralPlotHoles(files, graph, {
          severity: options.severity === "critical" ? "critical" : "all",
          includeDrafts: options.includeDrafts,
        });

        let aiFindings = structural;
        const env = await loadProjectEnv(project.projectRoot);
        const aiCheck = validateAiSetup(project.config, env);
        if (aiCheck.ok) {
          const services = await createAgentServices(
            project.projectRoot,
            project.config,
          );
          const llmText = await runPlotHoleAgent(
            services,
            buildPlotHolePromptContext(files, graph),
          );
          aiFindings = [...structural, ...parseLlmPlotHoleFindings(llmText)];
        }

        const reportPath = await savePlotHoleReport(
          project.projectRoot,
          aiFindings,
        );
        const git = new GitAutoCommitter(project.projectRoot, project.config);
        await git.commitAiChange("plot-hole report", [reportPath]);

        console.log(`Report saved: ${reportPath}`);
        console.log(`Findings: ${aiFindings.length}`);
        for (const finding of aiFindings.slice(0, 10)) {
          console.log(`[${finding.severity}] ${finding.title}: ${finding.description}`);
        }
      } catch (err) {
        handleProjectError(err);
      }
    });

  program
    .command("analyze-style")
    .description("Analyze author writing style from canon chapters")
    .action(async () => {
      try {
        const project = await loadProject();
        const files = await loadAllMarkdownFiles(
          project.projectRoot,
          project.config,
        );
        const profile = analyzeStyle(files);
        const outPath = await saveStyleProfile(project.projectRoot, profile);
        console.log(profile.summary);
        console.log(`\nProfile saved: ${outPath}`);
      } catch (err) {
        handleProjectError(err);
      }
    });

  program
    .command("generate")
    .description("Generate chapter outline or prose")
    .argument("<chapter>", "Chapter reference")
    .option("--mode <mode>", "suggest|draft|direct")
    .option("--outline", "Generate outline instead of prose")
    .option("--force", "Proceed despite critical plot holes")
    .action(async (chapter, options) => {
      try {
        const project = await loadProject();
        await requireAiReady(project);
        const locale = getLocale(project.config);

        const files = await loadAllMarkdownFiles(
          project.projectRoot,
          project.config,
        );
        const graph = await buildStoryGraph(project.projectRoot, project.config);
        const findings = scanStructuralPlotHoles(files, graph);

        if (
          project.config.canon.warn_on_generate &&
          hasCriticalFindings(findings) &&
          !options.force
        ) {
          console.error(t("info.plotHoleWarn", undefined, locale));
          console.error("Run `story check-plot-holes` or pass --force.");
          process.exit(1);
        }

        const services = await createAgentServices(
          project.projectRoot,
          project.config,
        );
        const bundle = await buildContextBundle(
          project.projectRoot,
          project.config,
          chapter,
        );
        const styleProfile = await loadStyleProfile(project.projectRoot);
        const content = await runChapterAgent(
          services,
          contextBundleToPrompt(bundle),
          chapter,
          styleProfile,
          options.outline ? "outline" : "prose",
        );

        const mode = resolveWriteMode(options.mode, project.config.ai.write_mode);
        const result = await writeChapterOutput({
          projectRoot: project.projectRoot,
          config: project.config,
          chapterRef: chapter,
          content,
          mode,
          aiGenerated: true,
        });

        if (result.stdout) {
          console.log(result.stdout);
        }
        if (result.outputPath) {
          console.log(`Output: ${result.outputPath}`);
        }
      } catch (err) {
        handleProjectError(err);
      }
    });
}

function resolveWriteMode(flag: string | undefined, defaultMode: WriteMode): WriteMode {
  if (flag === "suggest" || flag === "direct") {
    return flag;
  }
  if (flag === "draft" || flag === "draft_file") {
    return "draft_file";
  }
  return defaultMode;
}
