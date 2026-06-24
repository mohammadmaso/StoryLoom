import { useCallback, useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { useTranslation } from "react-i18next";
import { api, type ParsedFile } from "@/lib/api";
import { useProject } from "@/context/ProjectContext";

export function ExplorerPage() {
  const { t } = useTranslation();
  const { project } = useProject();
  const [tree, setTree] = useState<Array<{ folder: string; files: string[] }>>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [editorValue, setEditorValue] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const loadTree = useCallback(async () => {
    if (!project?.open) return;
    const data = await api.getTree();
    setTree(data);
  }, [project?.open]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  async function openFile(path: string) {
    setError("");
    const data = await api.getFile(path);
    setSelected(path);
    setFile(data);
    setEditorValue(data.body);
  }

  async function saveFile() {
    if (!selected || !file) return;
    setStatus(t("common.loading"));
    await api.saveFile(selected, editorValue);
    setStatus(t("explorer.saved"));
    setTimeout(() => setStatus(""), 2000);
  }

  async function createEntity(folder: string) {
    const name = prompt(t("explorer.namePrompt"));
    if (!name) return;
    await api.createEntity(folder, name);
    await loadTree();
  }

  async function createChapter() {
    const name = prompt(t("explorer.namePrompt"));
    if (!name) return;
    const result = await api.createChapter(name);
    await loadTree();
    await openFile(result.path);
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
              {files.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => void openFile(f)}
                  className={`block w-full truncate rounded px-2 py-1 text-start text-sm hover:bg-stone-800 ${selected === f ? "bg-amber-950/50 text-amber-200" : "text-stone-300"}`}
                >
                  {f.split("/").pop()}
                </button>
              ))}
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
                {t("explorer.status")}: {String(file.frontmatter.status)} · {t("explorer.type")}: {String(file.frontmatter.type)}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => void promote()} disabled={!selected}>{t("explorer.promote")}</button>
            <button type="button" className="btn-secondary" onClick={() => void archive()} disabled={!selected}>{t("explorer.archive")}</button>
            <button type="button" className="btn-primary" onClick={() => void saveFile()} disabled={!selected}>{t("explorer.save")}</button>
          </div>
        </div>
        <div className="flex-1">
          {selected ? (
            <Editor
              height="100%"
              defaultLanguage="markdown"
              theme="vs-dark"
              value={editorValue}
              onChange={(v) => setEditorValue(v ?? "")}
              options={{ minimap: { enabled: false }, wordWrap: "on", fontSize: 14 }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-500">
              Select a file
            </div>
          )}
        </div>
        {(status || error) && (
          <div className="border-t border-stone-800 px-4 py-2 text-sm text-stone-400">
            {status || error}
          </div>
        )}
      </div>
    </div>
  );
}
