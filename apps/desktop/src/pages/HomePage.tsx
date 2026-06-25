import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { api } from "@/lib/api";
import { useProject } from "@/context/ProjectContext";

function formatOpenError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("NOT_A_STORYLOOM_PROJECT")) {
    return "Selected folder is not a StoryLoom project (missing story-config.yaml). Open the project folder itself, e.g. examples/sample-novel.";
  }
  if (message.includes("INVALID_CONFIG")) {
    return `Invalid story-config.yaml: ${message.replace("INVALID_CONFIG:", "").trim()}`;
  }
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return "Cannot reach StoryLoom API. Ensure it is running on port 3847 (pnpm api:dev).";
  }
  return message;
}

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      if (selected === null || selected === undefined) {
        return;
      }
      const folderPath = Array.isArray(selected) ? selected[0] : selected;
      if (!folderPath) return;

      await openProject(folderPath);
      navigate("/explorer");
    } catch (err) {
      setError(formatOpenError(err));
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
    } else if (Array.isArray(selected) && selected[0]) {
      setParentDir(selected[0]);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let base = parentDir;
      if (!base) {
        const selected = await open({
          directory: true,
          multiple: false,
          title: t("home.parentDir"),
        });
        if (typeof selected === "string") {
          base = selected;
        } else if (Array.isArray(selected) && selected[0]) {
          base = selected[0];
        } else {
          setLoading(false);
          return;
        }
        setParentDir(base);
      }
      const targetDir = `${base}/${name}`;
      await api.initProject({ targetDir, title, author, genre });
      await refresh();
      navigate("/explorer");
    } catch (err) {
      setError(formatOpenError(err));
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

      {project?.open && project.projectRoot && (
        <div className="panel mb-6 p-4">
          <div className="text-sm text-stone-500">{t("home.recent")}</div>
          <div className="mt-1 font-mono text-sm text-amber-200">
            {project.projectRoot}
          </div>
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() => navigate("/explorer")}
          >
            {t("nav.explorer")}
          </button>
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
            {loading ? t("common.loading") : t("home.openProject")}
          </button>
          <p className="mt-3 text-xs text-stone-500">
            Select the folder that contains <code className="text-amber-300/80">story-config.yaml</code> (e.g. sample-novel).
          </p>
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
