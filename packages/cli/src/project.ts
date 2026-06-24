import type { StoryConfig } from "@storyloom/shared";
import { t, getLocale } from "@storyloom/shared";
import {
  loadConfig,
  requireProjectRoot,
  validateAiSetup,
  loadProjectEnv,
} from "@storyloom/core";

export interface LoadedProject {
  projectRoot: string;
  configPath: string;
  config: StoryConfig;
}

export async function loadProject(startDir?: string): Promise<LoadedProject> {
  const ctx = await requireProjectRoot(startDir);
  try {
    const config = await loadConfig(ctx.configPath);
    return { ...ctx, config };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("INVALID_CONFIG:")) {
      throw new Error(
        t("errors.invalidConfig", {
          message: message.replace("INVALID_CONFIG:", ""),
        }),
      );
    }
    throw err;
  }
}

export async function requireAiReady(project: LoadedProject): Promise<void> {
  const env = await loadProjectEnv(project.projectRoot);
  const check = validateAiSetup(project.config, env);
  const locale = getLocale(project.config);

  if (!check.ok) {
    if (check.reason === "NO_PROVIDER") {
      throw new Error(t("errors.noProvider", undefined, locale));
    }
    throw new Error(t("errors.providerSetup", undefined, locale));
  }
}

export function handleProjectError(err: unknown): never {
  if (err instanceof Error) {
    if (err.message === "NOT_A_PROJECT") {
      console.error(t("errors.noProject"));
      process.exit(1);
    }
    if (err.message.includes("AI provider not configured")) {
      console.error(err.message);
      console.error(t("info.setupWizard"));
      process.exit(1);
    }
    console.error(err.message);
    process.exit(1);
  }
  console.error(String(err));
  process.exit(1);
}
