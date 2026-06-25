import {
  StorySuggestionSchema,
  type PlotHoleFinding,
  type StorySuggestion,
} from "@storyloom/shared";

const SUGGESTIONS_BLOCK = /```storyloom-suggestions\s*([\s\S]*?)```/i;

export interface ParsedCopilotResponse {
  narrative: string;
  suggestions: StorySuggestion[];
}

export function parseStorySuggestions(text: string): ParsedCopilotResponse {
  const match = text.match(SUGGESTIONS_BLOCK);
  if (match) {
    const narrative = text.replace(SUGGESTIONS_BLOCK, "").trim();
    const suggestions = parseSuggestionsJson(match[1] ?? "[]");
    return { narrative: narrative || text.trim(), suggestions };
  }

  const jsonBlock = text.match(/```json\s*([\s\S]*?)```/i);
  if (jsonBlock) {
    const suggestions = parseSuggestionsJson(jsonBlock[1] ?? "[]");
    if (suggestions.length > 0) {
      return {
        narrative: text.replace(/```json\s*[\s\S]*?```/i, "").trim(),
        suggestions,
      };
    }
  }

  return { narrative: text.trim(), suggestions: [] };
}

function parseSuggestionsJson(raw: string): StorySuggestion[] {
  try {
    const parsed = JSON.parse(raw.trim()) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => {
        const result = StorySuggestionSchema.safeParse({
          ...(typeof item === "object" && item !== null ? item : {}),
          id:
            typeof item === "object" &&
            item !== null &&
            "id" in item &&
            typeof (item as { id: unknown }).id === "string"
              ? (item as { id: string }).id
              : `suggestion-${index + 1}`,
        });
        return result.success ? result.data : null;
      })
      .filter((s): s is StorySuggestion => s !== null);
  } catch {
    return [];
  }
}

export function plotFindingToSuggestion(
  finding: PlotHoleFinding,
  index: number,
  defaultChapterPath?: string,
): StorySuggestion | null {
  const content = finding.suggestion?.trim() || finding.description.trim();
  if (!content) return null;

  const related = finding.relatedFiles[0];
  const folder = related?.split("/")[0];
  const targetFolder =
    folder === "characters" ||
    folder === "locations" ||
    folder === "items" ||
    folder === "world" ||
    folder === "chapters"
      ? folder
      : defaultChapterPath
        ? "chapters"
        : "world";

  return {
    id: `plot-hole-${index + 1}`,
    title: finding.title,
    description: finding.description,
    content,
    target: {
      folder: targetFolder,
      path: related ?? defaultChapterPath ?? "world/story-notes.md",
      section: "## Plot Notes",
    },
  };
}

export function plotFindingsToSuggestions(
  findings: PlotHoleFinding[],
  defaultChapterPath?: string,
): StorySuggestion[] {
  return findings
    .map((f, i) => plotFindingToSuggestion(f, i, defaultChapterPath))
    .filter((s): s is StorySuggestion => s !== null);
}

export function parseWhatIfSuggestions(
  text: string,
  chapterPath: string,
): StorySuggestion[] {
  const labels = ["A", "B", "C"];
  const suggestions: StorySuggestion[] = [];

  for (const label of labels) {
    const regex = new RegExp(
      `(?:Path\\s*${label}|مسیر\\s*${label}|##\\s*Path\\s*${label})\\s*[:\\-–—]?\\s*([\\s\\S]*?)(?=(?:Path\\s*[ABC]|مسیر\\s*[ABC]|##\\s*Path\\s*[ABC])|$)`,
      "i",
    );
    const match = text.match(regex);
    const content = match?.[1]?.trim();
    if (!content || content.length < 20) continue;

    suggestions.push({
      id: `what-if-${label.toLowerCase()}`,
      title: `Path ${label}`,
      content,
      target: {
        folder: "chapters",
        path: chapterPath,
        section: `## What-If Path ${label}`,
      },
    });
  }

  return suggestions;
}

export function contentToChapterSuggestion(
  content: string,
  chapterPath: string,
  title: string,
  section?: string,
): StorySuggestion {
  return {
    id: "generate-main",
    title,
    content,
    target: {
      folder: "chapters",
      path: chapterPath,
      section,
    },
  };
}

export const STORY_SUGGESTIONS_PROMPT = `
When your response includes concrete story material the author could add to their project, append a JSON block:

\`\`\`storyloom-suggestions
[
  {
    "id": "unique-id",
    "title": "Short label for the author",
    "description": "Why this is useful",
    "content": "Markdown to insert into the story file",
    "target": {
      "folder": "characters|locations|items|world|chapters",
      "path": "relative/path/from/project/root.md",
      "section": "Optional ## Section heading"
    }
  }
]
\`\`\`

Use paths from the story context when possible. Split distinct ideas into separate suggestions.`;
