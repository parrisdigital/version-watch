import Link from "next/link";

import { SiteHeader } from "@/components/marketing/site-header";

const scoringWeights = [
  { label: "Breaking", weight: 40, axis: "category" },
  { label: "Deprecation", weight: 35, axis: "category" },
  { label: "Security", weight: 35, axis: "category" },
  { label: "Pricing", weight: 25, axis: "category" },
  { label: "Policy", weight: 25, axis: "category" },
  { label: "Model", weight: 20, axis: "category" },
  { label: "API", weight: 18, axis: "category" },
  { label: "SDK", weight: 18, axis: "category" },
  { label: "Infra", weight: 15, axis: "category" },
  { label: "Docs", weight: 5, axis: "category" },
] as const;

const sourceSignals = [
  { label: "Changelog page", weight: 20 },
  { label: "GitHub release", weight: 20 },
  { label: "Blog", weight: 12 },
  { label: "RSS", weight: 10 },
  { label: "Docs page", weight: 8 },
];

const freshnessSteps = [
  { label: "≤ 24h", weight: 15 },
  { label: "≤ 3 days", weight: 10 },
  { label: "≤ 1 week", weight: 5 },
  { label: "> 1 week", weight: 0 },
];

const importanceBands = [
  { label: "Critical", min: 70, detail: "Plan this week", band: "critical" as const },
  { label: "High", min: 50, detail: "Plan this sprint", band: "high" as const },
  { label: "Medium", min: 30, detail: "Know about it", band: "medium" as const },
  { label: "Low", min: 0, detail: "Nice to know", band: "low" as const },
];

const positiveItems = [
  "Official source always linked",
  "Ranked by signal, not popularity",
  "Structured so 12 updates scan in the time of one",
  "Source health surfaced when feeds go dark",
  "Human review for low-confidence parses",
];

const negativeItems = [
  "Not a newsroom — no editorial takes",
  "Not a social feed — no popularity signals",
  "Not a lead-capture product — no tracking readers",
  "Not a replacement for the source",
  "Not padding — every record does real work",
];

