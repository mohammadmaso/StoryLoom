import { marked } from "marked";
import { applyAutoDirection } from "@/lib/wysiwygHtml";

marked.setOptions({ gfm: true, breaks: true });

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wikilinksToHtml(markdown: string): string {
  return markdown.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, target: string, label?: string) => {
      const text = label ?? target;
      return `<span class="story-wikilink" data-wikilink="${escapeHtml(target)}" role="link" tabindex="0">${escapeHtml(text)}</span>`;
    },
  );
}

export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) return '<p dir="auto"></p>';
  const html = marked.parse(wikilinksToHtml(markdown), { async: false }) as string;
  return applyAutoDirection(html);
}
