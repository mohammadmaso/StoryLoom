import type { Command } from "commander";
import { createEntity } from "@storyloom/core";
import { loadProject, handleProjectError } from "../project.js";

export function registerEntityCommands(program: Command): void {
  program
    .command("add-character")
    .description("Create a character markdown file")
    .argument("<name>", "Character name")
    .action(async (name) => {
      try {
        const project = await loadProject();
        const filePath = await createEntity({
          projectRoot: project.projectRoot,
          folder: "characters",
          name,
          config: project.config,
        });
        console.log(`Created character: ${filePath}`);
      } catch (err) {
        handleProjectError(err);
      }
    });

  program
    .command("add-location")
    .description("Create a location markdown file")
    .argument("<name>", "Location name")
    .action(async (name) => {
      try {
        const project = await loadProject();
        const filePath = await createEntity({
          projectRoot: project.projectRoot,
          folder: "locations",
          name,
          config: project.config,
        });
        console.log(`Created location: ${filePath}`);
      } catch (err) {
        handleProjectError(err);
      }
    });

  program
    .command("add-item")
    .description("Create an item markdown file")
    .argument("<name>", "Item name")
    .action(async (name) => {
      try {
        const project = await loadProject();
        const filePath = await createEntity({
          projectRoot: project.projectRoot,
          folder: "items",
          name,
          config: project.config,
        });
        console.log(`Created item: ${filePath}`);
      } catch (err) {
        handleProjectError(err);
      }
    });
}
