import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useProject } from "@/context/ProjectContext";

export function GitPage() {
  const { t } = useTranslation();
  const { project } = useProject();
  const [commits, setCommits] = useState<Array<{ hash: string; date: string; message: string }>>([]);

  useEffect(() => {
    if (!project?.open) return;
    void api.gitLogAi().then(setCommits);
  }, [project?.open]);

  if (!project?.open) {
    return <p className="text-stone-400">{t("home.noProject")}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-amber-100">{t("git.title")}</h1>
      {commits.length === 0 ? (
        <p className="text-stone-500">{t("git.empty")}</p>
      ) : (
        <div className="space-y-2">
          {commits.map((c) => (
            <div key={c.hash} className="panel p-3 font-mono text-sm">
              <span className="text-amber-400">{c.hash.slice(0, 7)}</span>
              <span className="mx-2 text-stone-600">{c.date}</span>
              <span className="text-stone-300">{c.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
