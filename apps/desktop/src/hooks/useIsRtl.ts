import { useTranslation } from "react-i18next";
import { RTL_LOCALES } from "@/i18n";

export function useIsRtl(): boolean {
  const { i18n } = useTranslation();
  return RTL_LOCALES.has(i18n.language);
}
