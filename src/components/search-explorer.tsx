"use client";

import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import { startTransition, useDeferredValue, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { EventCard } from "@/components/event-card";
import { SeverityPill } from "@/components/severity-pill";
import { VendorMark } from "@/components/vendor-mark";
import { filterEvents, getSearchFacets, type SearchFilters } from "@/lib/search/filter-events";
import type { ImportanceBand, VendorRecord } from "@/lib/mock-data";
import type { SiteEvent } from "@/lib/site-data";

type SearchExplorerProps = {
  events: SiteEvent[];
  vendors: VendorRecord[];
  initialFilters: SearchFilters;
};

function toQueryString(filters: SearchFilters) {
  const params = new URLSearchParams();
  if (filters.query?.trim()) params.set("query", filters.query.trim());
  if (filters.vendor) params.set("vendor", filters.vendor);
  if (filters.category) params.set("category", filters.category);
  if (filters.stack) params.set("stack", filters.stack);
  if (filters.importance) params.set("importance", filters.importance);
  return params.toString();
}

function StatCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: boolean }) {
  return (
    <div className="bg-[var(--color-canvas)] p-4">
      <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
        {label}
      </p>
      <p
        className={`mt-2 font-[var(--font-display)] text-2xl font-semibold tracking-tight tabular-nums ${
          accent ? "text-[var(--color-signal)]" : "text-[var(--color-ink)]"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{detail}</p>
    </div>
  );
}

function FilterSection({
  title,
  value,
  options,
  onSelect,
}: {
  title: string;
  value: string;
  options: Array<{ value: string; label: string; count: number }>;
  onSelect: (nextValue: string) => void;
}) {
  return (
    <section className="vw-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
          {title}
        </h2>
        {value ? (
          <button
            type="button"
            onClick={() => onSelect("")}
            className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(isActive ? "" : option.value)}
              className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                isActive
                  ? "border-[var(--color-signal)] bg-[var(--color-signal)] text-[var(--color-canvas)]"
                  : "border-[var(--color-line-quiet)] bg-[var(--color-surface)] text-[var(--color-ink-soft)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]"
              }`}
            >
              <span>{option.label}</span>
              <span className="ml-1.5 font-[var(--font-mono)] text-[0.625rem] tabular-nums opacity-70">
                {option.count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function SearchExplorer({ events, vendors, initialFilters }: SearchExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialFilters.query ?? "");
  const [vendor, setVendor] = useState(initialFilters.vendor ?? "");
  const [category, setCategory] = useState(initialFilters.category ?? "");
  const [stack, setStack] = useState(initialFilters.stack ?? "");
  const [importance, setImportance] = useState<ImportanceBand | "">(initialFilters.importance ?? "");
  const deferredQuery = useDeferredValue(query);
  const facets = getSearchFacets(events);
  const filteredEvents = filterEvents(events, {
    query: deferredQuery,
    vendor,
    category,
    stack,
    importance,
  });
  const featuredEvent = filteredEvents[0] ?? null;
  const remainingEvents = featuredEvent ? filteredEvents.slice(1) : [];
  const highSignalCount = filteredEvents.filter((event) => {
    return event.importanceBand === "critical" || event.importanceBand === "high";
  }).length;
  const vendorCount = new Set(filteredEvents.map((event) => event.vendorSlug)).size;
  const activeFilterCount = [query.trim(), vendor, category, stack, importance].filter(Boolean).length;

  function replaceUrl(nextFilters: SearchFilters) {
    const queryString = toQueryString(nextFilters);
    const nextHref = queryString ? `${pathname}?${queryString}` : pathname;
    startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  }

  function updateFilters(nextFilters: SearchFilters) {
    setQuery(nextFilters.query ?? "");
    setVendor(nextFilters.vendor ?? "");
    setCategory(nextFilters.category ?? "");
    setStack(nextFilters.stack ?? "");
    setImportance(nextFilters.importance ?? "");
    replaceUrl(nextFilters);
  }

  function patchFilters(patch: Partial<SearchFilters>) {
    updateFilters({ query, vendor, category, stack, importance, ...patch });
  }

  function clearAll() {
    updateFilters({ query: "", vendor: "", category: "", stack: "", importance: "" });
  }

  const featuredRelative = featuredEvent
    ? formatDistanceToNowStrict(new Date(featuredEvent.publishedAt), { addSuffix: true })
    : null;

  return (
    <section className="px-4 py-10 sm:px-6 md:py-14">
      <div className="vw-shell">
        <div className="border-b border-[var(--color-line)] pb-10">
          <p className="vw-kicker">Search intelligence</p>
          <h1 className="vw-display mt-4 max-w-[22ch] text-balance text-4xl sm:text-5xl md:text-6xl">
            Cut through release surfaces to the changes that actually move a stack.
          </h1>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div className="vw-panel p-4">
              <label htmlFor="search-query" className="vw-kicker vw-kicker-muted">
                Query
              </label>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  id="search-query"
                  name="query"
                  value={query}
                  onChange={(event) => patchFilters({ query: event.target.value })}
                  placeholder="Search vendors, models, payments, CI, auth, mobile…"
                  className="vw-input vw-input-lg"
                />
                <button type="button" onClick={clearAll} className="vw-button vw-button-secondary vw-button-lg">
                  Reset
                </button>
              </div>
              <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
                {filteredEvents.length} results · {vendorCount || vendors.length} vendors in scope ·{" "}
                {activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-px rounded-md border border-[var(--color-line)] bg-[var(--color-line)]">
              <StatCard
                label="In view"
                value={String(filteredEvents.length)}
                detail={activeFilterCount ? "Filtered" : "Full feed"}
              />
              <StatCard
                label="High signal"
                value={String(highSignalCount)}
                detail="Critical + high"
                accent
              />
              <StatCard label="Vendors" value={String(vendors.length)} detail="Tracked total" />
              <StatCard
                label="Latest"
                value={featuredEvent ? format(new Date(featuredEvent.publishedAt), "MMM d") : "None"}
                detail={featuredEvent ? featuredEvent.vendorName : "No matches"}
              />
            </dl>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[280px_1fr]">
          <aside className="grid gap-4 xl:sticky xl:top-20 xl:self-start">
            <FilterSection
              title="Importance"
              value={importance}
              options={facets.importanceBands}
              onSelect={(nextValue) => patchFilters({ importance: nextValue as ImportanceBand | "" })}
            />
            <FilterSection
              title="Vendor"
              value={vendor}
              options={facets.vendors.map((facet) => ({
                ...facet,
                label: vendors.find((item) => item.slug === facet.value)?.name ?? facet.label,
              }))}
              onSelect={(nextValue) => patchFilters({ vendor: nextValue })}
            />
            <FilterSection
              title="Category"
              value={category}
              options={facets.categories}
              onSelect={(nextValue) => patchFilters({ category: nextValue })}
            />
            <FilterSection
              title="Affected stack"
              value={stack}
              options={facets.stacks}
              onSelect={(nextValue) => patchFilters({ stack: nextValue })}
            />
          </aside>

          <div className="grid gap-4">
            {featuredEvent ? (
              <article className="vw-panel-raised p-6 md:p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2.5">
                    <VendorMark
                      vendorSlug={featuredEvent.vendorSlug}
                      vendorName={featuredEvent.vendorName}
                      size="sm"
                    />
                    <span className="flex flex-col leading-tight">
                      <span className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
                        Top match
                      </span>
                      <span className="text-sm font-semibold text-[var(--color-ink)]">
                        {featuredEvent.vendorName}
                      </span>
                    </span>
                  </span>
                  <span className="ml-auto flex flex-wrap items-center gap-2">
                    <SeverityPill band={featuredEvent.importanceBand} />
                    <span className="font-[var(--font-mono)] text-[0.6875rem] tabular-nums uppercase tracking-wider text-[var(--color-ink-muted)]">
                      {featuredRelative}
                    </span>
                    <span className="font-[var(--font-mono)] text-[0.6875rem] tabular-nums text-[var(--color-ink-muted)]">
                      signal · {featuredEvent.computedScore ?? 0}
                    </span>
                  </span>
                </div>
                <h2 className="vw-title mt-5 max-w-[28ch] text-balance text-3xl">
                  {featuredEvent.title}
                </h2>
                <p className="vw-copy mt-4 max-w-[66ch] text-pretty text-base md:text-lg">
                  {featuredEvent.summary}
                </p>
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <div className="vw-well p-4">
                    <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
                      Why it matters
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                      {featuredEvent.whyItMatters}
                    </p>
                  </div>
                  <div className="vw-well p-4">
                    <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
                      Who should care
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {featuredEvent.whoShouldCare.map((role) => (
                        <span key={role} className="vw-tag vw-tag-mono">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link href={`/events/${featuredEvent.slug}`} className="vw-button vw-button-primary">
                    Open event page
                  </Link>
                  <a
                    href={featuredEvent.sourceUrl}
                    className="vw-button vw-button-secondary"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official source
                  </a>
                  {featuredEvent.githubUrl ? (
                    <a
                      href={featuredEvent.githubUrl}
                      className="vw-button vw-button-ghost"
                      target="_blank"
                      rel="noreferrer"
                    >
                      GitHub
                    </a>
                  ) : null}
                </div>
              </article>
            ) : (
              <article className="vw-panel p-8 text-center">
                <p className="vw-kicker vw-kicker-muted">No matches</p>
                <h2 className="vw-title mt-3 text-balance text-2xl">
                  Nothing matches the current filter set.
                </h2>
                <p className="vw-copy mx-auto mt-4 max-w-[52ch] text-pretty text-base">
                  Try removing a facet, broadening the search query, or switching from a specific vendor to an
                  affected stack like payments, auth, or mobile.
                </p>
                <button type="button" onClick={clearAll} className="vw-button vw-button-signal mt-6">
                  Clear filters
                </button>
              </article>
            )}

            <div className="grid gap-3">
              {remainingEvents.map((event) => (
                <EventCard key={event.id} event={event} compact />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
