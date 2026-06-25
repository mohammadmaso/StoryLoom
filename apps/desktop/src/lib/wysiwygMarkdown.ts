import TurndownService from "turndown";

const BLOCK_SELECTOR = "p,h1,h2,h3,h4,h5,h6,li,blockquote,div";

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

turndown.addRule("directionalBlock", {
  filter: (node) => {
    if (node.nodeType !== 1) return false;
    const el = node as HTMLElement;
    const dir = el.getAttribute("dir");
    if (!dir || dir === "auto") return false;
    return ["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BLOCKQUOTE", "DIV"].includes(
      el.tagName,
    );
  },
  replacement: (content, node) => {
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const dir = el.getAttribute("dir");
    const inner = content.trim() ? `\n${content}\n` : "";
    return `<${tag} dir="${dir}">${inner}</${tag}>\n\n`;
  },
});

turndown.addRule("wikilinkSpan", {
  filter: (node) =>
    node.nodeName === "SPAN" && node.hasAttribute("data-wikilink"),
  replacement: (_content, node) => {
    const el = node as HTMLSpanElement;
    const target = el.getAttribute("data-wikilink") ?? "";
    const label = el.textContent ?? "";
    return target && target !== label ? `[[${target}|${label}]]` : `[[${label}]]`;
  },
});

turndown.addRule("wikilink", {
  filter: (node) =>
    node.nodeName === "A" &&
    node.getAttribute("href")?.startsWith("wikilink:") === true,
  replacement: (_content, node) => {
    const el = node as HTMLAnchorElement;
    const label = el.textContent ?? "";
    const href = el.getAttribute("href") ?? "";
    const target = href.slice("wikilink:".length);
    return target && target !== label ? `[[${target}|${label}]]` : `[[${label}]]`;
  },
});

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).replace(/\n{3,}/g, "\n\n").trimEnd();
}

export function ensureBlockDirections(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)) {
    if (el === root) continue;
    if (!el.hasAttribute("dir")) {
      el.setAttribute("dir", "auto");
    }
  }
}
