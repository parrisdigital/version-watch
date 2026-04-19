"use client";

import Link from "next/link";
import { format } from "date-fns";
import { startTransition, useDeferredValue, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { EventCard } from "@/components/event-card";
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

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-zinc-950/70 p-5">
      <p className="truncate text-sm text-zinc-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums">{value}</p>
      <p className="mt-2 text-base text-zinc-500">{detail}</p>
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
    <section className="rounded-[1.5rem] border border-white/10 bg-zinc-950/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-50">{title}</h2>
        {value ? (
          <button
            type="button"
            onClick={() => onSelect("")}
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(isActive ? "" : option.value)}
              className={`rounded-full border px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                  : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:text-zinc-50"
              }`}
            >
              <span>{option.label}</span>
              <span className="ml-2 tabular-nums text-zinc-500">{option.count}</span>
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
    updateFilters({
      query,
      vendor,
      category,
      stack,
      importance,
      ...patch,
    });
  }

  function clearAll() {
    updateFilters({
      query: "",
      vendor: "",
      category: "",
      stack: "",
      importance: "",
    });
  }

  return (
    <section className="px-4 pb-24 pt-10 sm:px-6 md:pt-14">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 border-b border-white/10 pb-10 md:gap-10">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="font-mono text-sm uppercase tracking-wide text-emerald-300/80">Search intelligence</p>
              <h1 className="mt-4 max-w-[12ch] text-balance text-5xl font-semibold tracking-tight text-zinc-50 sm:text-6xl">
                Search the changes that actually move a stack.
              </h1>
              <p className="mt-6 max-w-[60ch] text-pretty text-lg text-zinc-300">
                Filter by vendor, category, affected stack, and importance to cut through noisy release surfaces.
                Every result keeps the official source attached.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-zinc-950/75 p-5">
              <label htmlFor="search-query" className="font-mono text-sm uppercase tracking-wide text-zinc-500">
                Query
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="search-query"
                  name="query"
                  value={query}
                  onChange={(event) => patchFilters({ query: event.target.value })}
                  placeholder="Search vendors, models, payments, CI, auth, or mobile changes"
                  className="w-full rounded-2xl ring-1 ring-white/10 bg-white/[0.03] px-5 py-4 text-base text-zinc-100 outline-none placeholder:text-zinc-500 max-sm:text-base"
                />
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-2xl border border-white/10 px-4 py-4 text-sm text-zinc-200 transition-colors hover:border-white/20 hover:text-zinc-50"
                >
                  Reset
                </button>
              </div>
              <p className="mt-4 text-base text-zinc-500">
                {filteredEvents.length} results across {vendorCount || vendors.length} tracked vendors.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tracked updates"
              value={String(filteredEvents.length)}
              detail={activeFilterCount ? "Current filtered result set" : "Live public feed before review queue"}
            />
            <StatCard
              label="High-signal items"
              value={String(highSignalCount)}
              detail="Critical and high-priority updates in view"
            />
            <StatCard
              label="Tracked vendors"
              value={String(vendors.length)}
              detail="Launch universe across AI, infra, payments, and mobile"
            />
            <StatCard
              label="Latest publication"
              value={featuredEvent ? format(new Date(featuredEvent.publishedAt), "MMM d") : "None"}
              detail={featuredEvent ? featuredEvent.vendorName : "No matching events"}
            />
          </div>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <aside className="grid gap-4 xl:sticky xl:top-28 xl:self-start">
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

          <div className="grid gap-6">
            {featuredEvent ? (
              <article className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                  <span className="font-mono uppercase tracking-wide text-emerald-300/80">Featured result</span>
                  <span>{featuredEvent.vendorName}</span>
                  <span>{format(new Date(featuredEvent.publishedAt), "MMM d, yyyy")}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-200">
                    {featuredEvent.importanceBand}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-400 tabular-nums">
                    score {featuredEvent.computedScore ?? 0}
                  </span>
                </div>
                <h2 className="mt-5 max-w-[20ch] text-balance text-4xl font-semibold tracking-tight text-zinc-50">
                  {featuredEvent.title}
                </h2>
                <p className="mt-5 max-w-[64ch] text-pretty text-lg text-zinc-300">{featuredEvent.summary}</p>
                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-sm font-semibold text-zinc-50">Why it matters</p>
                    <p className="mt-3 text-base text-zinc-400">{featuredEvent.whyItMatters}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-sm font-semibold text-zinc-50">Who should care</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {featuredEvent.whoShouldCare.map((role) => (
                        <span key={role} className="rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-300">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={`/events/${featuredEvent.slug}`}
                    className="rounded-full bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950"
                  >
                    Open event page
                  </Link>
                  <Link
                    href={featuredEvent.sourceUrl}
                    className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-100"
                  >
                    Official source
                  </Link>
                  {featuredEvent.githubUrl ? (
                    <Link
                      href={featuredEvent.githubUrl}
                      className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-100"
                    >
                      GitHub link
                    </Link>
                  ) : null}
                </div>
              </article>
            ) : (
              <article className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8">
                <p className="font-mono text-sm uppercase tracking-wide text-zinc-500">No matches</p>
                <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-zinc-50">
                  Nothing matches the current filter set.
                </h2>
                <p className="mt-5 max-w-[58ch] text-pretty text-lg text-zinc-300">
                  Try removing one facet, broadening the search query, or switching from a specific vendor to an
                  affected stack like payments, auth, or mobile.
                </p>
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-8 rounded-full bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950"
                >
                  Clear filters
                </button>
              </article>
            )}

            <div className="grid gap-4">
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
