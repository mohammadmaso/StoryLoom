const RTL_LANGUAGE_CODES = new Set(["fa", "ar", "he", "ur", "ps", "ku", "dv"]);

export function isRtlLanguage(language: string | undefined | null): boolean {
  if (!language) return false;
  const code = language.trim().toLowerCase().split(/[-_]/)[0];
  return RTL_LANGUAGE_CODES.has(code ?? "");
}

export function storyOutputLanguage(
  config: Record<string, unknown> | undefined,
): string {
  const story = config?.story;
  if (!story || typeof story !== "object") return "en";
  const lang = (story as { output_language?: unknown }).output_language;
  return typeof lang === "string" && lang.trim() ? lang.trim() : "en";
}

export function storyTextDirection(
  config: Record<string, unknown> | undefined,
): "rtl" | "ltr" {
  return isRtlLanguage(storyOutputLanguage(config)) ? "rtl" : "ltr";
}
