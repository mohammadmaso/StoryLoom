const BLOCK_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "BLOCKQUOTE",
  "DIV",
]);

/** Add dir="auto" so Persian/Arabic paragraphs pick up RTL automatically. */
export function applyAutoDirection(html: string): string {
  return html.replace(
    /<(p|h[1-6]|li|blockquote|div)(\s[^>]*)?>/gi,
    (match, tag: string, attrs?: string) => {
      if (attrs && /\bdir\s*=/.test(attrs)) return match;
      return `<${tag}${attrs ?? ""} dir="auto">`;
    },
  );
}

export function getSelectedText(): string {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return "";
  return sel.toString();
}

export function getBlockElement(root: HTMLElement): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel?.anchorNode) return null;

  let node: Node | null = sel.anchorNode;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

  while (node && node !== root) {
    if (node instanceof HTMLElement && BLOCK_TAGS.has(node.tagName)) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function cycleBlockDirection(block: HTMLElement): "auto" | "rtl" | "ltr" {
  const current = block.getAttribute("dir") ?? "auto";
  const next = current === "auto" ? "rtl" : current === "rtl" ? "ltr" : "auto";
  block.setAttribute("dir", next);
  return next;
}

export function insertNodeAtSelection(node: Node): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function createWikilinkElement(target: string, label: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = "story-wikilink";
  span.setAttribute("data-wikilink", target);
  span.setAttribute("role", "link");
  span.setAttribute("tabindex", "0");
  span.textContent = label;
  return span;
}
