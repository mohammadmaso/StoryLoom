import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import TurndownService from "turndown";
import { markdownToHtml } from "@/lib/markdown";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import {
  Bold,
  Eye,
  FileCode2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  LayoutTemplate,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
} from "lucide-react";

export type EditorMode = "source" | "preview" | "wysiwyg";

const EDITOR_MODE_KEY = "storyloom-editor-mode";

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
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

function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).replace(/\n{3,}/g, "\n\n").trimEnd();
}

function loadEditorMode(): EditorMode {
  const saved = localStorage.getItem(EDITOR_MODE_KEY);
  if (saved === "preview" || saved === "wysiwyg") return saved;
  if (saved === "markdown") return "source";
  return "source";
}

type MonacoEditorInstance = Parameters<OnMount>[0];

interface StoryEditorProps {
  value: string;
  onChange: (value: string) => void;
  direction: "ltr" | "rtl";
  fileKey?: string | null;
  disabled?: boolean;
  onWikilinkClick?: (target: string) => void;
}

// Toolbar button that prevents contentEditable from losing focus on mousedown
function WysiwygToolbarBtn({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof Bold;
  title: string;
  action: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // keep focus in contentEditable
        action();
      }}
      className="rounded p-1 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function StoryEditor({
  value,
  onChange,
  direction,
  fileKey = null,
  disabled = false,
  onWikilinkClick,
}: StoryEditorProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<EditorMode>(loadEditorMode);
  const [wysiwygHtml, setWysiwygHtml] = useState(() => markdownToHtml(value));
  const editableRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<MonacoEditorInstance | null>(null);
  const isRtl = direction === "rtl";

  const previewHtml = useMemo(() => markdownToHtml(value), [value]);

  // When the file changes, push the new content into Monaco explicitly.
  // This avoids remounting the entire editor (which causes blank flicker).
  useEffect(() => {
    const ed = monacoEditorRef.current;
    if (!ed) return;
    const model = ed.getModel();
    if (!model) return;
    if (model.getValue() !== value) {
      ed.setValue(value);
    }
    requestAnimationFrame(() => ed.layout());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey]); // intentionally only react to file-key changes, not keystrokes

  useEffect(() => {
    setWysiwygHtml(markdownToHtml(value));
  }, [fileKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (mode !== "wysiwyg" || !editableRef.current) return;
    if (editableRef.current.innerHTML !== wysiwygHtml) {
      editableRef.current.innerHTML = wysiwygHtml;
    }
  }, [mode, wysiwygHtml, fileKey]);

  const switchMode = useCallback(
    (next: EditorMode) => {
      if (next === mode) return;

      if (mode === "wysiwyg" && editableRef.current) {
        onChange(htmlToMarkdown(editableRef.current.innerHTML));
      }

      if (next === "wysiwyg") {
        setWysiwygHtml(markdownToHtml(value));
      }

      localStorage.setItem(EDITOR_MODE_KEY, next);
      setMode(next);
    },
    [mode, onChange, value],
  );

  const handleWysiwygInput = useCallback(() => {
    if (!editableRef.current) return;
    onChange(htmlToMarkdown(editableRef.current.innerHTML));
  }, [onChange]);

  // Run an execCommand on the contentEditable while keeping focus
  const wysiwygCmd = useCallback(
    (command: string, arg?: string) => {
      editableRef.current?.focus();
      document.execCommand(command, false, arg);
      if (editableRef.current) {
        onChange(htmlToMarkdown(editableRef.current.innerHTML));
      }
    },
    [onChange],
  );

  const handleWikilinkClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const wikilinkEl = (e.target as HTMLElement).closest(
        "[data-wikilink], a[href^='wikilink:']",
      );
      if (!wikilinkEl) return;

      e.preventDefault();
      e.stopPropagation();

      let target: string | null = null;
      if (wikilinkEl.hasAttribute("data-wikilink")) {
        target = wikilinkEl.getAttribute("data-wikilink");
      } else if (wikilinkEl instanceof HTMLAnchorElement) {
        const href = wikilinkEl.getAttribute("href") ?? "";
        target = href.startsWith("wikilink:") ? href.slice("wikilink:".length) : null;
      }

      if (target) onWikilinkClick?.(target);
    },
    [onWikilinkClick],
  );

  const monacoMount: OnMount = useCallback((ed, monaco) => {
    monacoEditorRef.current = ed;
    ed.updateOptions({
      unicodeHighlight: {
        ambiguousCharacters: false,
        invisibleCharacters: false,
      },
    });
    monaco.editor.setModelLanguage(ed.getModel()!, "markdown");
    requestAnimationFrame(() => ed.layout());
  }, []);

  const monacoOptions = useMemo(
    () => ({
      minimap: { enabled: false },
      wordWrap: "on" as const,
      fontSize: 14,
      readOnly: disabled,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      fontFamily: isRtl
        ? '"Vazirmatn", "Segoe UI", Tahoma, sans-serif'
        : undefined,
      unicodeHighlight: {
        ambiguousCharacters: false,
        invisibleCharacters: false,
      },
    }),
    [disabled, isRtl],
  );

  const modeButton = (
    id: EditorMode,
    icon: typeof FileCode2,
    label: string,
  ) => {
    const Icon = icon;
    return (
      <button
        type="button"
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
          mode === id
            ? "bg-amber-950/60 text-amber-200 ring-1 ring-amber-800/40"
            : "text-stone-400 hover:bg-stone-800 hover:text-stone-200",
        )}
        onClick={() => switchMode(id)}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top bar: mode tabs + WYSIWYG toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-stone-800 px-3 py-1.5">
        {modeButton("source", FileCode2, t("explorer.modeSource"))}
        {modeButton("preview", LayoutTemplate, t("explorer.modePreview"))}
        {modeButton("wysiwyg", Eye, t("explorer.modeWysiwyg"))}

        {mode === "wysiwyg" && !disabled && (
          <>
            <div className="mx-1 h-4 w-px shrink-0 bg-stone-700" />
            <WysiwygToolbarBtn icon={Bold} title="Bold (Ctrl+B)" action={() => wysiwygCmd("bold")} />
            <WysiwygToolbarBtn icon={Italic} title="Italic (Ctrl+I)" action={() => wysiwygCmd("italic")} />
            <WysiwygToolbarBtn icon={Strikethrough} title="Strikethrough" action={() => wysiwygCmd("strikeThrough")} />
            <div className="mx-1 h-4 w-px shrink-0 bg-stone-700" />
            <WysiwygToolbarBtn icon={Heading1} title="Heading 1" action={() => wysiwygCmd("formatBlock", "h1")} />
            <WysiwygToolbarBtn icon={Heading2} title="Heading 2" action={() => wysiwygCmd("formatBlock", "h2")} />
            <WysiwygToolbarBtn icon={Heading3} title="Heading 3" action={() => wysiwygCmd("formatBlock", "h3")} />
            <div className="mx-1 h-4 w-px shrink-0 bg-stone-700" />
            <WysiwygToolbarBtn icon={List} title="Bullet list" action={() => wysiwygCmd("insertUnorderedList")} />
            <WysiwygToolbarBtn icon={ListOrdered} title="Numbered list" action={() => wysiwygCmd("insertOrderedList")} />
            <WysiwygToolbarBtn icon={Quote} title="Blockquote" action={() => wysiwygCmd("formatBlock", "blockquote")} />
            <WysiwygToolbarBtn icon={Minus} title="Horizontal rule" action={() => wysiwygCmd("insertHorizontalRule")} />
          </>
        )}
      </div>

      <div
        className={clsx(
          "relative min-h-0 flex-1 overflow-hidden",
          isRtl && mode === "source" && "story-editor-rtl",
        )}
        dir={direction}
      >
        {mode === "source" ? (
          <div className="absolute inset-0">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              theme="vs-dark"
              value={value}
              onChange={(v) => onChange(v ?? "")}
              onMount={monacoMount}
              options={monacoOptions}
              loading={
                <div className="flex h-full items-center justify-center text-sm text-stone-500">
                  {t("common.loading")}
                </div>
              }
            />
          </div>
        ) : mode === "preview" ? (
          <div
            className={clsx(
              "story-wysiwyg copilot-scroll absolute inset-0 overflow-auto px-6 py-4",
              isRtl && "story-wysiwyg-rtl",
            )}
            dir={direction}
            onClick={handleWikilinkClick}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <div
            key={fileKey ?? "new"}
            ref={editableRef}
            className={clsx(
              "story-wysiwyg copilot-scroll absolute inset-0 overflow-auto px-6 py-4 outline-none",
              isRtl && "story-wysiwyg-rtl",
              disabled && "pointer-events-none opacity-60",
            )}
            contentEditable={!disabled}
            suppressContentEditableWarning
            dir={direction}
            onClick={handleWikilinkClick}
            onInput={handleWysiwygInput}
            onBlur={handleWysiwygInput}
            spellCheck
          />
        )}
      </div>
    </div>
  );
}
