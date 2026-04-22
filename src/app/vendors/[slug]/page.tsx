import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";

import { EventCard } from "@/components/event-card";
import { SiteHeader } from "@/components/marketing/site-header";
import { VendorMark } from "@/components/vendor-mark";
import { getEventsForVendor, getVendorBySlug } from "@/lib/site-data";

export const dynamic = "force-dynamic";

const sourceTypeLabel: Record<string, string> = {
  github_release: "GitHub Release",
  changelog_page: "Changelog",
  docs_page: "Docs",
  blog: "Blog",
  rss: "RSS",
};

export default async function VendorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);

  if (!vendor) {
    notFound();
  }

  const vendorEvents = await getEventsForVendor(slug);
  const latestEvent = vendorEvents[0];
  const highSignalCount = vendorEvents.filter((event) => {
    return event.importanceBand === "critical" || event.importanceBand === "high";
  }).length;

  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="px-4 pb-8 pt-28 sm:px-6 md:pt-32">
        <div className="vw-shell">
          <Link
            href="/vendors"
            className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            ← Vendor directory
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <VendorMark vendorSlug={vendor.slug} vendorName={vendor.name} size="xl" />
            <div className="flex flex-col">
              <p className="vw-kicker vw-kicker-muted">Vendor profile</p>
              <h1 className="vw-display mt-2 text-balance text-4xl md:text-5xl">{vendor.name}</h1>
            </div>
          </div>

          <p className="vw-copy mt-6 max-w-[72ch] text-lg">{vendor.description}</p>
        </div>
      </section>

      <section className="px-4 pb-20 pt-8 sm:px-6">
        <div className="vw-shell grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          <aside className="grid gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="vw-panel p-5">
              <p className="vw-kicker vw-kicker-muted">At a glance</p>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Tracked events" value={vendorEvents.length} />
                <Stat label="High signal" value={highSignalCount} accent />
                <Stat label="Sources" value={vendor.sources.length} />
                <Stat
                  label="Last update"
                  value={latestEvent ? format(new Date(latestEvent.publishedAt), "MMM d") : "—"}
                  isString
                />
              </dl>
            </div>

            <div className="vw-panel p-5">
              <p className="vw-kicker vw-kicker-muted">Official sources</p>
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
                        <span className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
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
                <h2 className="vw-title mt-2 text-2xl">Latest first</h2>
              </div>
              <Link href={`/search?vendor=${vendor.slug}`} className="vw-button vw-button-secondary">
                Open in search
              </Link>
            </div>

            <div className="mt-6 grid gap-4">
              {vendorEvents.length > 0 ? (
                vendorEvents.map((event) => <EventCard key={event.id} event={event} compact />)
              ) : (
                <p className="vw-panel p-6 text-sm text-[var(--color-ink-muted)]">
                  No tracked events yet for {vendor.name}.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
  isString,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  isString?: boolean;
}) {
  return (
    <div className="rounded-md border border-[var(--color-line-quiet)] bg-[var(--color-surface-raised)] p-3">
      <dt className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd
        className={`mt-1.5 font-[var(--font-display)] text-2xl font-semibold tracking-tight tabular-nums ${
          accent ? "text-[var(--color-signal)]" : "text-[var(--color-ink)]"
        }`}
      >
        {isString ? value : (value as number).toLocaleString()}
      </dd>
    </div>
  );
}
