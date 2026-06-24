import fs from "node:fs/promises";
import path from "node:path";
import { simpleGit } from "simple-git";
import {
  CONFIG_FILENAME,
  ENTITY_FOLDERS,
  ENV_FILENAME,
  REPORTS_DIR,
  STORYLOOM_DIR,
  defaultStoryConfig,
} from "@storyloom/shared";
import { saveConfig } from "../config/manager.js";
import { ensureEnvTemplate } from "../config/env.js";
import { slugify } from "../utils/paths.js";

export interface InitProjectOptions {
  targetDir: string;
  title?: string;
  author?: string;
  genre?: string;
  initGit?: boolean;
}

export async function initProject(
  options: InitProjectOptions,
): Promise<string> {
  const projectRoot = path.resolve(options.targetDir);
  await fs.mkdir(projectRoot, { recursive: true });

  for (const folder of [...ENTITY_FOLDERS, REPORTS_DIR]) {
    await fs.mkdir(path.join(projectRoot, folder), { recursive: true });
  }

  await fs.mkdir(path.join(projectRoot, STORYLOOM_DIR), { recursive: true });

  const config = defaultStoryConfig({
    title: options.title ?? slugify(path.basename(projectRoot)),
    author: options.author ?? "",
    genre: options.genre ?? "",
  });
  await saveConfig(path.join(projectRoot, CONFIG_FILENAME), config);
  await ensureEnvTemplate(projectRoot);

  const gitignorePath = path.join(projectRoot, ".gitignore");
  const gitignoreContent = `${ENV_FILENAME}\n${STORYLOOM_DIR}/\nnode_modules/\n`;
  try {
    await fs.access(gitignorePath);
  } catch {
    await fs.writeFile(gitignorePath, gitignoreContent, "utf8");
  }

  if (options.initGit !== false) {
    const git = simpleGit(projectRoot);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      await git.init();
      await git.add(".");
      await git.commit("Initial StoryLoom project");
    }
  }

  return projectRoot;
}
