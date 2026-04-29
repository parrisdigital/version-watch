import { formatDistanceToNowStrict } from "date-fns";

import type { FreshnessSummary } from "@/lib/site-data";
import { cn } from "@/lib/utils";

type FreshnessSummaryBadgeProps = {
  summary: FreshnessSummary;
  className?: string;
  /** When true, render at slightly larger type and padding for hero placement. */
  prominent?: boolean;
};

function relativeTime(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function FreshnessSummaryBadge({
  summary,
  className,
  prominent = false,
}: FreshnessSummaryBadgeProps) {
  const latestRunLabel = relativeTime(summary.latestRunAt);

  return (
    <div
      className={cn(
        "inline-flex w-fit max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-[var(--border)] bg-[color-mix(in_oklch,var(--card)_82%,transparent)] backdrop-blur-md text-[var(--muted-foreground)]",
        prominent ? "px-4 py-2 text-[0.8125rem] gap-x-2.5" : "px-3 py-1.5 text-xs",
        className,
      )}
    >
      <span
        className="size-1.5 rounded-full bg-[var(--color-green)] shadow-[0_0_12px_var(--color-green)]"
        aria-hidden="true"
      />
      <span className="tabular-nums">
        {latestRunLabel ? `Feed refreshed ${latestRunLabel}` : "Feed refresh active"}
      </span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">{summary.sourceCount} official sources</span>
    </div>
  );
}
