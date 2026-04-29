import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/marketing/site-header";
import { VendorMark } from "@/components/vendor-mark";
import { getReviewCandidateById } from "@/lib/site-data";
import { approveCandidate, rejectCandidate, suppressCandidate } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminReviewCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await getReviewCandidateById(id);

  if (!candidate) {
    notFound();
  }

  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="px-4 pb-12 pt-28 sm:px-6 md:pb-16 md:pt-32">
        <div className="vw-narrow">
          <Link
            href="/admin/review"
            className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            ← Review queue
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <VendorMark
              vendorSlug={candidate.vendorSlug}
              vendorName={candidate.vendorName}
              size="md"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
                Candidate · {candidate.parseConfidence} confidence
              </span>
              <span className="text-sm font-semibold text-[var(--color-ink)]">
                {candidate.vendorName}
              </span>
            </div>
            <span className="ml-auto font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
              {candidate.publishedDateLabel}
            </span>
          </div>

          <h1 className="vw-title mt-6 text-balance text-3xl md:text-4xl">{candidate.title}</h1>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <section className="vw-panel p-5">
              <h2 className="vw-kicker vw-kicker-muted">Raw candidate</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                {candidate.rawBody}
              </p>
            </section>
            <section className="vw-panel p-5">
              <h2 className="vw-kicker vw-kicker-muted">Review actions</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={approveCandidate}>
                  <input type="hidden" name="rawCandidateId" value={candidate.id} />
                  <button type="submit" className="vw-button vw-button-primary">
                    Approve
                  </button>
                </form>
                <form action={rejectCandidate}>
                  <input type="hidden" name="rawCandidateId" value={candidate.id} />
                  <button
                    type="submit"
                    className="vw-button vw-button-secondary text-[var(--color-red)]"
                  >
                    Reject
                  </button>
                </form>
                <form action={suppressCandidate}>
                  <input type="hidden" name="rawCandidateId" value={candidate.id} />
                  <button
                    type="submit"
                    className="vw-button vw-button-secondary text-[var(--color-signal)]"
                  >
                    Suppress
                  </button>
                </form>
              </div>
              <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
                Review writes run through protected server actions and Convex admin-secret checks.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