export default function AboutPage() {
  return (
    <main className="vw-page">
      <SiteHeader />

      {/* Hero with a sample record on the right */}
      <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 md:pt-32">
        <div aria-hidden="true" className="vw-hero-bg">
          <div className="vw-hero-grid" />
          <div className="vw-hero-glow" />
        </div>

        <div className="vw-shell relative z-10 grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="vw-kicker">About Version Watch</p>
            <h1 className="vw-display mt-4 text-balance text-4xl sm:text-5xl md:text-6xl">
              A public utility for high-signal developer change tracking.
            </h1>
            <p className="vw-copy mt-6 max-w-[68ch] text-lg md:text-xl">
              Release surfaces across the developer ecosystem are inconsistent and noisy. Version Watch
              watches the official ones, compresses each change into a source-linked public record, and ranks
              everything by whether it actually creates follow-up work.
            </p>
          </div>

          <SampleRecord />
        </div>
      </section>

      {/* Four questions */}
      <section className="px-4 py-20 sm:px-6 md:py-24">
        <div className="vw-shell">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="vw-kicker">What the product is</p>
              <h2 className="vw-title mt-4 text-balance text-3xl md:text-4xl">
                Four questions, answered in the same order every time.
              </h2>
            </div>
            <p className="vw-copy max-w-[54ch] text-base">
              Nothing here replaces the vendor&apos;s own writing. The simplified record sits <em>next to</em>{" "}
              the source, not instead of it.
            </p>
          </div>

          <dl className="mt-10 grid gap-px overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                n: "01",
                label: "What changed",
                body: "A one-sentence distillation that reads the same across every vendor — no marketing prose, no release-note theatre.",
              },
              {
                n: "02",
                label: "Why it matters",
                body: "The operational, migration, product, or compliance impact — the kind of sentence an engineering lead posts in Slack.",
              },
              {
                n: "03",
                label: "Who should care",
                body: "The roles likely to touch the change: frontend, backend, mobile, infra, AI, product, security, compliance, growth.",
              },
              {
                n: "04",
                label: "Affected stack",
                body: "Stack context tags — payments, auth, hosting, mobile, ci-cd, agents, database, search — so filter-first scanning works.",
              },
            ].map((item) => (
              <div key={item.n} className="bg-[var(--color-canvas)] p-6">
                <div className="flex items-center gap-2">
                  <span className="font-[var(--font-mono)] text-[0.6875rem] tabular-nums tracking-wider text-[var(--color-signal)]">
                    {item.n}
                  </span>
                  <dt className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
                    {item.label}
                  </dt>
                </div>
                <dd className="mt-4 text-sm leading-relaxed text-[var(--color-ink-soft)]">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Methodology — visualized */}
      <section className="border-t border-[var(--color-line)] px-4 py-20 sm:px-6 md:py-24">
        <div className="vw-shell">
          <div className="flex flex-col gap-4">
            <p className="vw-kicker">Methodology</p>
            <h2 className="vw-title text-balance text-3xl md:text-4xl">
              How a change earns its signal score.
            </h2>
            <p className="vw-copy max-w-[72ch] text-base md:text-lg">
              Each update gets a composite signal score. Four factors stack up; a category cap prevents docs-only
              edits from rising above what they are.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-8">
            <div className="vw-panel p-6">
              <div className="flex items-baseline justify-between">
                <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
                  Category weight
                </p>
                <span className="text-xs text-[var(--color-ink-muted)]">points added per tag</span>
              </div>
              <ul role="list" className="mt-5 grid gap-3">
                {scoringWeights.map((row) => (
                  <li key={row.label} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3">
                    <span className="text-sm text-[var(--color-ink-soft)]">{row.label}</span>
                    <WeightBar value={row.weight} max={40} />
                    <span className="text-right font-[var(--font-mono)] text-xs tabular-nums text-[var(--color-ink)]">
                      +{row.weight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4">
              <div className="vw-panel p-5">
                <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
                  Source authority
                </p>
                <ul role="list" className="mt-4 grid gap-2">
                  {sourceSignals.map((row) => (
                    <li key={row.label} className="grid grid-cols-[1fr_2.5rem] items-center gap-3">
                      <span className="text-sm text-[var(--color-ink-soft)]">{row.label}</span>
                      <span className="text-right font-[var(--font-mono)] text-xs tabular-nums text-[var(--color-ink)]">
                        +{row.weight}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="vw-panel p-5">
                <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
                  Freshness
                </p>
                <ul role="list" className="mt-4 grid gap-2">
                  {freshnessSteps.map((row) => (
                    <li key={row.label} className="grid grid-cols-[1fr_2.5rem] items-center gap-3">
                      <span className="text-sm text-[var(--color-ink-soft)]">{row.label}</span>
                      <span className="text-right font-[var(--font-mono)] text-xs tabular-nums text-[var(--color-ink)]">
                        +{row.weight}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
                  Linked GitHub release: +5 evidence bonus.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-2 md:grid-cols-4">
            {importanceBands.map((band) => (
              <div
                key={band.label}
                className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-center gap-2">
                  <span className={`vw-severity vw-severity-${band.band}`}>
                    <span className="vw-severity-dot" aria-hidden="true" />
                    {band.label}
                  </span>
                </div>
                <p className="mt-3 font-[var(--font-mono)] text-xs tabular-nums text-[var(--color-ink-muted)]">
                  score ≥ {band.min}
                </p>
                <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{band.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Source handling */}
      <section className="border-t border-[var(--color-line)] px-4 py-20 sm:px-6 md:py-24">
        <div className="vw-shell">
          <p className="vw-kicker">Source handling</p>
          <h2 className="vw-title mt-4 max-w-[22ch] text-balance text-3xl md:text-4xl">
            One record per change, always linked to the source.
          </h2>
          <p className="vw-copy mt-5 max-w-[72ch] text-base md:text-lg">
            Version Watch ingests five source shapes. Each poll records a source-health entry so the feed can
            surface gaps rather than silently drop updates.
          </p>

          <ul
            role="list"
            className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
          >
            {[
              {
                label: "Changelog page",
                body: "Hosted vendor changelog sites with versioned entries.",
              },
              {
                label: "GitHub release",
                body: "Tagged releases with release notes attached to a repo.",
              },
              {
                label: "Blog",
                body: "Product or engineering blog posts announcing changes.",
              },
              {
                label: "RSS",
                body: "RSS feeds where the vendor still publishes machine-readable updates.",
              },
              {
                label: "Docs page",
                body: "Documentation pages that are silently edited in place.",
              },
            ].map((source) => (
              <li key={source.label} className="vw-panel-flat p-4">
                <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
                  {source.label}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">{source.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What it is / is not */}
      <section className="border-t border-[var(--color-line)] px-4 py-20 sm:px-6 md:py-24">
        <div className="vw-shell">
          <p className="vw-kicker">Shape of the product</p>
          <h2 className="vw-title mt-4 max-w-[22ch] text-balance text-3xl md:text-4xl">
            What Version Watch is, and what it isn&apos;t.
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="vw-panel p-6">
              <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-green)]">
                It is
              </p>
              <ul role="list" className="mt-4 grid gap-3">
                {positiveItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[var(--color-ink-soft)]">
                    <CheckIcon />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="vw-panel p-6">
              <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-red)]">
                It isn&apos;t
              </p>
              <ul role="list" className="mt-4 grid gap-3">
                {negativeItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[var(--color-ink-soft)]">
                    <XIcon />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/" className="vw-button vw-button-signal">
              See the feed
            </Link>
            <Link href="/vendors" className="vw-button vw-button-secondary">
              Browse tracked vendors
            </Link>
            <Link href="/ops/health" className="vw-button vw-button-ghost">
              Source health
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function WeightBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(4, (value / max) * 100);
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-raised)]">
      <div
        className="h-full rounded-full bg-[var(--color-signal)]"
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="mt-0.5 size-4 shrink-0 text-[var(--color-green)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8.5 L6.5 12 L13 5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="mt-0.5 size-4 shrink-0 text-[var(--color-red)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 4 L12 12 M12 4 L4 12" />
    </svg>
  );
}

function SampleRecord() {
  return (
    <div className="vw-panel relative overflow-hidden p-5">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-line-quiet)] pb-3">
        <span className="font-[var(--font-mono)] text-[0.625rem] uppercase tracking-wider text-[var(--color-signal)]">
          Sample record
        </span>
        <span className="font-[var(--font-mono)] text-[0.625rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
          vw.record.v1
        </span>
      </div>

      <dl className="grid divide-y divide-[var(--color-line-quiet)] text-sm">
        <Row label="Vendor" value="OpenAI" />
        <Row label="Title" value="Deprecation window for legacy responses" />
        <Row label="What changed" value="Clearer migration timing for older response surfaces." />
        <Row
          label="Why it matters"
          value="Teams with wrappers, agents, or internal copilots on earlier patterns need to migrate before the older path becomes drag."
        />
        <Row label="Who should care" value="backend · ai · product" mono />
        <Row label="Affected stack" value="llms · agents · developer-workflow" mono />
        <Row label="Categories" value="deprecation · api" mono />
        <Row
          label="Importance"
          value={
            <span className="vw-severity vw-severity-critical">
              <span className="vw-severity-dot" aria-hidden="true" />
              Critical
            </span>
          }
        />
        <Row label="Signal score" value="78" mono accent />
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-3 py-2.5">
      <dt className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd
        className={`text-sm leading-snug ${
          accent ? "text-[var(--color-signal)] tabular-nums font-semibold" : "text-[var(--color-ink)]"
        } ${mono ? "font-[var(--font-mono)] text-[0.8125rem] tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
