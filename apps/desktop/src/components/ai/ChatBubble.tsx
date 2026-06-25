import { useState } from "react";
import clsx from "clsx";
import { Bot, Check, Copy, ExternalLink, FileText, RefreshCw, User, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { StorySuggestion, SuggestionApplyMode } from "@storyloom/shared";
import { useIsRtl } from "@/hooks/useIsRtl";
import { MarkdownContent } from "./MarkdownContent";
import { PlotHoleFindings } from "./PlotHoleFindings";
import { StyleProfileCard } from "./StyleProfileCard";
import { SuggestionPanel } from "./SuggestionPanel";
import type { ChatMessage } from "./types";

interface ChatBubbleProps {
  message: ChatMessage;
  applyingSuggestions?: boolean;
  applyMode: SuggestionApplyMode;
  onApplyModeChange: (mode: SuggestionApplyMode) => void;
  onCopy?: () => void;
  onApprove?: () => void;
  onDiscard?: () => void;
  onRegenerate?: () => void;
  onOpenFile?: () => void;
  onOpenReport?: () => void;
  onApplySuggestions?: (selected: StorySuggestion[], mode: SuggestionApplyMode) => void;
  defaultChapterPath?: string | null;
}

function severityClass(severity?: ChatMessage["severity"]) {
  switch (severity) {
    case "critical":
      return "border-red-800/60 bg-red-950/40";
    case "warning":
      return "border-amber-800/60 bg-amber-950/30";
    default:
      return "border-stone-700/80 bg-stone-900/90";
  }
}

export function ChatBubble({
  message,
  applyingSuggestions = false,
  applyMode,
  onApplyModeChange,
  onCopy,
  onApprove,
  onDiscard,
  onRegenerate,
  onOpenFile,
  onOpenReport,
  onApplySuggestions,
  defaultChapterPath,
}: ChatBubbleProps) {
  const { t } = useTranslation();
  const isRtl = useIsRtl();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleCopy() {
    onCopy?.();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span
          dir={isRtl ? "rtl" : "ltr"}
          className="rounded-full border border-stone-800 bg-stone-900/80 px-3 py-1 text-xs text-stone-400"
        >
          {message.content}
        </span>
      </div>
    );
  }

  const showMarkdown = !isUser && !message.styleProfile && !message.findings?.length;
  const showActions =
    !isUser &&
    (onCopy ||
      onApprove ||
      onDiscard ||
      onRegenerate ||
      onOpenFile ||
      onOpenReport ||
      message.pendingApproval);

  return (
    <div className={clsx("flex w-full gap-3", isUser ? "ms-auto max-w-[min(100%,44rem)] flex-row-reverse" : "max-w-[min(100%,44rem)]")}>
      <div
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-amber-800/80 text-amber-100" : "bg-stone-800 text-amber-200",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={clsx(
          "flex max-w-[min(100%,42rem)] flex-col gap-1",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span>{isUser ? t("ai.you") : t("ai.copilot")}</span>
          <span aria-hidden>·</span>
          <time dateTime={new Date(message.timestamp).toISOString()}>{time}</time>
          {message.pendingApproval && (
            <>
              <span aria-hidden>·</span>
              <span className="text-amber-500">{t("ai.pendingReview")}</span>
            </>
          )}
        </div>

        <div
          dir={isRtl ? "rtl" : "ltr"}
          className={clsx(
            "rounded-2xl border px-4 py-3 text-start text-sm leading-relaxed",
            isUser
              ? "rounded-ee-sm border-amber-800/50 bg-amber-950/50 text-amber-50 whitespace-pre-wrap"
              : clsx("rounded-es-sm text-stone-100", severityClass(message.severity)),
          )}
        >
          {message.styleProfile ? (
            <StyleProfileCard profile={message.styleProfile} />
          ) : message.findings && message.findings.length > 0 ? (
            <>
              {message.content && (
                <p className="mb-2 text-sm text-stone-300">{message.content}</p>
              )}
              <PlotHoleFindings findings={message.findings} />
            </>
          ) : showMarkdown ? (
            <MarkdownContent content={message.content} />
          ) : (
            <span className="whitespace-pre-wrap">{message.content}</span>
          )}
        </div>

        {message.suggestions &&
          message.suggestions.length > 0 &&
          onApplySuggestions && (
            <SuggestionPanel
              suggestions={message.suggestions}
              appliedIds={message.appliedSuggestionIds}
              applying={applyingSuggestions}
              applyMode={applyMode}
              onApplyModeChange={onApplyModeChange}
              onApply={onApplySuggestions}
              defaultChapterPath={defaultChapterPath}
            />
          )}

        {showActions && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {onCopy && (
              <ActionButton
                icon={copied ? Check : Copy}
                label={copied ? t("ai.copied") : t("ai.copy")}
                onClick={handleCopy}
              />
            )}
            {message.reportPath && onOpenReport && (
              <ActionButton icon={FileText} label={t("ai.viewReport")} onClick={onOpenReport} />
            )}
            {message.outputPath && onOpenFile && (
              <ActionButton icon={ExternalLink} label={t("ai.openFile")} onClick={onOpenFile} />
            )}
            {message.pendingApproval && onApprove && (
              <ActionButton icon={Check} label={t("ai.approve")} onClick={onApprove} variant="primary" />
            )}
            {message.pendingApproval && onDiscard && (
              <ActionButton icon={X} label={t("ai.discard")} onClick={onDiscard} variant="danger" />
            )}
            {onRegenerate && (
              <ActionButton icon={RefreshCw} label={t("ai.regenerate")} onClick={onRegenerate} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition",
        variant === "primary" && "bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800/70",
        variant === "danger" && "bg-red-950/60 text-red-200 hover:bg-red-900/70",
        variant === "default" && "border border-stone-700 bg-stone-800/80 text-stone-300 hover:bg-stone-700",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

export function TypingIndicator() {
  const { t } = useTranslation();
  const isRtl = useIsRtl();
  return (
    <div className="flex max-w-[min(100%,44rem)] gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-800 text-amber-200">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-stone-500">{t("ai.copilot")}</span>
        <div
          dir={isRtl ? "rtl" : "ltr"}
          className="flex items-center gap-2 rounded-2xl rounded-es-sm border border-stone-700/80 bg-stone-900/90 px-4 py-3"
        >
          <span className="text-sm text-stone-400">{t("ai.thinking")}</span>
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
