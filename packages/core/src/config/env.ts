import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import type { AiProvider, StoryConfig } from "@storyloom/shared";
import { ENV_FILENAME } from "@storyloom/shared";

export interface EnvConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  ollamaBaseUrl?: string;
}

export async function loadProjectEnv(projectRoot: string): Promise<EnvConfig> {
  const envPath = path.join(projectRoot, ENV_FILENAME);
  try {
    const content = await fs.readFile(envPath, "utf8");
    const parsed = dotenv.parse(content);
    return mapEnv(parsed);
  } catch {
    return mapEnv(process.env as Record<string, string>);
  }
}

function mapEnv(source: Record<string, string>): EnvConfig {
  return {
    openaiApiKey: source.OPENAI_API_KEY,
    anthropicApiKey: source.ANTHROPIC_API_KEY,
    ollamaBaseUrl: source.OLLAMA_BASE_URL ?? "http://localhost:11434",
  };
}

export function validateAiSetup(
  config: StoryConfig,
  env: EnvConfig,
): { ok: true } | { ok: false; reason: "NO_PROVIDER" | "NO_API_KEY" } {
  if (!config.ai.provider) {
    return { ok: false, reason: "NO_PROVIDER" };
  }

  if (config.ai.provider === "openai" && !env.openaiApiKey) {
    return { ok: false, reason: "NO_API_KEY" };
  }
  if (config.ai.provider === "anthropic" && !env.anthropicApiKey) {
    return { ok: false, reason: "NO_API_KEY" };
  }

  return { ok: true };
}

export async function ensureEnvTemplate(projectRoot: string): Promise<void> {
  const envPath = path.join(projectRoot, ENV_FILENAME);
  try {
    await fs.access(envPath);
  } catch {
    const template = `# StoryLoom API keys (gitignored)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
`;
    await fs.writeFile(envPath, template, "utf8");
  }
}

export function applyEnvToProcess(env: EnvConfig): void {
  if (env.openaiApiKey) {
    process.env.OPENAI_API_KEY = env.openaiApiKey;
  }
  if (env.anthropicApiKey) {
    process.env.ANTHROPIC_API_KEY = env.anthropicApiKey;
  }
  if (env.ollamaBaseUrl) {
    process.env.OLLAMA_BASE_URL = env.ollamaBaseUrl;
  }
}

export function resolveMastraModel(config: StoryConfig): string {
  const provider = config.ai.provider!;
  const model = config.ai.model ?? defaultModelForProvider(provider);
  return `${provider}/${model}`;
}

function defaultModelForProvider(provider: AiProvider): string {
  switch (provider) {
    case "openai":
      return "gpt-4o";
    case "anthropic":
      return "claude-3-5-sonnet-latest";
    case "ollama":
      return "llama3.2";
  }
}
