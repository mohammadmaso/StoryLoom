import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Search, X } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import { RTL_LOCALES } from "@/i18n";

interface ChapterPickerModalProps {
  open: boolean;
  value: string | null;
  onSelect: (relativePath: string) => void;
  onClose: () => void;
}

function chapterRefFromPath(relativePath: string): string {
  return relativePath.replace(/\.md$/, "").split("/").pop() ?? relativePath;
}

export function ChapterPickerModal({ open, value, onSelect, onClose }: ChapterPickerModalProps) {
  const { t, i18n } = useTranslation();
  const isRtl = RTL_LOCALES.has(i18n.language);
  const [tree, setTree] = useState<Array<{ folder: string; files: string[] }>>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTree();
      setTree(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadTree();
      setQuery("");
    }
  }, [open, loadTree]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tree
      .map(({ folder, files }) => ({
        folder,
        files: q
          ? files.filter((f) => f.toLowerCase().includes(q) || folder.toLowerCase().includes(q))
          : files,
      }))
      .filter(({ files }) => files.length > 0);
  }, [tree, query]);

  const chaptersFirst = useMemo(() => {
    const chapters = filtered.find((g) => g.folder === "chapters");
    const rest = filtered.filter((g) => g.folder !== "chapters");
    return chapters ? [chapters, ...rest] : filtered;
  }, [filtered]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[min(80vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-stone-700 bg-stone-900 shadow-2xl"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
          <div>
            <h2 className="font-semibold text-amber-100">{t("ai.selectChapter")}</h2>
            <p className="text-xs text-stone-500">{t("ai.selectChapterHint")}</p>
          </div>
          <button type="button" className="btn-ghost p-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-stone-800 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 start-3" />
            <input
              className="input ps-9"
              placeholder={t("ai.searchFiles")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="copilot-scroll flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="p-4 text-center text-sm text-stone-500">{t("common.loading")}</p>
          ) : chaptersFirst.length === 0 ? (
            <p className="p-4 text-center text-sm text-stone-500">{t("ai.noFiles")}</p>
          ) : (
            chaptersFirst.map(({ folder, files }) => (
              <div key={folder} className="mb-3">
                <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {folder}
                </div>
                <ul className="space-y-0.5">
                  {files.map((file) => {
                    const selected = value === file;
                    const label = file.split("/").pop() ?? file;
                    return (
                      <li key={file}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(file);
                            onClose();
                          }}
                          className={clsx(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition",
                            selected
                              ? "bg-amber-950/60 text-amber-100 ring-1 ring-amber-800/50"
                              : "text-stone-300 hover:bg-stone-800",
                          )}
                        >
                          <FileText className="h-4 w-4 shrink-0 text-stone-500" />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                          {folder === "chapters" && (
                            <span className="shrink-0 text-xs text-stone-600">
                              {chapterRefFromPath(file)}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {value && (
          <div className="border-t border-stone-800 bg-stone-950/80 px-4 py-2 text-xs text-stone-400">
            {t("ai.selectedFile")}: <span className="text-amber-200">{value}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export { chapterRefFromPath };
