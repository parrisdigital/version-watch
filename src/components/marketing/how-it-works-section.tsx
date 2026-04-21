import Link from "next/link";

import { Button } from "@/components/ui/button";

const PIPELINE_STEPS = [
  {
    index: "01",
    title: "Ingest",
    body: "Every vendor source — GitHub releases, hosted changelog pages, RSS feeds, docs surfaces, product blogs — is polled on a schedule and fetched with full-fidelity HTML.",
  },
  {
    index: "02",
    title: "Parse",
    body: "Each raw entry is normalized into a structured record: title, published timestamp, source type, canonical URL, and where possible the linked GitHub release.",
  },
  {
    index: "03",
    title: "Classify & score",
    body: "A rules-based classifier tags each update with categories, affected stack, and audience. A signal score weighs category severity, source authority, freshness, and evidence.",
  },
  {
    index: "04",
    title: "Review",
    body: "Uncertain or low-confidence candidates enter a human review queue before they're published. High-confidence items publish automatically with a provenance trail.",
  },
  {
    index: "05",
    title: "Publish",
    body: "The public feed surfaces each update with an importance band, a compact summary, a \"why it matters\" rationale, a \"who should care\" audience, and the original source link.",
  },
];

const RECORD_FIELDS = [
  {
    label: "What changed",
    body: "A one-sentence, no-marketing distillation of the actual change, written to read the same across every vendor.",
  },
  {
    label: "Why it matters",
    body: "The operational, migration, product, or compliance impact — the kind of sentence an engineering lead would write in a Slack post.",
  },
  {
    label: "Who should care",
    body: "Mapped to the people likely to touch it: frontend, backend, mobile, infra, AI, product, security, compliance, growth.",
  },
  {
    label: "Affected stack",
    body: "Context tags like payments, auth, hosting, mobile, ci-cd, agents, database, search — so filter-first scanning works.",
  },
  {
    label: "Importance band",
    body: "Critical · high · medium · low, derived from the signal score. Critical means \"plan this week.\" Low means \"good to know.\"",
  },
  {
    label: "Source trail",
    body: "The official source URL, source type, and — if attached — the GitHub release or repo link. Always verifiable against the original.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-t border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[4fr_6fr] lg:gap-16">
          <div className="flex flex-col gap-6">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              How it works
            </p>
            <h2 className="max-w-[20ch] text-balance text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              An ingestion pipeline built for scanning, not scrolling.
            </h2>
            <p className="max-w-[52ch] text-pretty text-base text-[var(--muted-foreground)]">
              Release surfaces across the developer ecosystem are inconsistent: GitHub release
              pages, WordPress blogs, hosted changelog sites, bare RSS, docs pages with silent
              in-place edits. Version Watch normalizes all of them into one public record — without
              hiding the source that produced it.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/search">Explore the feed</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/vendors">See all vendors</Link>
              </Button>
            </div>
          </div>

          <ol
            role="list"
            className="relative grid gap-3 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-[var(--border)]"
          >
            {PIPELINE_STEPS.map((step) => (
              <li key={step.index} className="relative flex gap-4">
                <span
                  aria-hidden="true"
                  className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] font-mono text-[0.6875rem] font-semibold tracking-wider text-[var(--foreground)]"
                >
                  {step.index}
                </span>
                <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-24 border-t border-[var(--border)] pt-16 lg:mt-32 lg:pt-20">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-3">
              <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                Anatomy of a record
              </p>
              <h2 className="max-w-[20ch] text-balance text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
                What ships in every public update.
              </h2>
            </div>
            <p className="max-w-[52ch] text-pretty text-base text-[var(--muted-foreground)]">
              Each change is reshaped into the same six-field record so a developer can scan twelve
              updates in the time it takes to read one vendor blog post.
            </p>
          </div>

          <dl className="mt-10 grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] md:grid-cols-2 lg:grid-cols-3">
            {RECORD_FIELDS.map((field) => (
              <div key={field.label} className="bg-[var(--card)] p-6">
                <dt className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--foreground)]">
                  {field.label}
                </dt>
                <dd className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {field.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
