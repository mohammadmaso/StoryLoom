import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { markdownToHtml } from "@/lib/markdown";
import { htmlToMarkdown, ensureBlockDirections } from "@/lib/wysiwygMarkdown";
import {
  createWikilinkElement,
  cycleBlockDirection,
  getBlockElement,
  getSelectedText,
  insertNodeAtSelection,
} from "@/lib/wysiwygHtml";
import { WysiwygLinkPopover, type LinkKind } from "@/components/WysiwygLinkPopover";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import {
  AlignRight,
  Bold,
  ExternalLink,
  Eye,
  FileCode2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  LayoutTemplate,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
} from "lucide-react";

export type EditorMode = "source" | "preview" | "wysiwyg";

const EDITOR_MODE_KEY = "storyloom-editor-mode";

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

function syncWysiwygContent(root: HTMLDivElement, onChange: (value: string) => void): void {
  ensureBlockDirections(root);
  onChange(htmlToMarkdown(root.innerHTML));
}

// Toolbar button that prevents contentEditable from losing focus on mousedown
function WysiwygToolbarBtn({
  icon: Icon,
  title,
  action,
  active = false,
}: {
  icon: typeof Bold;
  title: string;
  action: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        action();
      }}
      className={clsx(
        "rounded p-1 transition",
        active
          ? "bg-amber-950/60 text-amber-200"
          : "text-stone-400 hover:bg-stone-700 hover:text-stone-200",
      )}
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
  const [linkPopover, setLinkPopover] = useState<LinkKind | null>(null);
  const [blockDirHint, setBlockDirHint] = useState<"auto" | "rtl" | "ltr">("auto");
  const editableRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<MonacoEditorInstance | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isRtl = direction === "rtl";

  const previewHtml = useMemo(() => markdownToHtml(value), [value]);

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
  }, [fileKey]);

  useEffect(() => {
    setWysiwygHtml(markdownToHtml(value));
    setLinkPopover(null);
  }, [fileKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (mode !== "wysiwyg" || !editableRef.current) return;
    if (editableRef.current.innerHTML !== wysiwygHtml) {
      editableRef.current.innerHTML = wysiwygHtml;
      ensureBlockDirections(editableRef.current);
    }
  }, [mode, wysiwygHtml, fileKey]);

  const switchMode = useCallback(
    (next: EditorMode) => {
      if (next === mode) return;

      if (mode === "wysiwyg" && editableRef.current) {
        syncWysiwygContent(editableRef.current, onChange);
      }

      if (next === "wysiwyg") {
        setWysiwygHtml(markdownToHtml(value));
      }

      setLinkPopover(null);
      localStorage.setItem(EDITOR_MODE_KEY, next);
      setMode(next);
    },
    [mode, onChange, value],
  );

  const handleWysiwygInput = useCallback(() => {
    if (!editableRef.current) return;
    syncWysiwygContent(editableRef.current, onChange);
  }, [onChange]);

  const wysiwygCmd = useCallback(
    (command: string, arg?: string) => {
      editableRef.current?.focus();
      document.execCommand(command, false, arg);
      if (editableRef.current) {
        syncWysiwygContent(editableRef.current, onChange);
      }
    },
    [onChange],
  );

  const openLinkPopover = useCallback((kind: LinkKind) => {
    setLinkPopover((current) => (current === kind ? null : kind));
  }, []);

  const insertLink = useCallback(
    (target: string, label: string) => {
      if (!editableRef.current) return;
      editableRef.current.focus();

      if (linkPopover === "wikilink") {
        insertNodeAtSelection(createWikilinkElement(target, label));
      } else {
        const anchor = document.createElement("a");
        anchor.href = target;
        anchor.textContent = label;
        insertNodeAtSelection(anchor);
      }

      syncWysiwygContent(editableRef.current, onChange);
      setLinkPopover(null);
    },
    [linkPopover, onChange],
  );

  const toggleParagraphDirection = useCallback(() => {
    if (!editableRef.current) return;
    editableRef.current.focus();
    const block = getBlockElement(editableRef.current);
    if (!block) return;
    const next = cycleBlockDirection(block);
    setBlockDirHint(next);
    syncWysiwygContent(editableRef.current, onChange);
  }, [onChange]);

  const updateBlockDirHint = useCallback(() => {
    if (!editableRef.current) return;
    const block = getBlockElement(editableRef.current);
    setBlockDirHint((block?.getAttribute("dir") as "auto" | "rtl" | "ltr") ?? "auto");
  }, []);

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

  const selectedText = linkPopover ? getSelectedText() : "";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={toolbarRef}
        className="relative flex shrink-0 flex-wrap items-center gap-1 border-b border-stone-800 px-3 py-1.5"
      >
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
            <div className="mx-1 h-4 w-px shrink-0 bg-stone-700" />
            <WysiwygToolbarBtn
              icon={Link2}
              title={t("explorer.linkWikilink")}
              action={() => openLinkPopover("wikilink")}
              active={linkPopover === "wikilink"}
            />
            <WysiwygToolbarBtn
              icon={ExternalLink}
              title={t("explorer.linkUrl")}
              action={() => openLinkPopover("url")}
              active={linkPopover === "url"}
            />
            <WysiwygToolbarBtn
              icon={AlignRight}
              title={t("explorer.paragraphDirection", { dir: blockDirHint.toUpperCase() })}
              action={toggleParagraphDirection}
            />
          </>
        )}

        {linkPopover && (
          <WysiwygLinkPopover
            kind={linkPopover}
            initialTarget={selectedText}
            initialLabel={selectedText}
            onInsert={insertLink}
            onClose={() => setLinkPopover(null)}
          />
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
            onKeyUp={updateBlockDirHint}
            onMouseUp={updateBlockDirHint}
            spellCheck
          />
        )}
      </div>
    </div>
  );
}
