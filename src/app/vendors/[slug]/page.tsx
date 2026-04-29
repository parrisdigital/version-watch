import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";

import { EventCard } from "@/components/event-card";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { VendorMark } from "@/components/vendor-mark";
import { getEventsForVendor, getVendorBySlug } from "@/lib/site-data";

export const dynamic = "force-dynamic";

const sourceTypeLabel: Record<string, string> = {
  github_release: "GitHub release",
  changelog_page: "Changelog",
  docs_page: "Docs",
  blog: "Blog",
  rss: "RSS",
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function countWithinWindow<T extends { publishedAt: string }>(events: T[], windowMs: number) {
  const cutoff = Date.now() - windowMs;
  return events.filter((event) => new Date(event.publishedAt).getTime() >= cutoff).length;
}

export default async function VendorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);

  if (!vendor) {
    notFound();
  }

  const vendorEvents = await getEventsForVendor(slug);
  const sortedEvents = vendorEvents
    .slice()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const latestEvent = sortedEvents[0];
  const recentSevenDayCount = countWithinWindow(sortedEvents, SEVEN_DAYS_MS);

  const isEmpty = sortedEvents.length === 0;

  // Honest summary line in the hero. No four-stat dashboard.
  const summaryParts: string[] = [
    `${sortedEvents.length} ${sortedEvents.length === 1 ? "tracked event" : "tracked events"}`,
  ];
  if (latestEvent) {
    summaryParts.push(`last update ${format(new Date(latestEvent.publishedAt), "MMM d, yyyy")}`);
  }
  if (recentSevenDayCount > 0 && sortedEvents.length > recentSevenDayCount) {
    summaryParts.push(`${recentSevenDayCount} in the last 7 days`);
  }
  summaryParts.push(`${vendor.sources.length} ${vendor.sources.length === 1 ? "source" : "sources"}`);
  const summaryLine = summaryParts.join(" · ");

  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="px-4 pb-10 pt-28 sm:px-6 md:pb-14 md:pt-32">
        <div className="vw-shell">
          <Link
            href="/vendors"
            className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            ← Vendor directory
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <VendorMark vendorSlug={vendor.slug} vendorName={vendor.name} size="xl" />
            <div className="flex flex-col">
              <p className="vw-kicker">Vendor profile</p>
              <h1 className="vw-display mt-2 text-balance text-4xl md:text-5xl">{vendor.name}</h1>
            </div>
          </div>

          <p className="vw-copy mt-6 max-w-[72ch] text-lg">{vendor.description}</p>

          <p className="mt-6 font-mono text-[0.6875rem] uppercase tracking-wider tabular-nums text-[var(--muted-foreground)]">
            {summaryLine}
          </p>
        </div>
      </section>

      <section className="px-4 pb-20 pt-4 sm:px-6">
        <div className="vw-shell grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          <aside className="grid gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="vw-panel p-5">
              <p className="vw-kicker vw-kicker-muted">Reading from</p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                The official surfaces Version Watch polls for {vendor.name}.
              </p>
              <ul role="list" className="mt-4 grid gap-2">
                {vendor.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-3 rounded-md border border-[var(--color-line-quiet)] bg-[var(--color-surface-raised)] p-3 transition-colors hover:border-[var(--color-line-strong)]"
                    >
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-sm font-semibold text-[var(--color-ink)]">
                          {source.name}
                        </span>
                        <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
                          {sourceTypeLabel[source.type] ?? source.type}
                        </span>
                      </span>
                      <svg
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                        className="ml-auto size-3.5 shrink-0 text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-signal)]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3.5 12.5 L12.5 3.5 M5.5 3.5 H12.5 V10.5" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="vw-kicker">Recent changes</p>
                <h2 className="vw-title mt-2 text-2xl">
                  {isEmpty ? "Nothing tracked yet" : "Latest first"}
                </h2>
              </div>
              {!isEmpty ? (
                <Link
                  href={`/search?vendor=${vendor.slug}`}
                  className="vw-button vw-button-secondary"
                >
                  Open in search
                </Link>
              ) : null}
            </div>

            {isEmpty ? (
              <div className="mt-6 vw-panel p-8">
                <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
                  Empty by design
                </p>
                <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-[var(--foreground)]">
                  Version Watch is reading {vendor.sources[0]?.name ?? "the official source"} for{" "}
                  {vendor.name}. No changes have been tracked yet, either because the vendor has not shipped
                  recently or because Version Watch was just added to its watchlist.
                </p>
                {vendor.sources[0] ? (
                  <div className="mt-5">
                    <a
                      href={vendor.sources[0].url}
                      target="_blank"
                      rel="noreferrer"
                      className="vw-button vw-button-secondary"
                    >
                      Open the upstream source
                    </a>
                  </div>
                ) : null}
              </div>
            ) : (
              <ul role="list" className="mt-6 grid gap-4">
                {sortedEvents.map((event) => (
                  <li key={event.id}>
                    <EventCard
                      event={event}
                      compact
                      eventHref={`/events/${event.slug}?fromVendor=${vendor.slug}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
