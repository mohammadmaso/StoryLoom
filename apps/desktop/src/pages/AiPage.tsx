import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Eraser,
  GitBranch,
  MessageSquare,
  PenLine,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import clsx from "clsx";
import { ChapterPickerModal, chapterRefFromPath } from "@/components/ai/ChapterPickerModal";
import { ChatBubble, TypingIndicator } from "@/components/ai/ChatBubble";
import { PlotHoleFindings } from "@/components/ai/PlotHoleFindings";
import { buildHistoryString, type ChatMessage, type CopilotMode } from "@/components/ai/types";
import { useIsRtl } from "@/hooks/useIsRtl";
import {
  api,
  ApiError,
  type PlotHoleFinding,
  type StorySuggestion,
  type SuggestionApplyMode,
} from "@/lib/api";
import {
  clearCopilotSession,
  loadCopilotSession,
  saveCopilotSession,
} from "@/lib/copilotStorage";
import { useProject } from "@/context/ProjectContext";

const MODES: { id: CopilotMode; icon: typeof MessageSquare; hintKey: string }[] = [
  { id: "interview", icon: MessageSquare, hintKey: "ai.hintInterview" },
  { id: "whatif", icon: GitBranch, hintKey: "ai.hintWhatIf" },
  { id: "plotholes", icon: AlertTriangle, hintKey: "ai.hintPlotHoles" },
  { id: "style", icon: PenLine, hintKey: "ai.hintStyle" },
  { id: "generate", icon: Wand2, hintKey: "ai.hintGenerate" },
];

function newId() {
  return crypto.randomUUID();
}

function toRelativePath(filePath: string, projectRoot?: string): string {
  if (!projectRoot) return filePath.replace(/\\/g, "/");
  const normalized = filePath.replace(/\\/g, "/");
  const root = projectRoot.replace(/\\/g, "/").replace(/\/$/, "");
  if (normalized.startsWith(`${root}/`)) {
    return normalized.slice(root.length + 1);
  }
  return normalized;
}

function getProjectWriteMode(config: Record<string, unknown> | undefined): string {
  const ai = config?.ai as { write_mode?: string } | undefined;
  return ai?.write_mode ?? "suggest";
}

function writeModeHintKey(mode: string): string {
  switch (mode) {
    case "draft_file":
      return "ai.generateWritesDraft";
    case "direct":
      return "ai.generateWritesDirect";
    default:
      return "ai.generateWritesSuggest";
  }
}

