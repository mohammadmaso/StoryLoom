import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fa from "./locales/fa.json";
import ar from "./locales/ar.json";

export const RTL_LOCALES = new Set(["fa", "ar"]);

export const UI_LOCALES = [
  { code: "en", label: "English", dir: "ltr" as const },
  { code: "fa", label: "فارسی", dir: "rtl" as const },
  { code: "ar", label: "العربية", dir: "rtl" as const },
];

const saved = localStorage.getItem("storyloom-ui-locale") ?? "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fa: { translation: fa },
    ar: { translation: ar },
  },
  lng: saved,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function applyDocumentDirection(locale: string) {
  const meta = UI_LOCALES.find((l) => l.code === locale) ?? UI_LOCALES[0]!;
  document.documentElement.lang = locale;
  document.documentElement.dir = meta.dir;
}

applyDocumentDirection(saved);

export function setUiLocale(locale: string) {
  localStorage.setItem("storyloom-ui-locale", locale);
  void i18n.changeLanguage(locale);
  applyDocumentDirection(locale);
}

export default i18n;
