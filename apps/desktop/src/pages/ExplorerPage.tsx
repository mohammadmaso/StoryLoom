import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { StoryEditor } from "@/components/StoryEditor";
import {
  NameEntryModal,
  type CreateEntityKind,
} from "@/components/NameEntryModal";
import { api, type ParsedFile } from "@/lib/api";
import { useProject } from "@/context/ProjectContext";
import { storyTextDirection } from "@/lib/storyDirection";

export function ExplorerPage() {
  const { t } = useTranslation();
  const { project } = useProject();
  const [searchParams] = useSearchParams();
  const [tree, setTree] = useState<Array<{ folder: string; files: string[] }>>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [editorValue, setEditorValue] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [createKind, setCreateKind] = useState<CreateEntityKind | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const deleteConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedBodyRef = useRef("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveSeqRef = useRef(0);

  const textDirection = useMemo(
    () => storyTextDirection(project?.config),
    [project?.config],
  );

  const loadTree = useCallback(async () => {
    if (!project?.open) return;
    const data = await api.getTree();
    setTree(data);
  }, [project?.open]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  useEffect(() => {
    const fileParam = searchParams.get("file");
    if (fileParam && project?.open) {
      void openFile(fileParam);
    }
  }, [searchParams, project?.open]);

  async function openFile(path: string) {
    setError("");
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (
      selected &&
      file &&
      editorValue !== savedBodyRef.current &&
      !selected.startsWith("reports/")
    ) {
      try {
        await api.saveFile(selected, editorValue);
        savedBodyRef.current = editorValue;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return;
      }
    }
    try {
      const data = await api.getFile(path);
      setSelected(path);
      setFile(data);
      setEditorValue(data.body);
      savedBodyRef.current = data.body;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSelected(null);
      setFile(null);
      setEditorValue("");
    }
  }

  const isReportFile = selected?.startsWith("reports/") ?? false;

  async function handleWikilinkClick(target: string) {
    setError("");
    try {
      const { path } = await api.resolveWikilink(target);
      if (path) {
        await openFile(path);
      } else {
        setError(t("explorer.wikilinkNotFound", { target }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveFile(showStatus = true) {
    if (!selected || !file || isReportFile) return;
    if (editorValue === savedBodyRef.current) return;

    const seq = ++autosaveSeqRef.current;
    if (showStatus) setStatus(t("explorer.saving"));

    try {
      await api.saveFile(selected, editorValue);
      if (seq !== autosaveSeqRef.current) return;
      savedBodyRef.current = editorValue;
      if (showStatus) {
        setStatus(t("explorer.saved"));
        setTimeout(() => setStatus(""), 2000);
      }
    } catch (err) {
      if (seq !== autosaveSeqRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
      if (showStatus) setStatus("");
    }
  }

  useEffect(() => {
    if (!selected || !file || isReportFile) return;
    if (editorValue === savedBodyRef.current) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void saveFile(true);
    }, 800);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [editorValue, selected, file, isReportFile]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreateModal(kind: CreateEntityKind) {
    setCreateError("");
    setCreateKind(kind);
  }

  async function handleCreateConfirm(name: string) {
    if (!createKind) return;
    setCreateLoading(true);
    setCreateError("");
    try {
      if (createKind === "chapter") {
        const result = await api.createChapter(name);
        await loadTree();
        setCreateKind(null);
        await openFile(result.path);
      } else {
        const folder =
          createKind === "character"
            ? "characters"
            : createKind === "location"
              ? "locations"
              : "items";
        await api.createEntity(folder, name);
        await loadTree();
        setCreateKind(null);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreateLoading(false);
    }
  }

  function createEntity(folder: string) {
    const kind =
      folder === "characters"
        ? "character"
        : folder === "locations"
          ? "location"
          : "item";
    openCreateModal(kind);
  }

  function createChapter() {
    openCreateModal("chapter");
  }

  async function promote() {
    if (!selected) return;
    await api.promoteCanon(selected);
    await openFile(selected);
  }

  async function archive() {
    if (!selected) return;
    await api.archiveCanon(selected);
    await openFile(selected);
  }

  function requestDelete(filePath: string) {
    if (deleteConfirmTimer.current) clearTimeout(deleteConfirmTimer.current);
    setDeleteConfirm(filePath);
    deleteConfirmTimer.current = setTimeout(() => setDeleteConfirm(null), 5000);
  }

  async function confirmDelete(filePath: string) {
    if (deleteConfirmTimer.current) clearTimeout(deleteConfirmTimer.current);
    setDeleteConfirm(null);
    setDeleteLoading(true);
    setError("");
    try {
      await api.deleteFile(filePath);
      if (selected === filePath) {
        setSelected(null);
        setFile(null);
        setEditorValue("");
      }
      await loadTree();
      setStatus(t("explorer.deleteFileSuccess"));
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteLoading(false);
    }
  }

  if (!project?.open) {
    return <p className="text-stone-400">{t("home.noProject")}</p>;
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4">
      <div className="panel flex w-72 shrink-0 flex-col overflow-hidden">
        <div className="border-b border-stone-800 p-3">
          <h2 className="font-semibold">{t("explorer.title")}</h2>
          <div className="mt-2 flex flex-wrap gap-1">
            <button type="button" className="btn-ghost text-xs" onClick={() => void createEntity("characters")}>{t("explorer.newCharacter")}</button>
            <button type="button" className="btn-ghost text-xs" onClick={() => void createEntity("locations")}>{t("explorer.newLocation")}</button>
            <button type="button" className="btn-ghost text-xs" onClick={() => void createEntity("items")}>{t("explorer.newItem")}</button>
            <button type="button" className="btn-ghost text-xs" onClick={() => void createChapter()}>{t("explorer.newChapter")}</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {tree.map(({ folder, files }) => (
            <div key={folder} className="mb-3">
              <div className="px-2 py-1 text-xs font-semibold uppercase text-stone-500">{folder}</div>
              {files.length === 0 ? (
                <div className="px-2 py-1 text-xs text-stone-600">{t("explorer.emptyFolder")}</div>
              ) : (
                files.map((f) => {
                  const isPendingDelete = deleteConfirm === f;
                  return (
                    <div key={f} className="group relative flex items-center">
                      <button
                        type="button"
                        onClick={() => { setDeleteConfirm(null); void openFile(f); }}
                        className={`min-w-0 flex-1 truncate rounded py-1 ps-2 pe-7 text-start text-sm hover:bg-stone-800 ${selected === f ? "bg-amber-950/50 text-amber-200" : "text-stone-300"}`}
                      >
                        {f.split("/").pop()?.replace(/\.md$/, "")}
                      </button>
                      {isPendingDelete ? (
                        <div className="absolute end-0 flex gap-0.5">
                          <button
                            type="button"
                            title={t("explorer.deleteFileConfirm")}
                            disabled={deleteLoading}
                            onClick={() => void confirmDelete(f)}
                            className="rounded bg-red-800/80 px-1.5 py-0.5 text-[10px] font-medium text-red-100 hover:bg-red-700"
                          >
                            {t("explorer.deleteFile")}
                          </button>
                          <button
                            type="button"
                            title={t("explorer.deleteFileCancel")}
                            onClick={() => setDeleteConfirm(null)}
                            className="rounded bg-stone-700 px-1.5 py-0.5 text-[10px] text-stone-300 hover:bg-stone-600"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          title={t("explorer.deleteFile")}
                          onClick={(e) => { e.stopPropagation(); requestDelete(f); }}
                          className="absolute end-1 hidden rounded p-0.5 text-stone-600 hover:bg-stone-700 hover:text-red-400 group-hover:flex"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-stone-800 px-4 py-2">
          <div>
            <div className="text-sm font-medium">{selected ?? "—"}</div>
            {file && (
              <div className="text-xs text-stone-500">
                {isReportFile
                  ? t("explorer.readOnlyReport")
                  : `${t("explorer.status")}: ${String(file.frontmatter.status)} · ${t("explorer.type")}: ${String(file.frontmatter.type)}`}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {!isReportFile && (
              <>
                <button type="button" className="btn-secondary" onClick={() => void promote()} disabled={!selected}>{t("explorer.promote")}</button>
                <button type="button" className="btn-secondary" onClick={() => void archive()} disabled={!selected}>{t("explorer.archive")}</button>
              </>
            )}
            <button type="button" className="btn-primary" onClick={() => void saveFile(true)} disabled={!selected || isReportFile}>{t("explorer.save")}</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {selected ? (
            <StoryEditor
              value={editorValue}
              onChange={setEditorValue}
              direction={textDirection}
              fileKey={selected}
              onWikilinkClick={(target) => void handleWikilinkClick(target)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-500">
              {t("explorer.selectFile")}
            </div>
          )}
        </div>
        {(status || error) && (
          <div className="border-t border-stone-800 px-4 py-2 text-sm text-stone-400">
            {status || error}
          </div>
        )}
      </div>

      <NameEntryModal
        kind={createKind}
        loading={createLoading}
        error={createError}
        onConfirm={(name) => void handleCreateConfirm(name)}
        onClose={() => {
          if (createLoading) return;
          setCreateKind(null);
          setCreateError("");
        }}
      />
    </div>
  );
}