export function AiPage() {
  const { t } = useTranslation();
  const isRtl = useIsRtl();
  const navigate = useNavigate();
  const { project } = useProject();
  const [mode, setMode] = useState<CopilotMode>("interview");
  const [chapterPath, setChapterPath] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [outline, setOutline] = useState(false);
  const [force, setForce] = useState(false);
  const [includeAi, setIncludeAi] = useState(true);
  const [applyMode, setApplyMode] = useState<SuggestionApplyMode>("integrate");
  const [error, setError] = useState("");
  const [criticalFindings, setCriticalFindings] = useState<PlotHoleFinding[]>([]);
  const [applyingMessageId, setApplyingMessageId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const projectRoot = project?.projectRoot;
  const writeMode = getProjectWriteMode(project?.config);

  const chapterRef = chapterPath ? chapterRefFromPath(chapterPath) : "";
  const chapterLabel = chapterPath?.split("/").pop() ?? t("ai.noChapterSelected");
  const needsChapter = mode === "interview" || mode === "whatif" || mode === "generate";
  const isInterview = mode === "interview";

  const loadDefaultChapter = useCallback(async () => {
    if (!project?.open) return;
    try {
      const tree = await api.getTree();
      const chapters = tree.find((g) => g.folder === "chapters")?.files ?? [];
      if (chapters.length > 0) {
        setChapterPath((prev) => prev ?? chapters[0]!);
      }
    } catch {
      /* ignore */
    }
  }, [project?.open]);

  useEffect(() => {
    if (!projectRoot) {
      setSessionReady(false);
      setMessages([]);
      setMode("interview");
      setChapterPath(null);
      setInput("");
      setError("");
      setCriticalFindings([]);
      return;
    }

    const saved = loadCopilotSession(projectRoot);
    if (saved) {
      setMode(saved.mode);
      setChapterPath(saved.chapterPath);
      setMessages(saved.messages);
      setOutline(saved.outline);
      setForce(saved.force);
      setIncludeAi(saved.includeAi);
      setApplyMode(saved.applyMode);
    } else {
      setMode("interview");
      setMessages([]);
      setChapterPath(null);
      setOutline(false);
      setForce(false);
      setIncludeAi(true);
      setApplyMode("integrate");
    }
    setInput("");
    setError("");
    setCriticalFindings([]);
    setSessionReady(true);
  }, [projectRoot]);

  useEffect(() => {
    if (!projectRoot || !sessionReady) return;
    saveCopilotSession(projectRoot, {
      mode,
      chapterPath,
      messages,
      outline,
      force,
      includeAi,
      applyMode,
    });
  }, [projectRoot, sessionReady, mode, chapterPath, messages, outline, force, includeAi, applyMode]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadDefaultChapter();
  }, [loadDefaultChapter, sessionReady]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  function pushMessage(msg: Omit<ChatMessage, "id" | "timestamp">) {
    setMessages((prev) => [...prev, { ...msg, id: newId(), timestamp: Date.now() }]);
  }

  function updateMessage(id: string, patch: Partial<ChatMessage>) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch, timestamp: Date.now() } : m)),
    );
  }

  function clearChat() {
    setMessages([]);
    setInput("");
    setError("");
    setCriticalFindings([]);
    if (projectRoot) {
      clearCopilotSession(projectRoot);
    }
  }

  function switchMode(next: CopilotMode) {
    setMode(next);
    setError("");
    setInput("");
    setCriticalFindings([]);
  }

  function requireChapter(): boolean {
    if (needsChapter && !chapterPath) {
      setError(t("ai.chapterRequired"));
      setPickerOpen(true);
      return false;
    }
    return true;
  }

  function handleApiError(err: unknown) {
    if (err instanceof ApiError) {
      if (err.isCriticalPlotHoles()) {
        const findings = err.getPlotHoleFindings();
        setCriticalFindings(findings);
        setError(t("ai.criticalPlotHolesBanner"));
        return;
      }
      if (err.message === "NO_PROVIDER" || err.message === "NO_API_KEY") {
        setError(t("ai.notConfigured"));
        return;
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    setError(msg);
    pushMessage({ role: "system", content: msg });
  }

  async function runGenerate(regenerate = false, messageId?: string) {
    if (!project?.open || loading || !requireChapter()) return;

    setLoading(true);
    setError("");
    setCriticalFindings([]);

    if (!regenerate) {
      pushMessage({ role: "user", content: t("ai.runGenerate", { chapter: chapterLabel }) });
    }

    try {
      const res = await api.generate({
        chapter: chapterRef,
        outline,
        force,
        preview: true,
      });
      const assistantMsg: Omit<ChatMessage, "id" | "timestamp"> = {
        role: "assistant",
        content: res.content,
        suggestions: res.suggestions,
        pendingApproval: true,
      };

      if (regenerate && messageId) {
        updateMessage(messageId, assistantMsg);
      } else {
        pushMessage(assistantMsg);
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }

  async function approveGenerate(messageId: string) {
    if (!project?.open || loading || !requireChapter()) return;

    setLoading(true);
    setError("");
    setCriticalFindings([]);

    try {
      const res = await api.generate({
        chapter: chapterRef,
        outline,
        force,
        preview: false,
        mode: writeMode,
      });
      updateMessage(messageId, {
        pendingApproval: false,
        content: res.content,
        suggestions: res.suggestions,
        outputPath: res.outputPath
          ? toRelativePath(res.outputPath, projectRoot)
          : undefined,
      });
      pushMessage({ role: "system", content: t("ai.approved") });
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }

  function discardGenerate(messageId: string) {
    updateMessage(messageId, { pendingApproval: false });
    pushMessage({ role: "system", content: t("ai.discarded") });
  }

  async function handleSend() {
    if (!project?.open || loading) return;

    if (mode === "generate") {
      await runGenerate(false);
      return;
    }

    const trimmed = input.trim();
    if (isInterview && !trimmed) return;
    if (!requireChapter() && needsChapter) return;

    setLoading(true);
    setError("");
    setCriticalFindings([]);

    if (isInterview && trimmed) {
      pushMessage({ role: "user", content: trimmed });
      setInput("");
    }

    try {
      const history =
        isInterview && trimmed
          ? `${buildHistoryString(messages)}\nAuthor: ${trimmed}`
          : buildHistoryString(messages);

      switch (mode) {
        case "interview": {
          const res = await api.interview({ message: trimmed, history, chapter: chapterRef });
          pushMessage({
            role: "assistant",
            content: res.text,
            suggestions: res.suggestions,
            reportPath: res.reportPath
              ? toRelativePath(res.reportPath, projectRoot)
              : undefined,
          });
          break;
        }
        case "whatif": {
          pushMessage({ role: "user", content: t("ai.runWhatIf", { chapter: chapterLabel }) });
          const res = await api.whatIf(chapterRef);
          pushMessage({
            role: "assistant",
            content: res.text,
            suggestions: res.suggestions,
            reportPath: res.reportPath
              ? toRelativePath(res.reportPath, projectRoot)
              : undefined,
          });
          break;
        }
        case "plotholes": {
          pushMessage({ role: "user", content: t("ai.runPlotHoles") });
          const res = await api.checkPlotHoles({ includeAi, chapter: chapterRef || undefined });
          if (res.findings.length === 0 && res.suggestions.length === 0) {
            pushMessage({ role: "assistant", content: t("ai.noFindings") });
          } else {
            pushMessage({
              role: "assistant",
              content: res.findings.length > 0 ? t("ai.plotHolesReady") : "",
              findings: res.findings,
              suggestions: res.suggestions,
              severity: res.hasCritical ? "critical" : undefined,
              reportPath: res.reportPath
                ? toRelativePath(res.reportPath, projectRoot)
                : undefined,
            });
          }
          break;
        }
        case "style": {
          pushMessage({ role: "user", content: t("ai.runStyle") });
          const res = await api.analyzeStyle();
          pushMessage({
            role: "assistant",
            content: "",
            styleProfile: res.profile,
            suggestions: res.suggestions,
          });
          break;
        }
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
      if (isInterview) inputRef.current?.focus();
    }
  }

  async function runBatch() {
    if (!project?.open || loading || !requireChapter()) return;
    setLoading(true);
    setError("");
    pushMessage({ role: "user", content: t("ai.batchQuestions") });
    try {
      const res = await api.interview({ batch: true, chapter: chapterRef });
      pushMessage({
        role: "assistant",
        content: res.text,
        suggestions: res.suggestions,
        reportPath: res.reportPath
          ? toRelativePath(res.reportPath, projectRoot)
          : undefined,
      });
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }

  async function applySuggestionsToStory(
    messageId: string,
    selected: StorySuggestion[],
    suggestionMode: SuggestionApplyMode,
  ) {
    setApplyingMessageId(messageId);
    setError("");
    try {
      const res = await api.applySuggestions({
        suggestions: selected,
        chapterPath: chapterPath ?? undefined,
        mode: suggestionMode,
      });
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const appliedSuggestionIds = [
            ...(m.appliedSuggestionIds ?? []),
            ...res.applied.map((a) => a.id),
          ];
          return { ...m, appliedSuggestionIds };
        }),
      );
      pushMessage({
        role: "system",
        content:
          suggestionMode === "integrate"
            ? t("ai.mergedCount", { count: res.applied.length })
            : t("ai.appliedCount", { count: res.applied.length }),
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message === "NO_PROVIDER" || err.message === "NO_API_KEY") {
          setError(t("ai.notConfigured"));
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setApplyingMessageId(null);
    }
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
  }

  function openInExplorer(path: string) {
    navigate(`/explorer?file=${encodeURIComponent(path)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!isInterview) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const activeHint = MODES.find((m) => m.id === mode)?.hintKey ?? "ai.hintInterview";
  const sendLabel = isInterview ? t("ai.send") : t("ai.run");
  const runDisabled =
    loading ||
    (isInterview && !input.trim()) ||
    (needsChapter && !chapterPath);

  const criticalBanner = useMemo(() => {
    if (criticalFindings.length === 0) return null;
    return (
      <div className="border-t border-red-900/50 bg-red-950/30 px-4 py-3">
        <p className="text-sm font-medium text-red-200">{t("ai.criticalPlotHolesBanner")}</p>
        <p className="mt-1 text-xs text-red-300/80">{t("ai.criticalPlotHolesHint")}</p>
        <div className="mt-3">
          <PlotHoleFindings findings={criticalFindings.filter((f) => f.severity === "critical")} />
        </div>
      </div>
    );
  }, [criticalFindings, t]);

  if (!project?.open) {
    return <p className="text-stone-400">{t("home.noProject")}</p>;
  }

  return (
    <>
      <div className="flex h-[calc(100vh-3rem)] flex-col gap-4">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-900/40 p-2.5 ring-1 ring-amber-800/30">
              <Sparkles className="h-5 w-5 text-amber-200" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-amber-100">{t("ai.title")}</h1>
              <p className="text-sm text-stone-500">{t("ai.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={clearChat}
            disabled={messages.length === 0}
          >
            <Eraser className="h-4 w-4" />
            {t("ai.clearChat")}
          </button>
        </header>

        <div className="panel flex min-h-0 flex-1 overflow-hidden">
          <aside className="flex w-56 shrink-0 flex-col border-e border-stone-800 bg-stone-950/40 p-3">
            <nav className="flex flex-col gap-1">
              {MODES.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={clsx("mode-tab", mode === id ? "mode-tab-active" : "mode-tab-inactive")}
                  onClick={() => switchMode(id)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{t(`ai.${id === "whatif" ? "whatIf" : id === "plotholes" ? "plotHoles" : id === "style" ? "styleProfiler" : id}`)}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto space-y-3 border-t border-stone-800 pt-3">
              {needsChapter && (
                <div>
                  <span className="text-xs text-stone-500">{t("ai.chapterRef")}</span>
                  <button
                    type="button"
                    className="input mt-1 flex w-full items-center justify-between gap-2 text-start"
                    onClick={() => setPickerOpen(true)}
                  >
                    <span className={clsx("truncate", !chapterPath && "text-stone-500")}>
                      {chapterLabel}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-stone-500" />
                  </button>
                </div>
              )}

              {mode === "plotholes" && (
                <label className="flex items-center gap-2 text-xs text-stone-400">
                  <input
                    type="checkbox"
                    checked={includeAi}
                    onChange={(e) => setIncludeAi(e.target.checked)}
                    className="rounded border-stone-600"
                  />
                  {t("ai.includeAi")}
                </label>
              )}

              {mode === "generate" && (
                <div className="space-y-2 text-xs text-stone-400">
                  <p className="leading-relaxed text-stone-500">{t(writeModeHintKey(writeMode))}</p>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} />
                    {t("ai.outline")}
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
                    {t("ai.force")}
                  </label>
                </div>
              )}

              {mode === "interview" && (
                <button
                  type="button"
                  className="btn-secondary w-full text-xs"
                  onClick={() => void runBatch()}
                  disabled={loading || !chapterPath}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  {t("ai.batchQuestions")}
                </button>
              )}
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div
              ref={scrollRef}
              dir={isRtl ? "rtl" : "ltr"}
              className="copilot-scroll flex-1 space-y-4 overflow-y-auto p-4"
            >
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/40 p-6">
                    <BotIcon />
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-400">
                      {t(activeHint)}
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  applyingSuggestions={applyingMessageId === msg.id}
                  applyMode={applyMode}
                  onApplyModeChange={setApplyMode}
                  onCopy={msg.role === "assistant" ? () => copyText(msg.content) : undefined}
                  onApprove={
                    msg.pendingApproval ? () => void approveGenerate(msg.id) : undefined
                  }
                  onDiscard={
                    msg.pendingApproval ? () => discardGenerate(msg.id) : undefined
                  }
                  onRegenerate={
                    msg.pendingApproval ? () => void runGenerate(true, msg.id) : undefined
                  }
                  onApplySuggestions={
                    msg.suggestions?.length
                      ? (selected, suggestionMode) =>
                          void applySuggestionsToStory(msg.id, selected, suggestionMode)
                      : undefined
                  }
                  onOpenFile={
                    msg.outputPath ? () => openInExplorer(msg.outputPath!) : undefined
                  }
                  onOpenReport={
                    msg.reportPath ? () => openInExplorer(msg.reportPath!) : undefined
                  }
                  defaultChapterPath={chapterPath}
                />
              ))}

              {loading && <TypingIndicator />}
            </div>

            {criticalBanner}

            {error && !criticalFindings.length && (
              <div className="border-t border-red-900/40 bg-red-950/20 px-4 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="border-t border-stone-800 bg-stone-950/50 p-4">
              {isInterview ? (
                <div className="flex gap-3">
                  <textarea
                    ref={inputRef}
                    dir={isRtl ? "rtl" : "ltr"}
                    className="input min-h-[52px] max-h-40 flex-1 resize-none text-start leading-relaxed"
                    placeholder={t("ai.placeholder")}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    rows={2}
                  />
                  <button
                    type="button"
                    className="btn-primary self-end px-4"
                    onClick={() => void handleSend()}
                    disabled={runDisabled}
                  >
                    {loading ? (
                      t("common.loading")
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {sendLabel}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-stone-500">{t("ai.actionHint")}</p>
                  <button
                    type="button"
                    className="btn-primary px-6"
                    onClick={() => void handleSend()}
                    disabled={runDisabled}
                  >
                    {loading ? t("common.loading") : sendLabel}
                  </button>
                </div>
              )}
              {isInterview && (
                <p className="mt-2 text-xs text-stone-600">{t("ai.sendHint")}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ChapterPickerModal
        open={pickerOpen}
        value={chapterPath}
        onSelect={setChapterPath}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

function BotIcon() {
  return (
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-900/30 text-amber-300">
      <Sparkles className="h-6 w-6" />
    </div>
  );
}
