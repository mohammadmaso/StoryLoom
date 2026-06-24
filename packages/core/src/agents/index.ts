import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { StoryConfig } from "@storyloom/shared";
import {
  applyEnvToProcess,
  loadProjectEnv,
  type EnvConfig,
} from "../config/env.js";
import type { StyleProfile } from "@storyloom/shared";

export interface AgentServices {
  config: StoryConfig;
  env: EnvConfig;
  projectRoot: string;
}

export async function createAgentServices(
  projectRoot: string,
  config: StoryConfig,
): Promise<AgentServices> {
  const env = await loadProjectEnv(projectRoot);
  applyEnvToProcess(env);
  return { config, env, projectRoot };
}

function resolveLanguageModel(config: StoryConfig, env: EnvConfig) {
  const provider = config.ai.provider!;
  const modelName = config.ai.model ?? defaultModelForProvider(provider);

  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey: env.openaiApiKey })(modelName);
    case "anthropic":
      return createAnthropic({ apiKey: env.anthropicApiKey })(modelName);
    case "ollama":
      return createOpenAI({
        baseURL: `${env.ollamaBaseUrl ?? "http://localhost:11434"}/v1`,
        apiKey: "ollama",
      })(modelName);
  }
}

function defaultModelForProvider(provider: StoryConfig["ai"]["provider"]): string {
  switch (provider) {
    case "openai":
      return "gpt-4o";
    case "anthropic":
      return "claude-3-5-sonnet-latest";
    case "ollama":
      return "llama3.2";
    default:
      return "gpt-4o";
  }
}

function buildAgent(
  id: string,
  instructions: string,
  services: AgentServices,
): Agent {
  return new Agent({
    name: id,
    instructions,
    model: resolveLanguageModel(services.config, services.env),
  });
}

export async function runInterviewerAgent(
  services: AgentServices,
  context: string,
  userMessage: string,
  history?: string,
): Promise<string> {
  const agent = buildAgent(
    "interviewer",
    `You are an intelligent story writing co-pilot and interviewer for a novelist.
Your job is to ask meaningful questions that help the author make decisions and uncover missing details.
Challenge assumptions, clarify motivations, and help maintain narrative consistency.
Write in ${services.config.story.output_language}. Be concise and specific.`,
    services,
  );

  const prompt = [
    history ? `Conversation so far:\n${history}\n` : "",
    `Story context:\n${context}`,
    `\nAuthor message: ${userMessage}`,
  ].join("\n");

  const response = await agent.generate(prompt);
  return extractAgentText(response);
}

export async function runBatchInterviewerAgent(
  services: AgentServices,
  context: string,
): Promise<string> {
  const agent = buildAgent(
    "interviewer-batch",
    `You are a story writing co-pilot. Generate 5-8 thoughtful interview questions for the author based on the story context.
Format as markdown with numbered questions. Focus on consistency, motivation, and missing details.
Write in ${services.config.story.output_language}.`,
    services,
  );

  const response = await agent.generate(
    `Story context:\n${context}\n\nGenerate interview questions.`,
  );
  return extractAgentText(response);
}

export async function runWhatIfAgent(
  services: AgentServices,
  context: string,
  chapterRef: string,
): Promise<string> {
  const agent = buildAgent(
    "what-if",
    `You are a branching story assistant. Generate 3 distinct story continuation paths (Path A, B, C) based on the current story graph and unresolved threads.
Each path should be plausible given existing relationships, motivations, and world state.
Write in ${services.config.story.output_language}.`,
    services,
  );

  const response = await agent.generate(
    `Chapter focus: ${chapterRef}\n\nStory context:\n${context}\n\nGenerate three continuation paths.`,
  );
  return extractAgentText(response);
}

export async function runPlotHoleAgent(
  services: AgentServices,
  context: string,
): Promise<string> {
  const agent = buildAgent(
    "plot-hole",
    `You are a narrative consistency checker. Analyze the story corpus for contradictions such as:
- Physical trait inconsistencies
- Timeline errors
- Characters knowing information they shouldn't
- Dead characters appearing alive
- Destroyed locations referenced as intact

For each finding use this format:
### Finding Title
Severity: critical|warning|info
Description: ...
Suggestion: ...

Write in ${services.config.story.output_language}.`,
    services,
  );

  const response = await agent.generate(context);
  return extractAgentText(response);
}

export async function runChapterAgent(
  services: AgentServices,
  context: string,
  chapterRef: string,
  styleProfile: StyleProfile | null,
  mode: "outline" | "prose",
): Promise<string> {
  const styleNote = styleProfile
    ? `\nAuthor style profile: ${styleProfile.summary}`
    : "";

  const agent = buildAgent(
    "chapter",
    `You are a creative writing assistant helping a novelist.
Match the author's voice when a style profile is provided.
Maintain consistency with the story graph and canon material.
Write in ${services.config.story.output_language}.
Generate ${mode === "outline" ? "a detailed chapter outline" : "chapter prose"}.${styleNote}`,
    services,
  );

  const response = await agent.generate(
    `Chapter: ${chapterRef}\n\nStory context:\n${context}\n\nGenerate ${mode === "outline" ? "outline" : "prose"}.`,
  );
  return extractAgentText(response);
}

function extractAgentText(response: unknown): string {
  if (typeof response === "string") {
    return response;
  }
  if (
    response &&
    typeof response === "object" &&
    "text" in response &&
    typeof (response as { text: unknown }).text === "string"
  ) {
    return (response as { text: string }).text;
  }
  if (
    response &&
    typeof response === "object" &&
    "content" in response
  ) {
    const content = (response as { content: unknown }).content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object" && "text" in part) {
            return String((part as { text: unknown }).text);
          }
          return "";
        })
        .join("");
    }
  }
  return JSON.stringify(response, null, 2);
}
