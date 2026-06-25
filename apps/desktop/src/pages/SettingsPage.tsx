import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useProject } from "@/context/ProjectContext";
import { setUiLocale, UI_LOCALES } from "@/i18n";

const KEY_PLACEHOLDER = "••••••••••••••••";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { project, refresh } = useProject();
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [writeMode, setWriteMode] = useState("suggest");
  const [outputLang, setOutputLang] = useState("en");
  const [uiLocale, setUiLocaleState] = useState(i18n.language);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState("");
  const [anthropicBaseUrl, setAnthropicBaseUrl] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [openaiKeySet, setOpenaiKeySet] = useState(false);
  const [anthropicKeySet, setAnthropicKeySet] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (!project?.open) return;
    void api.getEnv().then((env) => {
      setOpenaiKeySet(env.openaiApiKeySet);
      setAnthropicKeySet(env.anthropicApiKeySet);
      setOpenaiBaseUrl(env.openaiBaseUrl);
      setAnthropicBaseUrl(env.anthropicBaseUrl);
      setOllamaBaseUrl(env.ollamaBaseUrl);
      setOpenaiApiKey("");
      setAnthropicApiKey("");
    });
  }, [project?.open, project?.projectRoot]);

  async function save() {
    setError("");
    try {
      setUiLocale(uiLocale);

      if (project?.open) {
        if (provider) await api.setConfigKey("ai.provider", provider);
        if (model) await api.setConfigKey("ai.model", model);
        await api.setConfigKey("ai.write_mode", writeMode);
        await api.setConfigKey("story.output_language", outputLang);

        await api.saveEnv({
          ...(openaiApiKey.trim() ? { openaiApiKey: openaiApiKey.trim() } : {}),
          ...(anthropicApiKey.trim()
            ? { anthropicApiKey: anthropicApiKey.trim() }
            : {}),
          openaiBaseUrl,
          anthropicBaseUrl,
          ollamaBaseUrl,
        });

        const env = await api.getEnv();
        setOpenaiKeySet(env.openaiApiKeySet);
        setAnthropicKeySet(env.anthropicApiKeySet);
        setOpenaiApiKey("");
        setAnthropicApiKey("");
      }

      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
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
            <div className="border-t border-stone-800 pt-4">
              <h2 className="mb-3 text-sm font-semibold text-amber-200/90">
                {t("settings.aiSection")}
              </h2>

              <label className="mb-4 block">
                <span className="mb-1 block text-sm text-stone-400">{t("settings.aiProvider")}</span>
                <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="">—</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="ollama">Ollama / OpenAI-compatible</option>
                </select>
              </label>

              <label className="mb-4 block">
                <span className="mb-1 block text-sm text-stone-400">{t("settings.aiModel")}</span>
                <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o" />
              </label>

              <label className="mb-4 block">
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
            </div>

            <div className="border-t border-stone-800 pt-4">
              <h2 className="mb-1 text-sm font-semibold text-amber-200/90">
                {t("settings.credentialsSection")}
              </h2>
              <p className="mb-3 text-xs text-stone-500">{t("settings.credentialsHint")}</p>

              <label className="mb-4 block">
                <span className="mb-1 block text-sm text-stone-400">{t("settings.openaiApiKey")}</span>
                <input
                  className="input font-mono"
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder={openaiKeySet ? KEY_PLACEHOLDER : "sk-..."}
                  autoComplete="off"
                />
              </label>

              <label className="mb-4 block">
                <span className="mb-1 block text-sm text-stone-400">{t("settings.openaiBaseUrl")}</span>
                <input
                  className="input font-mono text-xs"
                  value={openaiBaseUrl}
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
                <span className="mt-1 block text-xs text-stone-600">{t("settings.openaiBaseUrlHint")}</span>
              </label>

              <label className="mb-4 block">
                <span className="mb-1 block text-sm text-stone-400">{t("settings.anthropicApiKey")}</span>
                <input
                  className="input font-mono"
                  type="password"
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                  placeholder={anthropicKeySet ? KEY_PLACEHOLDER : "sk-ant-..."}
                  autoComplete="off"
                />
              </label>

              <label className="mb-4 block">
                <span className="mb-1 block text-sm text-stone-400">{t("settings.anthropicBaseUrl")}</span>
                <input
                  className="input font-mono text-xs"
                  value={anthropicBaseUrl}
                  onChange={(e) => setAnthropicBaseUrl(e.target.value)}
                  placeholder="https://api.anthropic.com"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-stone-400">{t("settings.ollamaBaseUrl")}</span>
                <input
                  className="input font-mono text-xs"
                  value={ollamaBaseUrl}
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                />
                <span className="mt-1 block text-xs text-stone-600">{t("settings.ollamaBaseUrlHint")}</span>
              </label>
            </div>
          </>
        )}

        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
            {error}
          </div>
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
