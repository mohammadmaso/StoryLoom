import { useTranslation } from "react-i18next";
import type { StyleProfileData } from "@/lib/api";
import { useIsRtl } from "@/hooks/useIsRtl";

interface StyleProfileCardProps {
  profile: StyleProfileData;
}

export function StyleProfileCard({ profile }: StyleProfileCardProps) {
  const { t } = useTranslation();
  const isRtl = useIsRtl();

  const dialoguePct = (profile.dialogueRatio * 100).toFixed(1);
  const pov = profile.povMarkers.length > 0 ? profile.povMarkers.join(", ") : t("ai.stylePovUnclear");
  const topWords =
    profile.commonWords.length > 0
      ? profile.commonWords.slice(0, 8).join(", ")
      : t("ai.styleNoWords");

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="space-y-3 text-start">
      <p className="text-sm leading-relaxed text-stone-200">{profile.summary}</p>
      <div className="flex flex-wrap gap-2">
        <MetricChip label={t("ai.styleChapters")} value={String(profile.chapterCount)} />
        <MetricChip
          label={t("ai.styleAvgSentence")}
          value={t("ai.styleWordsCount", { count: profile.avgSentenceLength })}
        />
        <MetricChip label={t("ai.styleDialogue")} value={`${dialoguePct}%`} />
        <MetricChip label={t("ai.stylePov")} value={pov} />
      </div>
      <p className="text-xs text-stone-400">
        <span className="font-medium text-stone-300">{t("ai.styleTopWords")}: </span>
        {topWords}
      </p>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex flex-col rounded-lg border border-stone-700/80 bg-stone-900/60 px-2.5 py-1.5">
      <span className="text-[10px] uppercase tracking-wide text-stone-500">{label}</span>
      <span className="text-xs font-medium text-amber-100">{value}</span>
    </span>
  );
}
