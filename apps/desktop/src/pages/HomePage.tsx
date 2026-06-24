import { useState } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { api } from "@/lib/api";
import { useProject } from "@/context/ProjectContext";

export function HomePage() {
  const { t } = useTranslation();
  const { project, apiOnline, openProject, refresh } = useProject();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [parentDir, setParentDir] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    setError("");
    setLoading(true);
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t("home.openProject"),
      });
      if (typeof selected === "string") {
        await openProject(selected);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function pickParentDir() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: t("home.parentDir"),
    });
    if (typeof selected === "string") {
      setParentDir(selected);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let base = parentDir;
      if (!base) {
        await pickParentDir();
        base = parentDir;
        if (!base) {
          setLoading(false);
          return;
        }
      }
      const targetDir = `${base}/${name}`;
      await api.initProject({ targetDir, title, author, genre });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-3xl font-bold text-amber-100">{t("home.welcome")}</h1>
      <p className="mb-8 text-stone-400">{t("home.subtitle")}</p>

      {!apiOnline && (
        <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-red-200">
          {t("home.apiOffline")}
        </div>
      )}

      {project?.projectRoot && (
        <div className="panel mb-6 p-4">
          <div className="text-sm text-stone-500">{t("home.recent")}</div>
          <div className="mt-1 font-mono text-sm text-amber-200">
            {project.projectRoot}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="panel p-6">
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => void handleOpen()}
            disabled={loading || !apiOnline}
          >
            {t("home.openProject")}
          </button>
        </div>

        <div className="panel p-6">
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => setCreating((v) => !v)}
            disabled={!apiOnline}
          >
            {t("home.createProject")}
          </button>
        </div>
      </div>

      {creating && (
        <form onSubmit={(e) => void handleCreate(e)} className="panel mt-6 space-y-4 p-6">
          <input className="input" placeholder={t("home.projectName")} value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="input" placeholder={t("home.title")} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="input" placeholder={t("home.author")} value={author} onChange={(e) => setAuthor(e.target.value)} />
          <input className="input" placeholder={t("home.genre")} value={genre} onChange={(e) => setGenre(e.target.value)} />
          <div className="flex gap-2">
            <input className="input" placeholder={t("home.parentDir")} value={parentDir} onChange={(e) => setParentDir(e.target.value)} />
            <button type="button" className="btn-secondary shrink-0" onClick={() => void pickParentDir()}>
              …
            </button>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {t("home.createProject")}
          </button>
        </form>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
