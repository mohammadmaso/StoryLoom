import fs from "node:fs/promises";
import path from "node:path";
import type {
  ParsedMarkdownFile,
  PlotHoleFinding,
  PlotHoleSeverity,
  StoryGraph,
} from "@storyloom/shared";
import { REPORTS_DIR } from "@storyloom/shared";
import { filterCanonFiles } from "../canon/filter.js";

export interface PlotHoleScanOptions {
  severity?: PlotHoleSeverity | "all";
  includeDrafts?: boolean;
}

export function scanStructuralPlotHoles(
  files: ParsedMarkdownFile[],
  graph: StoryGraph,
  options: PlotHoleScanOptions = {},
): PlotHoleFinding[] {
  const findings: PlotHoleFinding[] = [];
  const canonFiles = filterCanonFiles(files, {
    includeDrafts: options.includeDrafts,
  });

  for (const warning of graph.warnings) {
    if (warning.type === "missing_target") {
      findings.push({
        severity: "warning",
        title: "Unresolved wikilink",
        description: warning.message,
        suggestion: "Create the referenced entity or fix the link label.",
        relatedFiles: warning.sourceFile ? [warning.sourceFile] : [],
      });
    } else if (warning.type === "ambiguous_link") {
      findings.push({
        severity: "info",
        title: "Ambiguous wikilink",
        description: warning.message,
        suggestion: "Use a unique link label or add aliases in frontmatter.",
        relatedFiles: warning.sourceFile ? [warning.sourceFile] : [],
      });
    }
  }

  const archivedIds = new Set(
    files
      .filter((f) => f.frontmatter.status === "archived")
      .map((f) => f.frontmatter.id),
  );

  for (const file of canonFiles) {
    for (const archivedId of archivedIds) {
      const pattern = new RegExp(`\\[\\[${archivedId}\\]\\]`, "i");
      if (pattern.test(file.body)) {
        findings.push({
          severity: "critical",
          title: "Archived entity referenced in canon",
          description: `${file.relativePath} links to archived entity "${archivedId}".`,
          suggestion: "Update the chapter or restore/promote the entity.",
          relatedFiles: [file.relativePath],
        });
      }
    }
  }

  const traitMentions = extractTraitMentions(canonFiles);
  for (const [trait, mentions] of traitMentions) {
    const uniqueValues = new Set(mentions.map((m) => m.value));
    if (uniqueValues.size > 1) {
      findings.push({
        severity: "warning",
        title: `Inconsistent trait: ${trait}`,
        description: `Conflicting values found: ${[...uniqueValues].join(", ")}`,
        suggestion: "Review character descriptions for consistency.",
        relatedFiles: mentions.map((m) => m.file),
      });
    }
  }

  if (options.severity && options.severity !== "all") {
    return filterBySeverity(findings, options.severity);
  }

  return findings;
}

export async function savePlotHoleReport(
  projectRoot: string,
  findings: PlotHoleFinding[],
): Promise<string> {
  const date = new Date().toISOString().slice(0, 10);
  const reportDir = path.join(projectRoot, REPORTS_DIR);
  await fs.mkdir(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `plot-holes-${date}.md`);

  const lines = [
    "# Plot Hole Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ];

  for (const severity of ["critical", "warning", "info"] as PlotHoleSeverity[]) {
    const group = findings.filter((f) => f.severity === severity);
    if (group.length === 0) continue;
    lines.push(`## ${severity.toUpperCase()} (${group.length})`, "");
    for (const finding of group) {
      lines.push(`### ${finding.title}`, "", finding.description, "");
      if (finding.suggestion) {
        lines.push(`**Suggestion:** ${finding.suggestion}`, "");
      }
      if (finding.relatedFiles.length > 0) {
        lines.push(`**Files:** ${finding.relatedFiles.join(", ")}`, "");
      }
    }
  }

  await fs.writeFile(outPath, lines.join("\n"), "utf8");
  return outPath;
}

export function hasCriticalFindings(findings: PlotHoleFinding[]): boolean {
  return findings.some((f) => f.severity === "critical");
}

export function filterBySeverity(
  findings: PlotHoleFinding[],
  severity: PlotHoleSeverity,
): PlotHoleFinding[] {
  const order = { critical: 0, warning: 1, info: 2 };
  const max = order[severity];
  return findings.filter((f) => order[f.severity] <= max);
}

interface TraitMention {
  file: string;
  value: string;
}

function extractTraitMentions(
  files: ParsedMarkdownFile[],
): Map<string, TraitMention[]> {
  const traits = new Map<string, TraitMention[]>();
  const patterns = [
    {
      trait: "eye color",
      regex: /(?:eye[s]? (?:are|were|is|was|:)?\s*)([a-z]+)/gi,
    },
    {
      trait: "hair color",
      regex: /(?:hair (?:is|was|:)?\s*)([a-z]+)/gi,
    },
  ];

  for (const file of files) {
    if (file.frontmatter.type !== "character") continue;
    for (const { trait, regex } of patterns) {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(file.body)) !== null) {
        const value = match[1]!.toLowerCase();
        const list = traits.get(trait) ?? [];
        list.push({ file: file.relativePath, value });
        traits.set(trait, list);
      }
    }
  }

  return traits;
}

export function buildPlotHolePromptContext(
  files: ParsedMarkdownFile[],
  graph: StoryGraph,
): string {
  const canon = filterCanonFiles(files);
  const summaries = canon
    .slice(0, 20)
    .map(
      (f) =>
        `[${f.relativePath}] (${f.frontmatter.type}, ${f.frontmatter.status})\n${f.body.slice(0, 1500)}`,
    )
    .join("\n\n---\n\n");

  return `Story corpus excerpts:\n\n${summaries}\n\nGraph warnings:\n${graph.warnings.map((w) => w.message).join("\n")}`;
}

export function parseLlmPlotHoleFindings(text: string): PlotHoleFinding[] {
  const findings: PlotHoleFinding[] = [];
  const blocks = text.split(/^### /m).slice(1);

  for (const block of blocks) {
    const lines = block.split("\n");
    const title = lines[0]?.trim() ?? "Finding";
    const severityLine = lines.find((l) => l.startsWith("Severity:"));
    const descLine = lines.find((l) => l.startsWith("Description:"));
    const suggestionLine = lines.find((l) => l.startsWith("Suggestion:"));

    const severityRaw =
      severityLine?.replace("Severity:", "").trim().toLowerCase() ?? "info";
    const severity: PlotHoleSeverity =
      severityRaw === "critical" || severityRaw === "warning"
        ? severityRaw
        : "info";

    findings.push({
      severity,
      title,
      description: descLine?.replace("Description:", "").trim() ?? block.trim(),
      suggestion: suggestionLine?.replace("Suggestion:", "").trim(),
      relatedFiles: [],
    });
  }

  if (findings.length === 0 && text.trim()) {
    findings.push({
      severity: "info",
      title: "AI Analysis",
      description: text.trim(),
      relatedFiles: [],
    });
  }

  return findings;
}
