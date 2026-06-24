import { z } from "zod";
import { CanonStatusSchema, EntityTypeSchema } from "./config.js";

export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  filePath: z.string(),
  relativePath: z.string(),
  type: EntityTypeSchema,
  status: CanonStatusSchema,
});

export const GraphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string(),
});

export const GraphWarningSchema = z.object({
  type: z.enum(["ambiguous_link", "missing_target", "unresolved_link"]),
  message: z.string(),
  sourceFile: z.string().optional(),
  linkLabel: z.string().optional(),
});

export const StoryGraphSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  warnings: z.array(GraphWarningSchema),
  builtAt: z.string(),
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type GraphWarning = z.infer<typeof GraphWarningSchema>;
export type StoryGraph = z.infer<typeof StoryGraphSchema>;

export const PlotHoleSeveritySchema = z.enum(["critical", "warning", "info"]);
export type PlotHoleSeverity = z.infer<typeof PlotHoleSeveritySchema>;

export const PlotHoleFindingSchema = z.object({
  severity: PlotHoleSeveritySchema,
  title: z.string(),
  description: z.string(),
  suggestion: z.string().optional(),
  relatedFiles: z.array(z.string()).default([]),
});

export type PlotHoleFinding = z.infer<typeof PlotHoleFindingSchema>;

export const StyleProfileSchema = z.object({
  analyzedAt: z.string(),
  chapterCount: z.number(),
  avgSentenceLength: z.number(),
  dialogueRatio: z.number(),
  commonWords: z.array(z.string()),
  povMarkers: z.array(z.string()),
  summary: z.string(),
});

export type StyleProfile = z.infer<typeof StyleProfileSchema>;
