import { z } from "zod";
import { ENTITY_FOLDERS } from "../constants.js";

export const SuggestionTargetFolderSchema = z.enum([
  "characters",
  "locations",
  "items",
  "world",
  "chapters",
  "reports",
]);

export type SuggestionTargetFolder = z.infer<typeof SuggestionTargetFolderSchema>;

export const StorySuggestionTargetSchema = z.object({
  folder: SuggestionTargetFolderSchema,
  path: z.string().optional(),
  section: z.string().optional(),
});

export const StorySuggestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  content: z.string(),
  target: StorySuggestionTargetSchema,
});

export type StorySuggestion = z.infer<typeof StorySuggestionSchema>;
export type StorySuggestionTarget = z.infer<typeof StorySuggestionTargetSchema>;

export const StorySuggestionsPayloadSchema = z.array(StorySuggestionSchema);

export const SuggestionApplyModeSchema = z.enum(["append", "integrate"]);
export type SuggestionApplyMode = z.infer<typeof SuggestionApplyModeSchema>;

export function isEntityFolder(
  folder: SuggestionTargetFolder,
): folder is (typeof ENTITY_FOLDERS)[number] {
  return (ENTITY_FOLDERS as readonly string[]).includes(folder);
}
