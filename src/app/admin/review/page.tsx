import Link from "next/link";

import { SiteHeader } from "@/components/marketing/site-header";
import { VendorMark } from "@/components/vendor-mark";
import { getReviewQueue } from "@/lib/site-data";

export const dynamic = "force-dynamic";

const confidenceClass: Record<string, string> = {
  high: "text-[var(--color-green)]",
  medium: "text-[var(--color-high)]",
  low: "text-[var(--color-red)]",
};

export default async function AdminReviewQueuePage() {
  const queue = await getReviewQueue();

  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="border-b border-[var(--color-line)] px-4 pb-10 pt-28 sm:px-6 md:pb-14 md:pt-32">
        <div className="vw-shell flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="vw-kicker">Admin · Review queue</p>
            <h1 className="vw-display mt-3 text-4xl md:text-5xl">Review queue</h1>
            <p className="vw-copy mt-3 max-w-[52ch] text-pretty text-base">
              {queue.length} candidates waiting for review. Low-confidence parses and docs-page revisions land
              here before they hit the public feed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="vw-button vw-button-ghost">
              ← Dashboard
            </Link>
            <Link href="/admin/health" className="vw-button vw-button-secondary">
              Source health
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="vw-shell">
          <div className="vw-panel overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-line)]">
                <tr className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
                  <th className="px-5 py-3 font-medium">Vendor</th>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Published</th>
                  <th className="px-5 py-3 font-medium text-right">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((candidate) => (
                  <tr
                    key={candidate.id}
                    className="border-b border-[var(--color-line-quiet)] last:border-b-0 transition-colors hover:bg-[var(--color-surface-raised)]"
                  >
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2.5">
                        <VendorMark
                          vendorSlug={candidate.vendorSlug}
                          vendorName={candidate.vendorName}
                          size="sm"
                        />
                        <span className="text-sm font-semibold text-[var(--color-ink)]">
                          {candidate.vendorName}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/review/${candidate.id}`}
                        className="text-[var(--color-ink)] transition-colors hover:text-[var(--color-signal)]"
                      >
                        {candidate.title}
                      </Link>
                    </td>
                    <td className="px-5 py-4 font-[var(--font-mono)] text-xs uppercase tracking-wider text-[var(--color-ink-muted)]">
                      {candidate.sourceType.replace("_", " ")}
                    </td>
                    <td className="px-5 py-4 text-[var(--color-ink-muted)]">
                      {candidate.publishedDateLabel}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`font-[var(--font-mono)] text-xs uppercase tracking-wider ${
                          confidenceClass[candidate.parseConfidence] ?? "text-[var(--color-ink-muted)]"
                        }`}
                      >
                        {candidate.parseConfidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
