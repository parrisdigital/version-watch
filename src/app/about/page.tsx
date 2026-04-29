import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";

const REPO_URL = "https://github.com/parrisdigital/version-watch";

const RECORD_FIELDS = [
  {
    label: "What changed",
    body: "One sentence. No marketing. The actual change, written the same way whether it came from Apple's PDF or a GitHub release tag.",
  },
  {
    label: "Why it matters",
    body: "The operational, migration, product, or compliance impact. The kind of sentence an engineering lead would write in a Slack post.",
  },
  {
    label: "Who should care",
    body: "Mapped to the people likely to touch it: frontend, backend, mobile, infra, AI, product, security, compliance, growth.",
  },
  {
    label: "Affected stack",
    body: "Context tags like payments, auth, hosting, mobile, ci-cd, agents, database, search. Filter-first scanning works.",
  },
  {
    label: "Importance band",
    body: 'Critical, high, medium, or low. Derived from the signal score. Critical means "plan this week." Low means "good to know."',
  },
  {
    label: "Source trail",
    body: "The official source URL, source type, and (if attached) the GitHub release or repo link. Always verifiable against the original.",
  },
];

const PRODUCT_SHAPE = [
  {
    label: "It is",
    items: [
      "A high-level changelog feed for developers.",
      "A fast way to spot fresh, source-linked platform changes.",
      "A directory of official vendor update surfaces.",
      "A lightweight signal layer on top of the original source.",
    ],
  },
  {
    label: "It is not",
    items: [
      "A replacement for reading the source when details matter.",
      "A social feed sorted by popularity.",
      "A newsroom with commentary or opinion.",
      "A place for hidden summaries without attribution.",
    ],
  },
];

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className} fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="px-4 pb-16 pt-28 sm:px-6 md:pb-20 md:pt-32 lg:pb-24">
        <div className="vw-shell">
          <div className="flex max-w-[58rem] flex-col gap-6">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              About Version Watch
            </p>
            <h1 className="vw-display text-balance text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
              A change-intelligence utility for developers.
            </h1>
            <p className="vw-copy max-w-[58ch] text-pretty text-lg md:text-xl">
              OpenAI changes an API. Stripe writes a blog. Apple drops a PDF. Version Watch reads them all, normalizes the signal, and keeps the source one click away. Open source, free, run for developers.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="vw-hero-primary-cta">
                <Link href="/search">
                  Open the feed
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  <GithubMark className="size-4" />
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] px-4 py-16 sm:px-6 md:py-20">
        <div className="vw-shell grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              Why it exists
            </p>
            <h2 className="vw-title text-balance text-3xl sm:text-4xl">
              Every platform ships releases differently.
            </h2>
          </div>
          <div className="flex flex-col gap-5 max-w-[64ch] text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
            <p>
              Release surfaces across the developer ecosystem are inconsistent. GitHub posts to a tag. Stripe writes a blog. Apple drops a PDF. Vercel buries it in a changelog. Reading them all is a job most developers do not have time for.
            </p>
            <p>
              Version Watch is that job, structured. It polls every official source on a schedule, normalizes each entry into the same six-field record, ranks by signal, and keeps the original source one click away. The same feed renders for humans on this site and for agents through a public API.
            </p>
            <p>
              No newsletter. No social product. No SaaS dashboard. A change-intelligence utility for the platforms a modern developer stack actually runs on.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] px-4 py-16 sm:px-6 md:py-20">
        <div className="vw-shell">
          <div className="flex flex-col gap-3 max-w-[58rem]">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              Anatomy of a record
            </p>
            <h2 className="vw-title text-balance text-3xl sm:text-4xl">
              Every record, the same six fields.
            </h2>
            <p className="max-w-[58ch] text-pretty text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
              Each change is reshaped into the same record so a developer can scan twelve updates in the time it takes to read one vendor blog post.
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
      </section>

      <section className="border-t border-[var(--border)] px-4 py-16 sm:px-6 md:py-20">
        <div className="vw-shell grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              How updates flow
            </p>
            <h2 className="vw-title text-balance text-3xl sm:text-4xl">
              Ingest, classify, review, publish.
            </h2>
          </div>
          <div className="flex flex-col gap-5 max-w-[64ch] text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
            <p>
              Every vendor source is polled on a schedule. GitHub releases, hosted changelog pages, RSS feeds, docs surfaces, product blogs. We fetch the full HTML because vendors edit posts after publishing, and the diff is sometimes the story.
            </p>
            <p>
              Each entry is parsed and normalized into the six-field record. A rules-based classifier tags it with categories, affected stack, and audience. A signal score weighs category severity, source authority, freshness, and evidence. We chose rules over an LLM because we want every score to be reproducible and arguable.
            </p>
            <p>
              Low-confidence candidates wait in a human review queue. Everything else publishes automatically with a full provenance trail. We would rather be slightly slow than confidently wrong.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] px-4 py-16 sm:px-6 md:py-20">
        <div className="vw-shell">
          <div className="flex flex-col gap-3 max-w-[58rem]">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              Boundaries
            </p>
            <h2 className="vw-title text-balance text-3xl sm:text-4xl">
              What it is. What it is not.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {PRODUCT_SHAPE.map((group) => (
              <div key={group.label} className="vw-panel p-6">
                <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--foreground)]">
                  {group.label}
                </p>
                <ul role="list" className="mt-4 flex flex-col gap-3">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-sm leading-relaxed text-[var(--muted-foreground)]"
                    >
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--foreground)]"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] px-4 py-16 sm:px-6 md:py-20">
        <div className="vw-shell grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              Open source
            </p>
            <h2 className="vw-title text-balance text-3xl sm:text-4xl">
              Public, free, built in the open.
            </h2>
          </div>
          <div className="flex flex-col gap-5 max-w-[64ch] text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
            <p>
              Version Watch is open. The repo is public on GitHub. Vendor suggestions, signal corrections, and pull requests are welcome through GitHub issues or the feedback form on this site.
            </p>
            <p>
              Built and maintained by Parris Digital. No paywall, no team plan, no premium tier. The same feed that humans see is the same feed agents read.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild variant="outline">
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  <GithubMark className="size-4" />
                  View on GitHub
                </a>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/feedback">Suggest a vendor</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
