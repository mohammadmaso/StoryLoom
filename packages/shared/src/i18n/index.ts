import type { StoryConfig } from "../schemas/config.js";

export type Locale = "en";

export type TranslationKey =
  | "errors.noProject"
  | "errors.noProvider"
  | "errors.providerSetup"
  | "errors.fileNotFound"
  | "errors.invalidConfig"
  | "errors.gitNotRepo"
  | "success.init"
  | "success.configSet"
  | "success.graphBuilt"
  | "success.promoted"
  | "success.archived"
  | "info.plotHoleWarn"
  | "info.setupWizard"
  | "commands.init.created"
  | "commands.graph.warnings";

type TranslationParams = Record<string, string | number>;

const en: Record<TranslationKey, string> = {
  "errors.noProject": "Not a StoryLoom project. Run `story init` first.",
  "errors.noProvider":
    "AI provider not configured. Run `story config set ai.provider openai` and `story config set ai.model gpt-4o`.",
  "errors.providerSetup":
    "Missing API key. Add OPENAI_API_KEY or ANTHROPIC_API_KEY to .env in the project root.",
  "errors.fileNotFound": "File not found: {{path}}",
  "errors.invalidConfig": "Invalid story-config.yaml: {{message}}",
  "errors.gitNotRepo": "Git repository not initialized in this project.",
  "success.init": "Story project initialized at {{path}}",
  "success.configSet": "Updated {{key}} = {{value}}",
  "success.graphBuilt":
    "Graph built: {{nodes}} nodes, {{edges}} edges, {{warnings}} warnings",
  "success.promoted": "Promoted {{path}} to canon",
  "success.archived": "Archived {{path}}",
  "info.plotHoleWarn":
    "Critical plot holes detected. Review the report or use --force to proceed.",
  "info.setupWizard":
    "Welcome to StoryLoom! Configure your AI provider:\n  story config set ai.provider openai\n  story config set ai.model gpt-4o\n  Add OPENAI_API_KEY=... to .env",
  "commands.init.created": "Created {{name}} with story-config.yaml",
  "commands.graph.warnings": "Graph warnings ({{count}}):",
};

const catalogs: Record<Locale, Record<TranslationKey, string>> = { en };

export function t(
  key: TranslationKey,
  params?: TranslationParams,
  locale: Locale = "en",
): string {
  let message = catalogs[locale][key] ?? catalogs.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      message = message.replaceAll(`{{${k}}}`, String(v));
    }
  }
  return message;
}

export function getLocale(config: StoryConfig): Locale {
  const locale = config.i18n.cli_locale as Locale;
  return locale in catalogs ? locale : "en";
}
