import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useProject } from "@/context/ProjectContext";

type Tab = "interview" | "whatif" | "plotholes" | "style" | "generate";

export function AiPage() {
  const { t } = useTranslation();
  const { project } = useProject();
  const [tab, setTab] = useState<Tab>("interview");
  const [chapter, setChapter] = useState("chapter-01");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [writeMode, setWriteMode] = useState("suggest");
  const [outline, setOutline] = useState(false);
  const [force, setForce] = useState(false);
  const [includeAi, setIncludeAi] = useState(true);
  const [error, setError] = useState("");

  const tabs: { id: Tab; label: string }[] = [
    { id: "interview", label: t("ai.interview") },
    { id: "whatif", label: t("ai.whatIf") },
    { id: "plotholes", label: t("ai.plotHoles") },
    { id: "style", label: t("ai.style") },
    { id: "generate", label: t("ai.generate") },
  ];

  async function runAction() {
    if (!project?.open) return;
    setLoading(true);
    setError("");
    setOutput("");
    try {
      switch (tab) {
        case "interview": {
          const res = await api.interview({ message, history, chapter });
          setOutput(res.text);
          setHistory((h) => `${h}\nAuthor: ${message}\nCopilot: ${res.text}`);
          setMessage("");
          break;
        }
        case "whatif": {
          const res = await api.whatIf(chapter);
          setOutput(res.text);
          break;
        }
        case "plotholes": {
          const res = await api.checkPlotHoles(includeAi);
          setOutput(
            res.findings
              .map((f) => `[${f.severity}] ${f.title}\n${f.description}${f.suggestion ? `\n→ ${f.suggestion}` : ""}`)
              .join("\n\n") || "No findings.",
          );
          break;
        }
        case "style": {
          const res = await api.analyzeStyle();
          setOutput(res.profile.summary);
          break;
        }
        case "generate": {
          const res = await api.generate({ chapter, mode: writeMode, outline, force });
          setOutput(res.content + (res.outputPath ? `\n\nSaved: ${res.outputPath}` : ""));
          break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "NO_PROVIDER" || msg === "NO_API_KEY") {
        setError(t("ai.notConfigured"));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function runBatch() {
    setLoading(true);
    try {
      const res = await api.interview({ batch: true, chapter });
      setOutput(res.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (!project?.open) {
    return <p className="text-stone-400">{t("home.noProject")}</p>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-amber-100">{t("ai.title")}</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "btn-primary" : "btn-secondary"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="panel space-y-4 p-4">
        {(tab === "interview" || tab === "whatif" || tab === "generate") && (
          <input
            className="input"
            placeholder={t("ai.chapterRef")}
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
          />
        )}

        {tab === "interview" && (
          <>
            <textarea
              className="input min-h-24"
              placeholder={t("ai.yourMessage")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button type="button" className="btn-secondary" onClick={() => void runBatch()} disabled={loading}>
              {t("ai.batchQuestions")}
            </button>
          </>
        )}

        {tab === "plotholes" && (
          <label className="flex items-center gap-2 text-sm text-stone-300">
            <input type="checkbox" checked={includeAi} onChange={(e) => setIncludeAi(e.target.checked)} />
            {t("ai.includeAi")}
          </label>
        )}

        {tab === "generate" && (
          <div className="flex flex-wrap gap-4 text-sm text-stone-300">
            <label>
              {t("ai.writeMode")}
              <select className="input ms-2 w-auto" value={writeMode} onChange={(e) => setWriteMode(e.target.value)}>
                <option value="suggest">suggest</option>
                <option value="draft">draft</option>
                <option value="direct">direct</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} />
              {t("ai.outline")}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
              {t("ai.force")}
            </label>
          </div>
        )}

        <button type="button" className="btn-primary" onClick={() => void runAction()} disabled={loading}>
          {loading ? t("common.loading") : t("ai.run")}
        </button>

        {error && <div className="text-sm text-red-300">{error}</div>}

        {output && (
          <div>
            <div className="mb-2 text-sm font-medium text-stone-400">{t("ai.response")}</div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-stone-950 p-4 text-sm text-stone-200">
              {output}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
