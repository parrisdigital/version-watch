import Link from "next/link";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/marketing/site-header";
import { VendorMark } from "@/components/vendor-mark";
import { requireAdminSession } from "@/lib/admin/require-session";
import {
  getFeedbackSubmissions,
  getRelevanceSignals,
  getReviewQueue,
  getSourceHealth,
} from "@/lib/site-data";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  suggest_vendor: "Suggest vendor",
  missing_update: "Missing update",
  wrong_signal: "Wrong signal",
  incorrect_summary: "Incorrect summary",
  general: "General",
};

const STATUS_TEXT: Record<string, string> = {
  healthy: "text-[var(--color-green)]",
  degraded: "text-[var(--color-high)]",
  failing: "text-[var(--color-red)]",
};

export default async function AdminDashboardPage() {
  await requireAdminSession("/admin");

  const [health, queue, feedback, relevance] = await Promise.all([
    getSourceHealth(),
    getReviewQueue(),
    getFeedbackSubmissions(),
    getRelevanceSignals(),
  ]);

  const counts = {
    healthy: health.filter((e) => e.status === "healthy").length,
    degraded: health.filter((e) => e.status === "degraded").length,
    failing: health.filter((e) => e.status === "failing").length,
    total: health.length,
  };
  const queuePreview = queue.slice(0, 5);
  const feedbackPreview = feedback.slice(0, 5);
  const relevancePreview = relevance.slice(0, 5);

  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="border-b border-[var(--color-line)] px-4 pb-10 pt-28 sm:px-6 md:pb-14 md:pt-32">
        <div className="vw-shell">
          <p className="vw-kicker">Admin · Operator console</p>
          <h1 className="vw-display mt-3 text-4xl md:text-5xl">Dashboard</h1>
          <p className="vw-copy mt-3 max-w-[58ch] text-pretty text-base">
            Source health, source link quality, signal quality, feedback, and relevance review in one place.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="vw-shell grid gap-6 lg:gap-8">
          <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label="Admin operations">
            <AdminTile href="/admin/health" label="Source health" value={`${counts.total} sources`} />
            <AdminTile href="/ops/source-links" label="Source link quality" value="Audit" />
            <AdminTile href="/ops/signal" label="Signal quality" value="Report" />
            <AdminTile
              href="/admin/feedback#feedback"
              label="Feedback"
              value={`${feedback.length} ${feedback.length === 1 ? "item" : "items"}`}
            />
            <AdminTile
              href="/admin/feedback#relevance"
              label="Relevance"
              value={`${relevance.length} ${relevance.length === 1 ? "signal" : "signals"}`}
            />
          </nav>

          <article className="vw-panel p-6 md:p-7">
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="vw-kicker">Source health</p>
                <p className="mt-3 font-[var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  <span className={STATUS_TEXT.healthy}>{counts.healthy} healthy</span>
                  <span className="mx-2 text-[var(--muted-foreground)]">·</span>
                  <span className={STATUS_TEXT.degraded}>{counts.degraded} degraded</span>
                  <span className="mx-2 text-[var(--muted-foreground)]">·</span>
                  <span className={STATUS_TEXT.failing}>{counts.failing} failing</span>
                </p>
                <p className="mt-1 font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
                  {counts.total} active sources
                </p>
              </div>
              <Link href="/admin/health" className="vw-button vw-button-secondary">
                Open full view
              </Link>
            </header>
          </article>

          <article className="vw-panel p-6 md:p-7">
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="vw-kicker">Review queue</p>
                <p className="mt-3 font-[var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  {queue.length} {queue.length === 1 ? "candidate" : "candidates"} pending
                </p>
              </div>
              <Link href="/admin/review" className="vw-button vw-button-secondary">
                Open full queue
              </Link>
            </header>
            {queuePreview.length > 0 ? (
              <ul role="list" className="mt-5 grid gap-2">
                {queuePreview.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/review/${c.id}`}
                      className="vw-panel-flat flex flex-wrap items-center gap-3 p-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--color-surface-raised)]"
                    >
                      <VendorMark
                        vendorSlug={c.vendorSlug}
                        vendorName={c.vendorName}
                        size="sm"
                      />
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        {c.vendorName}
                      </span>
                      <span className="hidden truncate text-xs text-[var(--muted-foreground)] sm:inline">
                        {c.title}
                      </span>
                      <span className="ml-auto font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
                        {c.parseConfidence}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
                No candidates awaiting review.
              </p>
            )}
          </article>

          <article className="vw-panel p-6 md:p-7">
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="vw-kicker">Feedback & relevance</p>
                <p className="mt-3 font-[var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  {feedback.length} feedback · {relevance.length} relevance
                </p>
              </div>
              <Link href="/admin/feedback" className="vw-button vw-button-secondary">
                Open inbox
              </Link>
            </header>
            {feedbackPreview.length > 0 || relevancePreview.length > 0 ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <PreviewColumn title="Feedback">
                  {feedbackPreview.length > 0 ? (
                    <ul role="list" className="grid gap-2">
                      {feedbackPreview.map((entry) => (
                        <li
                          key={entry._id}
                          className="vw-panel-flat flex flex-wrap items-center gap-3 p-3"
                        >
                          <span className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
                            {TYPE_LABEL[entry.type] ?? entry.type}
                          </span>
                          <span className="hidden truncate text-sm text-[var(--foreground)] sm:inline">
                            {entry.message}
                          </span>
                          <span className="ml-auto font-[var(--font-mono)] text-[0.6875rem] tabular-nums text-[var(--muted-foreground)]">
                            {new Date(entry.createdAt).toISOString().slice(0, 10)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyPreview text="No feedback submissions." />
                  )}
                </PreviewColumn>

                <PreviewColumn title="Relevance">
                  {relevancePreview.length > 0 ? (
                    <ul role="list" className="grid gap-2">
                      {relevancePreview.map((entry) => (
                        <li
                          key={entry._id}
                          className="vw-panel-flat flex flex-wrap items-center gap-3 p-3"
                        >
                          <span className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-high)]">
                            {entry.signalLabel}
                          </span>
                          <span className="hidden truncate text-sm text-[var(--foreground)] sm:inline">
                            {entry.vendorName} · {entry.eventTitle}
                          </span>
                          <span className="ml-auto font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
                            {entry.areaLabel}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyPreview text="No relevance signals." />
                  )}
                </PreviewColumn>
              </div>
            ) : (
              <p className="mt-5 font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
                Inbox is empty.
              </p>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}

function AdminTile({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link
      href={href}
      className="vw-panel-flat p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--color-surface-raised)]"
    >
      <span className="block font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </span>
      <span className="mt-2 block font-[var(--font-display)] text-lg font-semibold tracking-tight text-[var(--foreground)]">
        {value}
      </span>
    </Link>
  );
}

function PreviewColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyPreview({ text }: { text: string }) {
  return (
    <p className="vw-panel-flat p-3 font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
      {text}
    </p>
  );
}
