import { z } from "zod";

export const AiProviderSchema = z.enum(["openai", "anthropic", "ollama"]);
export type AiProvider = z.infer<typeof AiProviderSchema>;

export const WriteModeSchema = z.enum(["suggest", "draft_file", "direct"]);
export type WriteMode = z.infer<typeof WriteModeSchema>;

export const CanonStatusSchema = z.enum(["canon", "draft", "archived"]);
export type CanonStatus = z.infer<typeof CanonStatusSchema>;

export const EntityTypeSchema = z.enum([
  "character",
  "location",
  "item",
  "chapter",
  "lore",
]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const StoryConfigSchema = z.object({
  story: z
    .object({
      title: z.string().default(""),
      author: z.string().default(""),
      genre: z.string().default(""),
      output_language: z.string().default("en"),
    })
    .default({
      title: "",
      author: "",
      genre: "",
      output_language: "en",
    }),
  ai: z
    .object({
      provider: AiProviderSchema.nullable().default(null),
      model: z.string().nullable().default(null),
      write_mode: WriteModeSchema.default("suggest"),
    })
    .default({
      provider: null,
      model: null,
      write_mode: "suggest",
    }),
  git: z
    .object({
      enabled: z.boolean().default(true),
      auto_commit: z.boolean().default(true),
      commit_prefix: z.string().default("AI"),
    })
    .default({
      enabled: true,
      auto_commit: true,
      commit_prefix: "AI",
    }),
  memory: z
    .object({
      wikilink_folders: z
        .array(z.string())
        .default(["characters", "locations", "items", "world", "chapters"]),
    })
    .default({
      wikilink_folders: ["characters", "locations", "items", "world", "chapters"],
    }),
  canon: z
    .object({
      default_status: CanonStatusSchema.default("draft"),
      warn_on_generate: z.boolean().default(true),
    })
    .default({
      default_status: "draft",
      warn_on_generate: true,
    }),
  i18n: z
    .object({
      cli_locale: z.string().default("en"),
    })
    .default({
      cli_locale: "en",
    }),
});

export type StoryConfig = z.infer<typeof StoryConfigSchema>;

export function defaultStoryConfig(overrides?: {
  title?: string;
  author?: string;
  genre?: string;
}): StoryConfig {
  return StoryConfigSchema.parse({
    story: {
      title: overrides?.title ?? "",
      author: overrides?.author ?? "",
      genre: overrides?.genre ?? "",
      output_language: "en",
    },
  });
}
