import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  MapPin,
  Package,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import clsx from "clsx";
import { RTL_LOCALES } from "@/i18n";

export type CreateEntityKind = "character" | "location" | "item" | "chapter";

const KIND_META: Record<
  CreateEntityKind,
  { icon: typeof UserRound; titleKey: string; hintKey: string; folder: string }
> = {
  character: {
    icon: UserRound,
    titleKey: "explorer.createCharacterTitle",
    hintKey: "explorer.createCharacterHint",
    folder: "characters",
  },
  location: {
    icon: MapPin,
    titleKey: "explorer.createLocationTitle",
    hintKey: "explorer.createLocationHint",
    folder: "locations",
  },
  item: {
    icon: Package,
    titleKey: "explorer.createItemTitle",
    hintKey: "explorer.createItemHint",
    folder: "items",
  },
  chapter: {
    icon: BookOpen,
    titleKey: "explorer.createChapterTitle",
    hintKey: "explorer.createChapterHint",
    folder: "chapters",
  },
};

function previewSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface NameEntryModalProps {
  kind: CreateEntityKind | null;
  loading?: boolean;
  error?: string;
  onConfirm: (name: string) => void;
  onClose: () => void;
}

export function NameEntryModal({
  kind,
  loading = false,
  error = "",
  onConfirm,
  onClose,
}: NameEntryModalProps) {
  const { t, i18n } = useTranslation();
  const isRtl = RTL_LOCALES.has(i18n.language);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!kind) return;
    setName("");
    setTouched(false);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [kind]);

  useEffect(() => {
    if (!kind) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [kind, onClose]);

  if (!kind) return null;

  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const slug = previewSlug(name);
  const slugEmpty = name.trim().length > 0 && slug.length === 0;
  const showError = touched && (!name.trim() || slugEmpty);
  const filePreview =
    kind === "chapter"
      ? slug
        ? `chapters/chapter-??-${slug}.md`
        : "chapters/chapter-??-….md"
      : slug
        ? `${meta.folder}/${slug}.md`
        : `${meta.folder}/….md`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const trimmed = name.trim();
    if (!trimmed || slugEmpty || loading) return;
    onConfirm(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        aria-label={t("common.close")}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-stone-700/90 bg-stone-900 shadow-2xl shadow-black/40"
        dir={isRtl ? "rtl" : "ltr"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${inputId}-title`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-950/40 to-transparent" />

        <div className="relative border-b border-stone-800/80 px-5 pb-4 pt-5">
          <button
            type="button"
            className="btn-ghost absolute top-3 p-2 end-3"
            onClick={onClose}
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 shadow-lg shadow-amber-950/50 ring-1 ring-amber-600/30">
              <Icon className="h-5 w-5 text-amber-50" />
            </div>
            <div className="min-w-0 pe-8">
              <h2
                id={`${inputId}-title`}
                className="text-lg font-semibold text-amber-50"
              >
                {t(meta.titleKey)}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-400">
                {t(meta.hintKey)}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative px-5 py-5">
          <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-stone-300">
            {t("explorer.createNameLabel")}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            className={clsx(
              "input text-base",
              (showError || error) && "border-red-700 focus:border-red-600",
            )}
            placeholder={t("explorer.createNamePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            disabled={loading}
            autoComplete="off"
          />

          {(showError || error) && (
            <p className="mt-2 text-sm text-red-300">
              {error
                ? error.startsWith("ENTITY_EXISTS:")
                  ? t("explorer.nameRequired")
                  : error
                : slugEmpty
                  ? t("explorer.nameInvalid")
                  : t("explorer.nameRequired")}
            </p>
          )}

          <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/70 px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-700/80" />
              <span>{t("explorer.createFilePreview")}</span>
            </div>
            <code className="mt-1 block truncate font-mono text-xs text-amber-200/90">
              {filePreview}
            </code>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="btn-primary min-w-[7rem]"
              disabled={loading || !name.trim() || slugEmpty}
            >
              {loading ? t("common.loading") : t("explorer.createConfirm")}
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-stone-600">
            {t("explorer.createShortcutHint")}
          </p>
        </form>
      </div>
    </div>
  );
}
