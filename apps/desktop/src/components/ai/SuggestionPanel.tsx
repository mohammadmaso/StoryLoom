import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, FilePlus, Loader2, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import type { StorySuggestion, SuggestionApplyMode } from "@storyloom/shared";
import { useIsRtl } from "@/hooks/useIsRtl";
import { api } from "@/lib/api";

interface SuggestionPanelProps {
  suggestions: StorySuggestion[];
  appliedIds?: string[];
  applying?: boolean;
  applyMode: SuggestionApplyMode;
  onApplyModeChange: (mode: SuggestionApplyMode) => void;
  onApply: (selected: StorySuggestion[], mode: SuggestionApplyMode) => void;
  defaultChapterPath?: string | null;
}

export function SuggestionPanel({
  suggestions,
  appliedIds = [],
  applying = false,
  applyMode,
  onApplyModeChange,
  onApply,
  defaultChapterPath,
}: SuggestionPanelProps) {
  const { t } = useTranslation();
  const isRtl = useIsRtl();
  const pending = useMemo(
    () => suggestions.filter((s) => !appliedIds.includes(s.id)),
    [suggestions, appliedIds],
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(pending.map((s) => s.id)),
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBody, setPreviewBody] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(pending.map((s) => s.id)));
  const clearAll = () => setSelected(new Set());

  const selectedList = pending.filter((s) => selected.has(s.id));

  function resolvePreviewPath(suggestion: StorySuggestion): string | null {
    if (suggestion.target.path) return suggestion.target.path.replace(/\\/g, "/");
    if (suggestion.target.folder === "chapters") return defaultChapterPath ?? null;
    if (suggestion.target.folder === "world") return "world/story-notes.md";
    return null;
  }

  async function loadPreview() {
    const first = selectedList[0] ?? pending[0];
    if (!first) return;

    const path = resolvePreviewPath(first);
    if (!path) return;

    if (previewOpen && previewPath === path && previewBody !== null) {
      setPreviewOpen(false);
      return;
    }

    setPreviewOpen(true);
    setPreviewPath(path);
    setPreviewLoading(true);
    try {
      const file = await api.getFile(path);
      const excerpt =
        file.body.length > 1200 ? `${file.body.slice(0, 1200).trimEnd()}…` : file.body;
      setPreviewBody(excerpt || t("ai.noFiles"));
    } catch {
      setPreviewBody(t("common.error"));
    } finally {
      setPreviewLoading(false);
    }
  }

  if (suggestions.length === 0) return null;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="mt-3 space-y-2 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-emerald-200">
          {t("ai.suggestionsTitle", { count: pending.length })}
        </span>
        {pending.length > 0 && (
          <div className="flex gap-2 text-xs">
            <button type="button" className="text-stone-400 hover:text-stone-200" onClick={selectAll}>
              {t("ai.selectAll")}
            </button>
            <button type="button" className="text-stone-400 hover:text-stone-200" onClick={clearAll}>
              {t("ai.selectNone")}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-stone-800 bg-stone-950/40 p-2">
        <span className="text-xs text-stone-500">{t("ai.applyModeLabel")}</span>
        <div className="flex flex-wrap gap-2">
          <ApplyModeButton
            active={applyMode === "integrate"}
            onClick={() => onApplyModeChange("integrate")}
            label={t("ai.applyModeIntegrate")}
          />
          <ApplyModeButton
            active={applyMode === "append"}
            onClick={() => onApplyModeChange("append")}
            label={t("ai.applyModeAppend")}
          />
        </div>
        <p className="text-xs leading-relaxed text-stone-500">
          {applyMode === "integrate" ? t("ai.applyModeIntegrateHint") : t("ai.applyModeAppendHint")}
        </p>
      </div>

      <ul className="space-y-2">
        {suggestions.map((suggestion) => {
          const applied = appliedIds.includes(suggestion.id);
          const isSelected = selected.has(suggestion.id);
          const targetLabel =
            suggestion.target.path ??
            `${suggestion.target.folder}${suggestion.target.section ? ` · ${suggestion.target.section}` : ""}`;

          return (
            <li key={suggestion.id}>
              <label
                className={clsx(
                  "flex cursor-pointer gap-3 rounded-lg border p-3 transition",
                  applied
                    ? "border-emerald-800/30 bg-emerald-950/10 opacity-70"
                    : isSelected
                      ? "border-emerald-700/50 bg-emerald-950/30"
                      : "border-stone-700/60 bg-stone-900/40 hover:border-stone-600",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 shrink-0 rounded border-stone-600"
                  checked={applied || isSelected}
                  disabled={applied || applying}
                  onChange={() => toggle(suggestion.id)}
                />
                <div className="min-w-0 flex-1 text-start">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-stone-100">{suggestion.title}</span>
                    {applied && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/50 px-2 py-0.5 text-xs text-emerald-200">
                        <Check className="h-3 w-3" />
                        {t("ai.added")}
                      </span>
                    )}
                  </div>
                  {suggestion.description && (
                    <p className="mt-1 text-xs text-stone-400">{suggestion.description}</p>
                  )}
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-stone-300">
                    {suggestion.content}
                  </p>
                  <p className="mt-2 text-xs text-amber-700/80">{targetLabel}</p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      {pending.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-stone-700/60 bg-stone-900/40 px-3 py-2 text-xs text-stone-400 hover:border-stone-600"
            onClick={() => void loadPreview()}
          >
            <span>{t("ai.previewTarget")}</span>
            {previewOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {previewOpen && (
            <div className="rounded-lg border border-stone-700/60 bg-stone-950/60 p-3">
              {previewPath && (
                <p className="mb-2 truncate text-xs text-amber-700/80">{previewPath}</p>
              )}
              {previewLoading ? (
                <p className="text-xs text-stone-500">{t("ai.previewLoading")}</p>
              ) : (
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-stone-300">
                  {previewBody}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {pending.length > 0 && (
        <button
          type="button"
          className="btn-primary w-full"
          disabled={applying || selectedList.length === 0}
          onClick={() => onApply(selectedList, applyMode)}
        >
          {applying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </>
          ) : applyMode === "integrate" ? (
            <>
              <Sparkles className="h-4 w-4" />
              {t("ai.mergeSelected", { count: selectedList.length })}
            </>
          ) : (
            <>
              <FilePlus className="h-4 w-4" />
              {t("ai.addSelected", { count: selectedList.length })}
            </>
          )}
        </button>
      )}
    </div>
  );
}

function ApplyModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-lg px-3 py-1.5 text-xs font-medium transition",
        active
          ? "bg-amber-900/50 text-amber-100 ring-1 ring-amber-800/50"
          : "border border-stone-700 text-stone-400 hover:bg-stone-800",
      )}
    >
      {label}
    </button>
  );
}
