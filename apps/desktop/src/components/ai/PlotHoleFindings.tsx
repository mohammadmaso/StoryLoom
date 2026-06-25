import clsx from "clsx";
import { useTranslation } from "react-i18next";
import type { PlotHoleFinding } from "@/lib/api";
import { useIsRtl } from "@/hooks/useIsRtl";

interface PlotHoleFindingsProps {
  findings: PlotHoleFinding[];
}

function severityBadgeClass(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":
      return "bg-red-900/60 text-red-200 ring-red-800/50";
    case "warning":
      return "bg-amber-900/50 text-amber-200 ring-amber-800/50";
    default:
      return "bg-stone-800 text-stone-300 ring-stone-700";
  }
}

function cardBorderClass(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":
      return "border-red-900/50 bg-red-950/20";
    case "warning":
      return "border-amber-900/40 bg-amber-950/15";
    default:
      return "border-stone-700/60 bg-stone-900/40";
  }
}

export function PlotHoleFindings({ findings }: PlotHoleFindingsProps) {
  const { t } = useTranslation();
  const isRtl = useIsRtl();

  if (findings.length === 0) return null;

  return (
    <ul dir={isRtl ? "rtl" : "ltr"} className="mt-2 space-y-2">
      {findings.map((finding, index) => (
        <li
          key={`${finding.title}-${index}`}
          className={clsx("rounded-lg border p-3 text-start", cardBorderClass(finding.severity))}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={clsx(
                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                severityBadgeClass(finding.severity),
              )}
            >
              {finding.severity}
            </span>
            <span className="text-sm font-medium text-stone-100">{finding.title}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-300">{finding.description}</p>
          {finding.suggestion && (
            <p className="mt-2 text-xs text-emerald-300/90">
              <span className="font-medium text-emerald-400">{t("ai.suggestionLabel")}: </span>
              {finding.suggestion}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
