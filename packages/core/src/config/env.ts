import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import type { AiProvider, StoryConfig } from "@storyloom/shared";
import { ENV_FILENAME } from "@storyloom/shared";

export interface EnvConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  openaiBaseUrl?: string;
  anthropicBaseUrl?: string;
  ollamaBaseUrl?: string;
}

/** Safe to send to UI — keys are masked */
export interface EnvConfigPublic {
  openaiApiKeySet: boolean;
  anthropicApiKeySet: boolean;
  openaiBaseUrl: string;
  anthropicBaseUrl: string;
  ollamaBaseUrl: string;
}

export interface EnvConfigUpdate {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  openaiBaseUrl?: string;
  anthropicBaseUrl?: string;
  ollamaBaseUrl?: string;
}

const ENV_KEY_ORDER = [
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "OLLAMA_BASE_URL",
] as const;

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

export async function loadProjectEnvPublic(
  projectRoot: string,
): Promise<EnvConfigPublic> {
  const env = await loadProjectEnv(projectRoot);
  return {
    openaiApiKeySet: Boolean(env.openaiApiKey?.trim()),
    anthropicApiKeySet: Boolean(env.anthropicApiKey?.trim()),
    openaiBaseUrl: env.openaiBaseUrl ?? "",
    anthropicBaseUrl: env.anthropicBaseUrl ?? "",
    ollamaBaseUrl: env.ollamaBaseUrl ?? "http://localhost:11434",
  };
}

function mapEnv(source: Record<string, string>): EnvConfig {
  return {
    openaiApiKey: source.OPENAI_API_KEY,
    anthropicApiKey: source.ANTHROPIC_API_KEY,
    openaiBaseUrl: source.OPENAI_BASE_URL,
    anthropicBaseUrl: source.ANTHROPIC_BASE_URL,
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

  if (config.ai.provider === "openai" && !env.openaiApiKey?.trim()) {
    return { ok: false, reason: "NO_API_KEY" };
  }
  if (config.ai.provider === "anthropic" && !env.anthropicApiKey?.trim()) {
    return { ok: false, reason: "NO_API_KEY" };
  }

  return { ok: true };
}

export async function ensureEnvTemplate(projectRoot: string): Promise<void> {
  const envPath = path.join(projectRoot, ENV_FILENAME);
  try {
    await fs.access(envPath);
  } catch {
    const template = `# StoryLoom API keys & endpoints (gitignored)
OPENAI_API_KEY=
OPENAI_BASE_URL=
ANTHROPIC_API_KEY=
ANTHROPIC_BASE_URL=
OLLAMA_BASE_URL=http://localhost:11434
`;
    await fs.writeFile(envPath, template, "utf8");
  }
}

export async function saveProjectEnv(
  projectRoot: string,
  update: EnvConfigUpdate,
): Promise<void> {
  await ensureEnvTemplate(projectRoot);
  const envPath = path.join(projectRoot, ENV_FILENAME);
  const content = await fs.readFile(envPath, "utf8");
  const existing = dotenv.parse(content);

  if (update.openaiApiKey?.trim()) {
    existing.OPENAI_API_KEY = update.openaiApiKey.trim();
  }
  if (update.anthropicApiKey?.trim()) {
    existing.ANTHROPIC_API_KEY = update.anthropicApiKey.trim();
  }
  if (update.openaiBaseUrl !== undefined) {
    existing.OPENAI_BASE_URL = update.openaiBaseUrl.trim();
  }
  if (update.anthropicBaseUrl !== undefined) {
    existing.ANTHROPIC_BASE_URL = update.anthropicBaseUrl.trim();
  }
  if (update.ollamaBaseUrl !== undefined) {
    existing.OLLAMA_BASE_URL =
      update.ollamaBaseUrl.trim() || "http://localhost:11434";
  }

  const lines = [
    "# StoryLoom API keys & endpoints (gitignored)",
    ...ENV_KEY_ORDER.map((key) => `${key}=${existing[key] ?? ""}`),
  ];
  await fs.writeFile(envPath, lines.join("\n") + "\n", "utf8");
}

export function applyEnvToProcess(env: EnvConfig): void {
  if (env.openaiApiKey) {
    process.env.OPENAI_API_KEY = env.openaiApiKey;
  }
  if (env.anthropicApiKey) {
    process.env.ANTHROPIC_API_KEY = env.anthropicApiKey;
  }
  if (env.openaiBaseUrl) {
    process.env.OPENAI_BASE_URL = env.openaiBaseUrl;
  }
  if (env.anthropicBaseUrl) {
    process.env.ANTHROPIC_BASE_URL = env.anthropicBaseUrl;
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

/** Normalize custom base URL for OpenAI-compatible APIs (Ollama, LiteLLM, vLLM). */
export function openAiCompatibleBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}
