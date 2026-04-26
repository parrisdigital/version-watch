import Link from "next/link";

import { SiteHeader } from "@/components/marketing/site-header";
import { buildSignalQualityReport } from "@/lib/signal-observability";
import { getAllPublicEvents } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function OpsSignalPage() {
  const events = await getAllPublicEvents();
  const report = buildSignalQualityReport(events);

  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="border-b border-[var(--color-line)] px-4 pb-10 pt-28 sm:px-6 md:pb-14 md:pt-32">
        <div className="vw-shell">
          <p className="vw-kicker">Operations</p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="vw-display mt-3 text-4xl md:text-5xl">Signal quality</h1>
              <p className="vw-copy mt-3 max-w-[62ch] text-pretty text-base">
                Signal v2 separates urgency from release type, flags low-confidence intelligence,
                tracks repeated release noise, and shows where persisted rows still need backfill.
              </p>
            </div>
            <Link href="/ops/health" className="vw-button vw-button-secondary">
              Source health
            </Link>
          </div>

          <dl className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Events" value={report.total_events} />
            <Metric label="Legacy rows" value={report.score_version.legacy_rows} />
            <Metric label="Low confidence" value={report.low_confidence_count} />
            <Metric label="Noise clusters" value={report.clustered_noise_groups} />
          </dl>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="vw-shell grid gap-4 lg:grid-cols-3">
          <Panel title="Release classes">
            <RankedRows rows={report.release_classes} />
          </Panel>
          <Panel title="Severity">
            <RankedRows rows={report.severities} />
          </Panel>
          <Panel title="Impact confidence">
            <RankedRows rows={report.impact_confidences} />
          </Panel>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6">
        <div className="vw-shell grid gap-4 lg:grid-cols-2">
          <Panel title="Top watchlist vendors">
            <div className="grid gap-2">
              {report.top_vendors.map((vendor) => (
                <div key={vendor.vendor_slug} className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-[var(--color-ink)]">{vendor.vendor}</span>
                  <span className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
                    {vendor.high_or_critical_count} high · {vendor.total_count} total ·{" "}
                    {vendor.low_confidence_count} low confidence
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Watchlist readiness">
            <dl className="grid gap-2">
              <InlineMetric label="High or critical" value={report.watchlist_ready.high_or_critical_count} />
              <InlineMetric label="Breaking or security" value={report.watchlist_ready.breaking_or_security_count} />
              <InlineMetric label="Routine or patch" value={report.watchlist_ready.routine_or_patch_count} />
              <InlineMetric label="Repeat decay" value={report.repeat_decay_count} />
              <InlineMetric label="Weak rationale" value={report.weak_rationale_count} />
            </dl>
          </Panel>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="vw-shell grid gap-4 lg:grid-cols-3">
          <ExamplePanel title="Low-confidence examples" rows={report.examples.low_confidence} />
          <ExamplePanel title="Repeat-decay examples" rows={report.examples.repeat_decay} />
          <ExamplePanel title="Backfill examples" rows={report.examples.stored_mismatch} />
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--color-canvas)] p-5">
      <dt className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd className="mt-3 font-[var(--font-display)] text-3xl font-semibold tabular-nums text-[var(--color-ink)]">
        {value}
      </dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="vw-panel-flat p-5">
      <h2 className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RankedRows({ rows }: { rows: Array<{ value: string; count: number }> }) {
  return (
    <div className="grid gap-2">
      {rows.map((row) => (
        <div key={row.value} className="flex items-center justify-between gap-4 text-sm">
          <span className="text-[var(--color-ink-soft)]">{row.value}</span>
          <span className="font-[var(--font-mono)] text-[0.6875rem] tabular-nums text-[var(--color-ink-muted)]">
            {row.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-[var(--color-ink-soft)]">{label}</dt>
      <dd className="font-[var(--font-mono)] text-xs tabular-nums text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}

function ExamplePanel({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ id: string; vendor: string; title?: string; release_class?: string; signal_reasons?: string[] }>;
}) {
  return (
    <Panel title={title}>
      {rows.length ? (
        <ul className="grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className="text-sm">
              <Link href={`/events/${row.id}`} className="font-semibold text-[var(--color-ink)] hover:text-[var(--color-signal)]">
                {row.vendor}
              </Link>
              <p className="mt-1 line-clamp-2 text-[var(--color-ink-muted)]">{row.title ?? row.id}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--color-ink-muted)]">No examples in the current public feed.</p>
      )}
    </Panel>
  );
}
