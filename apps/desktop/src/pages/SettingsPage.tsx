import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useProject } from "@/context/ProjectContext";
import { setUiLocale, UI_LOCALES } from "@/i18n";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { project, refresh } = useProject();
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [writeMode, setWriteMode] = useState("suggest");
  const [outputLang, setOutputLang] = useState("en");
  const [uiLocale, setUiLocaleState] = useState(i18n.language);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!project?.config) return;
    const cfg = project.config as {
      ai?: { provider?: string | null; model?: string | null; write_mode?: string };
      story?: { output_language?: string };
    };
    setProvider(cfg.ai?.provider ?? "");
    setModel(cfg.ai?.model ?? "");
    setWriteMode(cfg.ai?.write_mode ?? "suggest");
    setOutputLang(cfg.story?.output_language ?? "en");
  }, [project?.config]);

  async function save() {
    if (!project?.open) return;
    if (provider) await api.setConfigKey("ai.provider", provider);
    if (model) await api.setConfigKey("ai.model", model);
    await api.setConfigKey("ai.write_mode", writeMode);
    await api.setConfigKey("story.output_language", outputLang);
    setUiLocale(uiLocale);
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-amber-100">{t("settings.title")}</h1>

      <div className="panel space-y-4 p-6">
        <label className="block">
          <span className="mb-1 block text-sm text-stone-400">{t("settings.language")}</span>
          <select
            className="input"
            value={uiLocale}
            onChange={(e) => setUiLocaleState(e.target.value)}
          >
            {UI_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </label>

        {project?.open && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm text-stone-400">{t("settings.aiProvider")}</span>
              <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="">—</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-stone-400">{t("settings.aiModel")}</span>
              <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o" />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-stone-400">{t("settings.writeMode")}</span>
              <select className="input" value={writeMode} onChange={(e) => setWriteMode(e.target.value)}>
                <option value="suggest">suggest</option>
                <option value="draft_file">draft</option>
                <option value="direct">direct</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-stone-400">{t("settings.outputLanguage")}</span>
              <input className="input" value={outputLang} onChange={(e) => setOutputLang(e.target.value)} />
            </label>
          </>
        )}

        <button type="button" className="btn-primary" onClick={() => void save()}>
          {saved ? t("settings.saved") : t("settings.save")}
        </button>

        {!project?.open && (
          <p className="text-sm text-stone-500">{t("home.noProject")}</p>
        )}
      </div>
    </div>
  );
}
