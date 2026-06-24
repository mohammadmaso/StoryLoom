import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useProject } from "@/context/ProjectContext";

export function SearchPage() {
  const { t } = useTranslation();
  const { project } = useProject();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ relativePath: string; line: number; text: string }>>([]);
  const [searched, setSearched] = useState(false);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!project?.open || !query.trim()) return;
    const data = await api.search(query);
    setResults(data);
    setSearched(true);
  }

  if (!project?.open) {
    return <p className="text-stone-400">{t("home.noProject")}</p>;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-amber-100">{t("search.title")}</h1>
      <form onSubmit={(e) => void runSearch(e)} className="mb-6 flex gap-2">
        <input
          className="input"
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0">{t("search.title")}</button>
      </form>

      {searched && results.length === 0 && (
        <p className="text-stone-500">{t("search.noResults")}</p>
      )}

      <div className="space-y-2">
        {results.map((r, i) => (
          <div key={i} className="panel p-3">
            <div className="font-mono text-xs text-amber-300">
              {r.relativePath}:{r.line}
            </div>
            <div className="mt-1 text-sm text-stone-300">{r.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
