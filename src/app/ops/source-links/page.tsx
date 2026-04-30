import Link from "next/link";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/marketing/site-header";
import { requireAdminSession } from "@/lib/admin/require-session";
import { getSourceLinkQualityReport } from "@/lib/site-data";
import type { SourceLinkQualityRow } from "@/lib/source-link-quality";

export const dynamic = "force-dynamic";

const statusStyle: Record<SourceLinkQualityRow["audit_status"], { label: string; dot: string; text: string }> = {
  ok: {
    label: "Clean",
    dot: "bg-[var(--color-green)]",
    text: "text-[var(--color-green)]",
  },
  warning: {
    label: "Warning",
    dot: "bg-[var(--color-signal)]",
    text: "text-[var(--color-signal)]",
  },
  error: {
    label: "Error",
    dot: "bg-[var(--color-red)]",
    text: "text-[var(--color-red)]",
  },
  inactive: {
    label: "Inactive",
    dot: "bg-[var(--color-ink-muted)]",
    text: "text-[var(--color-ink-muted)]",
  },
};

const confidenceStyle: Record<SourceLinkQualityRow["parser_confidence"], string> = {
  high: "text-[var(--color-green)]",
  medium: "text-[var(--color-signal)]",
  low: "text-[var(--color-red)]",
};

export default async function OpsSourceLinksPage() {
  await requireAdminSession("/ops/source-links", { loginPath: "/review/login" });

  const report = await getSourceLinkQualityReport();

  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="border-b border-[var(--color-line)] px-4 pb-10 pt-28 sm:px-6 md:pb-14 md:pt-32">
        <div className="vw-shell">
          <p className="vw-kicker">Operations</p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="vw-display mt-3 text-4xl md:text-5xl">Source link quality</h1>
              <p className="vw-copy mt-3 max-w-[66ch] text-pretty text-base">
                Internal audit view for exact official detail links, tracked source surfaces, parser confidence,
                source health, and link warnings. This keeps the public API trustworthy before notifications scale.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/ops/health" className="vw-button vw-button-secondary">
                Source health
              </Link>
              <Link href="/ops/signal" className="vw-button vw-button-ghost">
                Signal quality
              </Link>
            </div>
          </div>

          <dl className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Checked updates" value={report.checked_updates} />
            <Metric label="Clean sources" value={report.ok_count} />
            <Metric label="Warnings" value={report.warning_count} />
            <Metric label="Errors" value={report.error_count} />
          </dl>

          <p className="mt-4 font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
            Last audit · {report.checked_at} · {report.checked_sources} sources across {report.checked_vendors} vendors
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="vw-shell">
          {report.findings.length ? (
            <div className="vw-panel-flat mb-6 p-5">
              <h2 className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-red)]">
                Active findings
              </h2>
              <ul className="mt-4 grid gap-3">
                {report.findings.slice(0, 8).map((finding) => (
                  <li key={`${finding.update_id}-${finding.source_url}`} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[var(--color-ink)]">{finding.vendor_slug}</span>
                      <span className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-red)]">
                        {finding.level}
                      </span>
                    </div>
                    <p className="mt-1 text-[var(--color-ink-muted)]">{finding.reason}</p>
                    <a
                      href={finding.source_url}
                      className="mt-1 block break-all font-[var(--font-mono)] text-xs text-[var(--color-signal)]"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {finding.source_url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ul role="list" className="grid gap-2">
            {report.rows.map((row) => (
              <SourceRow key={`${row.vendor_slug}-${row.source_url}`} row={row} />
            ))}
          </ul>
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

function SourceRow({ row }: { row: SourceLinkQualityRow }) {
  const style = statusStyle[row.audit_status];
  const confidenceClass = confidenceStyle[row.parser_confidence];

  return (
    <li className="vw-panel-flat grid gap-4 p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/vendors/${row.vendor_slug}`} className="text-sm font-semibold text-[var(--color-ink)] hover:text-[var(--color-signal)]">
            {row.vendor_name}
          </Link>
          <span className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
            {row.source_type}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{row.source_name}</p>
        <a
          href={row.source_url}
          className="mt-1 block break-all font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-signal)]"
          target="_blank"
          rel="noreferrer"
        >
          {row.source_url}
        </a>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2">
        <InlineMetric label="Parser confidence">
          <span className={confidenceClass}>{row.parser_confidence}</span>
        </InlineMetric>
        <InlineMetric label="Recent updates">{row.update_count}</InlineMetric>
        <InlineMetric label="Lifecycle">{row.lifecycle_state}</InlineMetric>
        <InlineMetric label="Health">{row.health_status}</InlineMetric>
        <InlineMetric label="Last checked">{row.last_checked_label}</InlineMetric>
        <InlineMetric label="Last success">{row.last_success_label}</InlineMetric>
      </dl>

      <div className="flex flex-col gap-2 lg:min-w-32 lg:items-end">
        <span className="flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
          <span className={`font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider ${style.text}`}>
            {style.label}
          </span>
        </span>
        <span className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {row.error_count} errors · {row.warning_count} warnings
        </span>
        {row.last_error_code ? (
          <span className="max-w-64 text-right font-[var(--font-mono)] text-[0.6875rem] text-[var(--color-red)]">
            {row.last_error_code}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function InlineMetric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-[var(--font-mono)] text-[0.625rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd className="mt-1 truncate text-xs font-semibold text-[var(--color-ink-soft)]">{children}</dd>
    </div>
  );
}
