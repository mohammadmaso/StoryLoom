import type { Command } from "commander";
import { t, getLocale } from "@storyloom/shared";
import { loadConfig, saveConfig, setConfigValue } from "@storyloom/core";
import { loadProject, handleProjectError } from "../project.js";

export function registerConfigCommands(program: Command): void {
  const config = program.command("config").description("Manage story-config.yaml");

  config
    .command("show")
    .description("Show current configuration")
    .action(async () => {
      try {
        const project = await loadProject();
        console.log(JSON.stringify(project.config, null, 2));
      } catch (err) {
        handleProjectError(err);
      }
    });

  config
    .command("set")
    .description("Set a configuration value (dot path)")
    .argument("<key>", "Config key path, e.g. ai.provider")
    .argument("<value>", "Value to set")
    .action(async (key, value) => {
      try {
        const project = await loadProject();
        const updated = setConfigValue(project.config, key, value);
        await saveConfig(project.configPath, updated);
        const locale = getLocale(updated);
        console.log(t("success.configSet", { key, value }, locale));
      } catch (err) {
        handleProjectError(err);
      }
    });

  config
    .command("wizard")
    .description("First-run setup wizard for AI provider")
    .action(async () => {
      try {
        const project = await loadProject();
        const locale = getLocale(project.config);
        console.log(t("info.setupWizard", undefined, locale));
        const current = await loadConfig(project.configPath);
        console.log("\nCurrent AI config:");
        console.log(`  provider: ${current.ai.provider ?? "(not set)"}`);
        console.log(`  model: ${current.ai.model ?? "(not set)"}`);
      } catch (err) {
        handleProjectError(err);
      }
    });
}
