import Link from "next/link";

import { SiteHeader } from "@/components/marketing/site-header";
import { VendorMark } from "@/components/vendor-mark";
import {
  getFeedbackSubmissions,
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
  const [health, queue, feedback] = await Promise.all([
    getSourceHealth(),
    getReviewQueue(),
    getFeedbackSubmissions(),
  ]);

  const counts = {
    healthy: health.filter((e) => e.status === "healthy").length,
    degraded: health.filter((e) => e.status === "degraded").length,
    failing: health.filter((e) => e.status === "failing").length,
    total: health.length,
  };
  const queuePreview = queue.slice(0, 5);
  const feedbackPreview = feedback.slice(0, 5);

  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="border-b border-[var(--color-line)] px-4 pb-10 pt-28 sm:px-6 md:pb-14 md:pt-32">
        <div className="vw-shell">
          <p className="vw-kicker">Admin · Operator console</p>
          <h1 className="vw-display mt-3 text-4xl md:text-5xl">Dashboard</h1>
          <p className="vw-copy mt-3 max-w-[58ch] text-pretty text-base">
            Source health, review queue, and feedback inbox in one place. Open any tile for the full view.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="vw-shell grid gap-6 lg:gap-8">
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
                <p className="vw-kicker">Feedback inbox</p>
                <p className="mt-3 font-[var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  {feedback.length} {feedback.length === 1 ? "submission" : "submissions"}
                </p>
              </div>
              <Link href="/admin/feedback" className="vw-button vw-button-secondary">
                Open inbox
              </Link>
            </header>
            {feedbackPreview.length > 0 ? (
              <ul role="list" className="mt-5 grid gap-2">
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
