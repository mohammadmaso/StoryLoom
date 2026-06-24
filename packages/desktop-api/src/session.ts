import path from "node:path";
import { CONFIG_FILENAME } from "@storyloom/shared";
import type { StoryConfig } from "@storyloom/shared";
import { loadConfig } from "@storyloom/core";

export interface ProjectSession {
  projectRoot: string;
  configPath: string;
  config: StoryConfig;
}

let currentSession: ProjectSession | null = null;

export function getSession(): ProjectSession | null {
  return currentSession;
}

export function requireSession(): ProjectSession {
  if (!currentSession) {
    throw new Error("NO_PROJECT_OPEN");
  }
  return currentSession;
}

export async function openProject(projectRoot: string): Promise<ProjectSession> {
  const resolved = path.resolve(projectRoot);
  const configPath = path.join(resolved, CONFIG_FILENAME);
  const config = await loadConfig(configPath);
  currentSession = { projectRoot: resolved, configPath, config };
  return currentSession;
}

export async function refreshSession(): Promise<ProjectSession> {
  const session = requireSession();
  session.config = await loadConfig(session.configPath);
  return session;
}

export function setSessionConfig(config: StoryConfig): void {
  const session = requireSession();
  session.config = config;
}

export function closeProject(): void {
  currentSession = null;
}
