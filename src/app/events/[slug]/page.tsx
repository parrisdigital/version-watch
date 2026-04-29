import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNowStrict } from "date-fns";

import { EventActions } from "@/components/event-actions";
import { SeverityPill } from "@/components/severity-pill";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { VendorMark } from "@/components/vendor-mark";
import { getEventBySlug, getEventsForVendor, type SiteEvent } from "@/lib/site-data";
import type { MockEvent } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const sourceTypeLabel: Record<MockEvent["sourceType"], string> = {
  github_release: "GitHub release",
  changelog_page: "Changelog",
  docs_page: "Docs",
  blog: "Blog",
  rss: "RSS",
};

const searchBackKeys = [
  "query",
  "vendor",
  "topic",
  "since",
  "sourceType",
  "importance",
  // Legacy params kept so old fromSearch URLs still round-trip.
  "category",
  "stack",
] as const;
const importanceBands = new Set(["critical", "high", "medium", "low"]);

function normalize(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

function buildSearchBackHref(searchParams: EventSearchParams) {
  const params = new URLSearchParams();
  for (const key of searchBackKeys) {
    const value = searchParams[key]?.trim();
    if (!value) continue;
    if (key === "importance" && !importanceBands.has(value)) continue;
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function buildCitation(event: SiteEvent, versionWatchUrl: string) {
  const title = event.title.replace(/\s+/g, " ").trim();
  const summary = event.summary.replace(/\s+/g, " ").trim();
  const lines = [
    `[${title}](${event.sourceUrl})`,
    "",
    summary,
    "",
    `(via Version Watch: ${versionWatchUrl})`,
  ];
  return lines.join("\n");
}

function buildBaseUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;
  if (!fromEnv) return "https://versionwatch.dev";
  return /^https?:\/\//i.test(fromEnv) ? fromEnv.replace(/\/$/, "") : `https://${fromEnv}`;
}

type EventSearchParams = {
  fromVendor?: string;
  fromSearch?: string;
  query?: string;
  vendor?: string;
  topic?: string;
  since?: string;
  sourceType?: string;
  importance?: string;
  // Legacy params kept so old fromSearch URLs still round-trip.
  category?: string;
  stack?: string;
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

  const vendorEvents = await getEventsForVendor(event.vendorSlug);
  const currentIndex = vendorEvents.findIndex((entry) => entry.slug === event.slug);
  const newer = currentIndex > 0 ? vendorEvents[currentIndex - 1] : null;
  const older =
    currentIndex >= 0 && currentIndex < vendorEvents.length - 1
      ? vendorEvents[currentIndex + 1]
      : null;

  const publishedDate = new Date(event.publishedAt);
  const relative = formatDistanceToNowStrict(publishedDate, { addSuffix: true });
  const absolute = format(publishedDate, "PPpp");
  const monthLabel = format(publishedDate, "MMM d, yyyy");

  // Sparse-content guard: hide redundant blocks when summary or whatChanged collapses to title.
  const normalizedTitle = normalize(event.title);
  const showSummary = normalize(event.summary) !== normalizedTitle;
  const showWhatChanged =
    normalize(event.whatChanged) !== normalizedTitle &&
    normalize(event.whatChanged) !== normalize(event.summary);
  const isSparse = !showSummary && !showWhatChanged;

  const backHref =
    fromSearch === "true"
      ? buildSearchBackHref(resolvedSearchParams)
      : fromVendor === event.vendorSlug
        ? `/vendors/${event.vendorSlug}`
        : "/";
  const backLabel =
    fromSearch === "true"
      ? "Back to search"
      : fromVendor === event.vendorSlug
        ? `Back to ${event.vendorName}`
        : "Back to home";

  const hostname = safeHostname(event.sourceUrl);
  const baseUrl = buildBaseUrl();
  const versionWatchUrl = `${baseUrl}/events/${event.slug}`;
  const jsonUrl = `/api/v1/updates/${event.slug}`;
  const citation = buildCitation(event, versionWatchUrl);
  const feedbackHref = `/feedback?type=incorrect_summary&url=${encodeURIComponent(`/events/${event.slug}`)}`;

  return (
    <main className="vw-page">
      <SiteHeader />

      <article className="px-4 pb-16 pt-28 sm:px-6 md:pt-32">
        <div className="vw-shell max-w-[72rem]">
          <Link
            href={backHref}
            className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            ← {backLabel}
          </Link>

          {/* Identity row: vendor mark + name + source type + published, single line */}
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href={`/vendors/${event.vendorSlug}`}
              className="group flex items-center gap-3"
              aria-label={`${event.vendorName} vendor page`}
            >
              <VendorMark
                vendorSlug={event.vendorSlug}
                vendorName={event.vendorName}
                size="sm"
              />
              <span className="text-sm font-semibold text-[var(--foreground)] transition-colors group-hover:text-[var(--color-signal)]">
                {event.vendorName}
              </span>
            </Link>
            <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
              {sourceTypeLabel[event.sourceType]}
            </span>
            <span
              className="font-mono text-[0.6875rem] tabular-nums text-[var(--muted-foreground)]"
              title={absolute}
            >
              {relative} · {monthLabel}
            </span>
            <span className="ml-auto">
              <SeverityPill band={event.importanceBand} />
            </span>
          </div>

          {/* Title: first visual peak. */}
          <h1 className="vw-display mt-6 text-balance text-[2.5rem] leading-[1.02] sm:text-5xl md:text-[4rem]">
            {event.title}
          </h1>

          {/* Source strip sits directly under the title. */}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-[var(--color-line-quiet)] py-4">
            {hostname ? (
              <span className="font-mono text-sm text-[var(--muted-foreground)]">
                {hostname}
              </span>
            ) : null}
            {event.sourceName ? (
              <>
                <span aria-hidden="true" className="text-[var(--color-line)]">
                  ·
                </span>
                <span className="text-sm text-[var(--muted-foreground)]">
                  {event.sourceName}
                </span>
              </>
            ) : null}
            <span className="ml-auto flex flex-wrap gap-2">
              <a
                href={event.sourceUrl}
                className="vw-button vw-button-primary"
                target="_blank"
                rel="noreferrer noopener"
              >
                Open official source
              </a>
              {event.githubUrl ? (
                <a
                  href={event.githubUrl}
                  className="vw-button vw-button-secondary"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  GitHub
                </a>
              ) : null}
            </span>
          </div>

          {/* Why it matters: second visual peak. Sized larger than sub-fields. */}
          <section className="mt-10">
            <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
              Why it matters
            </p>
            <p className="mt-3 max-w-[64ch] text-pretty text-xl leading-relaxed text-[var(--foreground)] md:text-2xl">
              {event.whyItMatters}
            </p>
          </section>

          {/* Sub-fields */}
          <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8">
            {showSummary ? (
              <section className="vw-panel-flat p-5 md:col-span-2">
                <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
                  Summary
                </p>
                <p className="mt-3 text-base leading-relaxed text-[var(--color-ink-soft)]">
                  {event.summary}
                </p>
              </section>
            ) : null}
            {showWhatChanged ? (
              <section className="vw-panel-flat p-5 md:col-span-2">
                <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
                  What changed
                </p>
                <p className="mt-3 text-base leading-relaxed text-[var(--color-ink-soft)]">
                  {event.whatChanged}
                </p>
              </section>
            ) : null}
            <section className="vw-panel-flat p-5">
              <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
                Who should care
              </p>
              <ul role="list" className="mt-3 flex flex-wrap gap-1.5">
                {event.whoShouldCare.map((item) => (
                  <li key={item} className="vw-tag vw-tag-mono">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
            <section className="vw-panel-flat p-5">
              <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
                Affected stack
              </p>
              <ul role="list" className="mt-3 flex flex-wrap gap-1.5">
                {event.affectedStack.map((item) => (
                  <li key={item} className="vw-tag vw-tag-mono">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Categories */}
          <div className="mt-10">
            <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
              Categories
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {event.categories.map((category) => (
                <span key={category} className="vw-tag vw-tag-mono">
                  {category}
                </span>
              ))}
            </div>
          </div>

          {/* Source verify panel */}
          <section className="mt-12 vw-panel p-6 md:p-7">
            <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
              Verify against source
            </p>
            <p className="vw-title mt-3 text-pretty text-lg">
              {event.sourceTitle ?? event.title}
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              From{" "}
              <span className="text-[var(--foreground)]">
                {event.sourceName ?? "the official release surface"}
              </span>
              {hostname ? (
                <>
                  {" "}at{" "}
                  <span className="font-mono text-[var(--foreground)]">{hostname}</span>
                </>
              ) : null}
              . We do not paraphrase without showing our work.
              {isSparse ? " This record has only a title, so the source is the canonical version." : ""}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={event.sourceUrl}
                className="vw-button vw-button-secondary"
                target="_blank"
                rel="noreferrer noopener"
              >
                Open official source
              </a>
              <EventActions citation={citation} jsonUrl={jsonUrl} />
              <Link href={feedbackHref} className="vw-button vw-button-ghost">
                Report this update
              </Link>
            </div>
          </section>

          {/* Prev / next within vendor */}
          {newer || older ? (
            <nav
              aria-label={`More from ${event.vendorName}`}
              className="mt-12 grid gap-3 border-t border-[var(--color-line)] pt-6 md:grid-cols-2 md:gap-6"
            >
              <div>
                {newer ? (
                  <Link
                    href={`/events/${newer.slug}?fromVendor=${event.vendorSlug}`}
                    className="group flex flex-col gap-1 rounded-md p-3 transition-colors hover:bg-[var(--color-surface-raised)]"
                  >
                    <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
                      ← Newer from {event.vendorName}
                    </span>
                    <span className="text-sm text-[var(--foreground)] transition-colors group-hover:text-[var(--color-signal)]">
                      {newer.title}
                    </span>
                  </Link>
                ) : null}
              </div>
              <div className="md:text-right">
                {older ? (
                  <Link
                    href={`/events/${older.slug}?fromVendor=${event.vendorSlug}`}
                    className="group flex flex-col gap-1 rounded-md p-3 transition-colors hover:bg-[var(--color-surface-raised)] md:items-end"
                  >
                    <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
                      Older from {event.vendorName} →
                    </span>
                    <span className="text-sm text-[var(--foreground)] transition-colors group-hover:text-[var(--color-signal)]">
                      {older.title}
                    </span>
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
