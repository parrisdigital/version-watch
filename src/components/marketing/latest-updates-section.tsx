import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/event-card";
import type { SiteEvent } from "@/lib/site-data";

type LatestUpdatesSectionProps = {
  events: SiteEvent[];
};

const SEVERITY_LEGEND = [
  { band: "critical", label: "Critical" },
  { band: "high", label: "High" },
  { band: "medium", label: "Medium" },
  { band: "low", label: "Low" },
] as const;

export function LatestUpdatesSection({ events }: LatestUpdatesSectionProps) {
  const visible = events.slice(0, 8);

  return (
    <section id="latest" className="scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              Most recent
            </p>
            <h2 className="max-w-[22ch] text-balance text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              Fresh changes from the platforms your stack runs on.
            </h2>
            <p className="max-w-[56ch] text-pretty text-base text-[var(--muted-foreground)] sm:text-sm sm:leading-6 lg:text-base lg:leading-7">
              Ordered by publish time — newest first. Each record keeps its signal score so you can
              see at a glance whether an update is likely to create real follow-up work.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/search">
              Open search
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div
          aria-label="Severity legend"
          className="mt-8 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2"
        >
          <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
            Severity
          </span>
          {SEVERITY_LEGEND.map((entry) => (
            <span key={entry.band} className={`vw-severity vw-severity-${entry.band}`}>
              <span className="vw-severity-dot" aria-hidden="true" />
              {entry.label}
            </span>
          ))}
          <p className="ml-auto text-xs text-[var(--muted-foreground)]">
            Signal score drives the band ·{" "}
            <Link
              href="/about"
              className="text-[var(--foreground)] underline-offset-4 hover:underline"
            >
              Methodology
            </Link>
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {visible.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {events.length > visible.length ? (
          <div className="mt-12 flex justify-center">
            <Button asChild variant="outline">
              <Link href="/search">See all {events.length} tracked updates</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
