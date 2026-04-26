import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/event-card";
import { SeverityPill } from "@/components/severity-pill";
import { VendorMark } from "@/components/vendor-mark";
import { clusterChangeEvents, type ChangeCluster } from "@/lib/change-clusters";
import { getImportanceBand, releaseClassLabel } from "@/lib/classification/signal";
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
  const clustered = clusterChangeEvents(events, { minClusterSize: 3, windowHours: 24 });
  const visible = clustered.slice(0, 8);

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
              Ordered by publish time with related release noise collapsed. Each record keeps its
              release class, severity, and signal score so real follow-up work stands out.
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
          {visible.map((item) => (
            item.kind === "cluster" ? (
              <ReleaseClusterCard key={item.id} cluster={item} />
            ) : (
              <EventCard key={item.id} event={item.events[0]!} />
            )
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

function ReleaseClusterCard({ cluster }: { cluster: ChangeCluster }) {
  const latest = cluster.events[0]!;
  const band = getImportanceBand(cluster.signalScore);

  return (
    <article className="group vw-panel relative overflow-hidden p-6 transition-[border-color,background-color] duration-300 hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-raised)] md:p-7">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex items-center gap-3">
          <VendorMark vendorSlug={cluster.vendorSlug} vendorName={cluster.vendorName} size="sm" />
          <span className="flex flex-col leading-tight">
            <span className="font-[var(--font-display)] text-sm font-semibold text-[var(--color-ink)]">
              {cluster.vendorName}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">Release cluster</span>
          </span>
        </span>

        <span className="ml-auto flex flex-wrap items-center gap-3">
          <span className="vw-tag vw-tag-mono">{releaseClassLabel(cluster.releaseClass)}</span>
          <SeverityPill band={band} />
        </span>
      </div>

      <h3 className="vw-title mt-6 text-[1.5rem] leading-[1.15] md:text-[1.75rem]">
        <Link href={`/events/${latest.slug}`} className="vw-stretched-link text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-signal)]">
          {cluster.title}
        </Link>
      </h3>

      <p className="vw-copy mt-4 text-[0.9375rem] leading-[1.6] md:text-base">{cluster.summary}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {cluster.events.slice(0, 5).map((event) => (
          <Link key={event.slug} href={`/events/${event.slug}`} className="vw-tag vw-tag-mono relative z-10 hover:border-[var(--color-line-strong)]">
            {event.title}
          </Link>
        ))}
        {cluster.events.length > 5 ? <span className="vw-tag vw-tag-mono">+{cluster.events.length - 5} more</span> : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--color-line-quiet)] pt-5">
        <span className="text-sm font-semibold text-[var(--color-ink-soft)] transition-colors group-hover:text-[var(--color-signal)]">
          Open latest event
        </span>
        <span className="ml-auto font-[var(--font-mono)] text-[0.6875rem] tabular-nums text-[var(--color-ink-muted)]">
          {cluster.signalScore}
        </span>
      </div>
    </article>
  );
}
