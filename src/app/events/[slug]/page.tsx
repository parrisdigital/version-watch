import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNowStrict } from "date-fns";

import { SeverityPill } from "@/components/severity-pill";
import { SiteHeader } from "@/components/marketing/site-header";
import { RelevanceSignalForm } from "@/components/relevance-signal-form";
import { VendorMark } from "@/components/vendor-mark";
import { deriveSignalMetadata, releaseClassLabel } from "@/lib/classification/signal";
import { getEventBySlug } from "@/lib/site-data";
import type { MockEvent } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const sourceTypeLabel: Record<MockEvent["sourceType"], string> = {
  github_release: "GitHub Release",
  changelog_page: "Changelog",
  docs_page: "Docs",
  blog: "Blog",
  rss: "RSS",
};

const searchBackKeys = ["query", "vendor", "category", "stack", "importance"] as const;
const importanceBands = new Set(["critical", "high", "medium", "low"]);

function normalize(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

function buildSearchBackHref(searchParams: EventSearchParams) {
  const params = new URLSearchParams();

  for (const key of searchBackKeys) {
    const value = searchParams[key]?.trim();

    if (!value) {
      continue;
    }

    if (key === "importance" && !importanceBands.has(value)) {
      continue;
    }

    params.set(key, value);
  }

  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

type EventSearchParams = {
  fromVendor?: string;
  fromSearch?: string;
  query?: string;
  vendor?: string;
  category?: string;
  stack?: string;
  importance?: string;
};

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<EventSearchParams>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const { fromVendor, fromSearch } = resolvedSearchParams;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const publishedDate = new Date(event.publishedAt);
  const relative = formatDistanceToNowStrict(publishedDate, { addSuffix: true });
  const absolute = format(publishedDate, "PPpp");
  const signal = deriveSignalMetadata(event);
  const displayTitle = event.scoreVersion === "v2" ? event.title : signal.displayTitle;
  const displayWhyItMatters = event.scoreVersion === "v2" ? event.whyItMatters : signal.whyItMatters;
  const displaySeverity = event.scoreVersion === "v2" ? event.importanceBand : signal.importanceBand;
  const displayScore = event.computedScore ?? signal.signalScore;
  const displayTopicTags = event.topicTags?.length ? event.topicTags : signal.topicTags;
  const displayReleaseClass = event.releaseClass ?? signal.releaseClass;
  const displayCategoryTags = Array.from(new Set([...event.categories, ...displayTopicTags]));

  // Graceful fallback for sparse events where title = summary = whatChanged.
  const normalizedTitle = normalize(displayTitle);
  const showSummary = normalize(event.summary) !== normalizedTitle;
  const showWhatChanged =
    normalize(event.whatChanged) !== normalizedTitle && normalize(event.whatChanged) !== normalize(event.summary);
  const backHref =
    fromSearch === "true"
      ? buildSearchBackHref(resolvedSearchParams)
      : fromVendor === event.vendorSlug
        ? `/vendors/${event.vendorSlug}`
        : "/";
  const feedbackHref = `/feedback?type=incorrect_summary&url=${encodeURIComponent(`/events/${event.slug}`)}`;

  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="px-4 pb-16 pt-28 sm:px-6 md:pt-32">
        <div className="vw-shell max-w-[72rem]">
          <Link
            href={backHref}
            className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            ← Back to feed
          </Link>

          {/* Editorial vendor identity — large mark, confident type, metadata rail on the right */}
          <div className="mt-8 grid gap-6 border-b border-[var(--color-line)] pb-8 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
            <Link
              href={`/vendors/${event.vendorSlug}`}
              className="group flex items-center gap-5"
              aria-label={`${event.vendorName} vendor page`}
            >
              <VendorMark
                vendorSlug={event.vendorSlug}
                vendorName={event.vendorName}
                size="xl"
                className="transition-transform group-hover:scale-[1.02]"
              />
              <span className="flex flex-col leading-none">
                <span className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-signal)]">
                  {sourceTypeLabel[event.sourceType]}
                </span>
                <span className="mt-2 font-[var(--font-display)] text-[2rem] font-semibold leading-none tracking-tight text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-signal)]">
                  {event.vendorName}
                </span>
              </span>
            </Link>

            <dl className="grid grid-cols-3 gap-6 sm:justify-self-end sm:text-right">
              <MetaRail label="Severity">
                <SeverityPill band={displaySeverity} />
              </MetaRail>
              <MetaRail label="Published" title={absolute}>
                <span className="font-[var(--font-display)] text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                  {relative}
                </span>
                <span className="mt-1 block font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
                  {format(publishedDate, "MMM d, yyyy")}
                </span>
              </MetaRail>
              <MetaRail label="Signal">
                <span className="font-[var(--font-display)] text-2xl font-semibold tabular-nums text-[var(--color-signal)]">
                  {displayScore}
                </span>
              </MetaRail>
            </dl>
          </div>

          <h1 className="vw-display mt-10 text-balance text-[2.5rem] leading-[1.02] sm:text-5xl md:text-[4rem]">
            {displayTitle}
          </h1>

          {showSummary ? (
            <p className="vw-copy mt-6 text-xl md:text-2xl">{event.summary}</p>
          ) : null}

          <div className="vw-panel mt-10 p-6 md:p-7">
            <p className="vw-kicker vw-kicker-muted">Official detail</p>
            <p className="vw-title mt-3 text-pretty text-lg">{event.sourceTitle ?? event.title}</p>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              From{" "}
              <span className="text-[var(--color-ink-soft)]">
                {event.sourceSurfaceName ?? event.sourceName ?? "Official release surface"}
              </span>
              . The simplified record can be checked against the original wording.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={event.sourceUrl}
                className="vw-button vw-button-primary"
                target="_blank"
                rel="noreferrer"
              >
                Open official detail
              </a>
              {event.sourceSurfaceUrl && event.sourceSurfaceUrl !== event.sourceUrl ? (
                <a
                  href={event.sourceSurfaceUrl}
                  className="vw-button vw-button-secondary"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open tracked source
                </a>
              ) : null}
              {event.githubUrl ? (
                <a
                  href={event.githubUrl}
                  className="vw-button vw-button-secondary"
                  target="_blank"
                  rel="noreferrer"
                >
                  View on GitHub
                </a>
              ) : null}
              <Link href={feedbackHref} className="vw-button vw-button-ghost">
                Report this update
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {showWhatChanged ? <DetailBlock label="What changed" body={event.whatChanged} /> : null}
            <DetailBlock label="Why it matters" body={displayWhyItMatters} />
            <DetailList label="Who should care" items={event.whoShouldCare} />
            <DetailList label="Affected stack" items={event.affectedStack} />
          </div>

          <div className="mt-10">
            <p className="vw-kicker vw-kicker-muted">Categories</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="vw-tag vw-tag-mono">{releaseClassLabel(displayReleaseClass)}</span>
              {displayCategoryTags.map((category) => (
                <span key={category} className="vw-tag vw-tag-mono">
                  {category}
                </span>
              ))}
            </div>
          </div>

          <RelevanceSignalForm eventId={event.slug} />
        </div>
      </section>
    </main>
  );
}

function MetaRail({
  label,
  title,
  children,
}: {
  label: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start sm:items-end" title={title}>
      <dt className="font-[var(--font-mono)] text-[0.625rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd className="mt-2 flex flex-col items-start sm:items-end">{children}</dd>
    </div>
  );
}

function DetailBlock({ label, body }: { label: string; body: string }) {
  return (
    <section className="vw-panel-flat p-5">
      <h2 className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
        {label}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-[var(--color-ink-soft)]">{body}</p>
    </section>
  );
}

function DetailList({ label, items }: { label: string; items: string[] }) {
  return (
    <section className="vw-panel-flat p-5">
      <h2 className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
        {label}
      </h2>
      <ul role="list" className="mt-3 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item} className="vw-tag vw-tag-mono">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
