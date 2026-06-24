import type { CanonStatus, ParsedMarkdownFile, StoryConfig } from "@storyloom/shared";

export interface CanonFilterOptions {
  includeDrafts?: boolean;
  includeArchived?: boolean;
}

export function matchesCanonFilter(
  file: ParsedMarkdownFile,
  options: CanonFilterOptions = {},
): boolean {
  const { status } = file.frontmatter;

  if (status === "canon") {
    return true;
  }
  if (status === "draft" && options.includeDrafts) {
    return true;
  }
  if (status === "archived" && options.includeArchived) {
    return true;
  }
  return false;
}

export function filterCanonFiles(
  files: ParsedMarkdownFile[],
  options: CanonFilterOptions = {},
): ParsedMarkdownFile[] {
  return files.filter((file) => matchesCanonFilter(file, options));
}

export function defaultCanonOptions(
  config: StoryConfig,
  overrides?: CanonFilterOptions,
): CanonFilterOptions {
  return {
    includeDrafts: overrides?.includeDrafts ?? false,
    includeArchived: overrides?.includeArchived ?? false,
  };
}

export async function promoteToCanon(
  file: ParsedMarkdownFile,
  write: (frontmatter: ParsedMarkdownFile["frontmatter"], body: string) => Promise<void>,
): Promise<void> {
  const updated = {
    ...file.frontmatter,
    status: "canon" as CanonStatus,
    updated: new Date().toISOString().slice(0, 10),
  };
  await write(updated, file.body);
}

export async function archiveFile(
  file: ParsedMarkdownFile,
  write: (frontmatter: ParsedMarkdownFile["frontmatter"], body: string) => Promise<void>,
): Promise<void> {
  const updated = {
    ...file.frontmatter,
    status: "archived" as CanonStatus,
    updated: new Date().toISOString().slice(0, 10),
  };
  await write(updated, file.body);
}
