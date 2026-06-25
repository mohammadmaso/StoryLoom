import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link2, X } from "lucide-react";

export type LinkKind = "wikilink" | "url";

interface WysiwygLinkPopoverProps {
  kind: LinkKind;
  initialTarget: string;
  initialLabel: string;
  onInsert: (target: string, label: string) => void;
  onClose: () => void;
}

export function WysiwygLinkPopover({
  kind,
  initialTarget,
  initialLabel,
  onInsert,
  onClose,
}: WysiwygLinkPopoverProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState(initialTarget);
  const [label, setLabel] = useState(initialLabel);
  const targetRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    targetRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTarget = target.trim();
    if (!trimmedTarget) return;
    const trimmedLabel = label.trim() || trimmedTarget;
    onInsert(trimmedTarget, trimmedLabel);
  }

  const isWikilink = kind === "wikilink";

  return (
    <div className="absolute start-3 top-full z-20 mt-1 w-72 rounded-lg border border-stone-700 bg-stone-900 p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-stone-300">
          <Link2 className="h-3.5 w-3.5 text-amber-400" />
          {isWikilink ? t("explorer.linkWikilink") : t("explorer.linkUrl")}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-stone-500 hover:bg-stone-800 hover:text-stone-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-[11px] text-stone-500">
            {isWikilink ? t("explorer.linkTarget") : t("explorer.linkUrlField")}
          </span>
          <input
            ref={targetRef}
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={
              isWikilink
                ? t("explorer.linkTargetPlaceholder")
                : t("explorer.linkUrlPlaceholder")
            }
            className="w-full rounded border border-stone-700 bg-stone-950 px-2 py-1.5 text-sm text-stone-200 outline-none focus:border-amber-700"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-stone-500">
            {t("explorer.linkLabel")}
          </span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("explorer.linkLabelPlaceholder")}
            className="w-full rounded border border-stone-700 bg-stone-950 px-2 py-1.5 text-sm text-stone-200 outline-none focus:border-amber-700"
          />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost text-xs">
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn-primary text-xs">
            {t("explorer.linkInsert")}
          </button>
        </div>
      </form>
    </div>
  );
}
