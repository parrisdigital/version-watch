import type { ImportanceBand } from "@/lib/mock-data";

const severityLabel: Record<ImportanceBand, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const severityClass: Record<ImportanceBand, string> = {
  critical: "vw-severity-critical",
  high: "vw-severity-high",
  medium: "vw-severity-medium",
  low: "vw-severity-low",
};

export function SeverityPill({ band }: { band: ImportanceBand }) {
  return (
    <span className={`vw-severity ${severityClass[band]}`}>
      <span className="vw-severity-dot" aria-hidden="true" />
      {severityLabel[band]}
    </span>
  );
}
