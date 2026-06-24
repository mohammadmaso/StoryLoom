import path from "node:path";
import { Command } from "commander";
import { t } from "@storyloom/shared";
import { initProject } from "@storyloom/core";
import { registerConfigCommands } from "./commands/config.js";
import { registerEntityCommands } from "./commands/entity.js";
import { registerCanonCommands } from "./commands/canon.js";
import { registerGraphCommands } from "./commands/graph.js";
import { registerSearchCommands } from "./commands/search.js";
import { registerGitCommands } from "./commands/git.js";
import { registerAiCommands } from "./commands/ai.js";
import { handleProjectError } from "./project.js";

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name("story")
    .description("StoryLoom — AI story writing copilot")
    .version("0.1.0");

  program
    .command("init")
    .description("Initialize a new story project")
    .argument("<name>", "Project directory name")
    .option("--title <title>", "Story title")
    .option("--author <author>", "Author name")
    .option("--genre <genre>", "Genre metadata")
    .option("--no-git", "Skip git initialization")
    .action(async (name, options) => {
      const targetDir = path.resolve(process.cwd(), name);
      const projectRoot = await initProject({
        targetDir,
        title: options.title,
        author: options.author,
        genre: options.genre,
        initGit: options.git !== false,
      });
      console.log(t("success.init", { path: projectRoot }));
      console.log(t("commands.init.created", { name }));
      console.log(t("info.setupWizard"));
    });

  registerConfigCommands(program);
  registerEntityCommands(program);
  registerCanonCommands(program);
  registerGraphCommands(program);
  registerSearchCommands(program);
  registerGitCommands(program);
  registerAiCommands(program);

  program.showHelpAfterError();

  try {
    await program.parseAsync(argv);
  } catch (err) {
    handleProjectError(err);
  }
}
