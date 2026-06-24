import { z } from "zod";
import {
  CanonStatusSchema,
  EntityTypeSchema,
} from "./config.js";

export const FrontmatterSchema = z.object({
  id: z.string(),
  status: CanonStatusSchema.default("draft"),
  type: EntityTypeSchema,
  created: z.coerce.string(),
  updated: z.coerce.string(),
  ai_generated: z.boolean().default(false),
  aliases: z.array(z.string()).default([]),
  chapter_number: z.number().optional(),
});

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

export interface ParsedMarkdownFile {
  frontmatter: Frontmatter;
  body: string;
  filePath: string;
  relativePath: string;
}
