"use client";

import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";

import { EventCard } from "@/components/event-card";
import { SeverityPill } from "@/components/severity-pill";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VendorMark } from "@/components/vendor-mark";
import { filterEvents, getSearchFacets, type SearchFilters } from "@/lib/search/filter-events";
import type { ImportanceBand, VendorRecord } from "@/lib/mock-data";
import type { SiteEvent } from "@/lib/site-data";
import { cn } from "@/lib/utils";

type SearchExplorerProps = {
  events: SiteEvent[];
  vendors: VendorRecord[];
  initialFilters: SearchFilters;
};

type FilterOption = {
  value: string;
  label: string;
  count: number;
};

type ActiveFilterChip = {
  key: string;
  label: string;
  value: string;
  onClear: () => void;
};

const ALL_FILTER_VALUE = "__all";
const importanceOrder: ImportanceBand[] = ["critical", "high", "medium", "low"];
const filterLabelCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function toQueryString(filters: SearchFilters) {
  const params = new URLSearchParams();
  if (filters.query?.trim()) params.set("query", filters.query.trim());
  if (filters.vendor) params.set("vendor", filters.vendor);
  if (filters.category) params.set("category", filters.category);
  if (filters.stack) params.set("stack", filters.stack);
  if (filters.importance) params.set("importance", filters.importance);
  return params.toString();
}

function totalOptionCount(options: FilterOption[]) {
  return options.reduce((sum, option) => sum + option.count, 0);
}

function getOptionLabel(options: FilterOption[], value: string, fallback = "") {
  return options.find((option) => option.value === value)?.label ?? fallback;
}

function importanceRank(value: string) {
  const index = importanceOrder.indexOf(value as ImportanceBand);
  return index === -1 ? importanceOrder.length : index;
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

function FilterButtonContent({
  title,
  selectedLabel,
  placeholder,
  active,
}: {
  title: string;
  selectedLabel?: string;
  placeholder: string;
  active: boolean;
}) {
  return (
    <>
      <span className="grid min-w-0 flex-1 gap-0.5 text-left">
        <span className="font-[var(--font-mono)] text-[0.625rem] uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className={cn("truncate text-sm", active ? "text-foreground" : "text-muted-foreground")}>
          {selectedLabel || placeholder}
        </span>
      </span>
      <ChevronDown aria-hidden="true" className="opacity-60" />
    </>
  );
}

function DropdownFilter({
  title,
  value,
  options,
  placeholder,
  onSelect,
}: {
  title: string;
  value: string;
  options: FilterOption[];
  placeholder: string;
  onSelect: (nextValue: string) => void;
}) {
  const selectedLabel = getOptionLabel(options, value);
  const active = Boolean(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`${title}: ${selectedLabel || placeholder}`}
          className={cn(
            "h-auto min-h-11 w-full justify-between px-3 py-2",
            active && "border-[var(--border-strong)] bg-muted text-foreground",
          )}
        >
          <FilterButtonContent title={title} selectedLabel={selectedLabel} placeholder={placeholder} active={active} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
      >
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={value || ALL_FILTER_VALUE}
          onValueChange={(nextValue) => onSelect(nextValue === ALL_FILTER_VALUE ? "" : nextValue)}
        >
          <DropdownMenuGroup>
            <DropdownMenuRadioItem value={ALL_FILTER_VALUE}>
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="truncate">All {title.toLowerCase()}</span>
                <span className="font-[var(--font-mono)] text-[0.6875rem] tabular-nums text-muted-foreground">
                  {totalOptionCount(options)}
                </span>
              </span>
            </DropdownMenuRadioItem>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="truncate">{option.label}</span>
                  <span className="font-[var(--font-mono)] text-[0.6875rem] tabular-nums text-muted-foreground">
                    {option.count}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function VendorFilter({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: FilterOption[];
  onSelect: (nextValue: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [vendorQuery, setVendorQuery] = useState("");
  const selectedLabel = getOptionLabel(options, value);
  const active = Boolean(value);
  const normalizedVendorQuery = vendorQuery.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedVendorQuery) return true;
    return option.label.toLowerCase().includes(normalizedVendorQuery) || option.value.includes(normalizedVendorQuery);
  });

  function chooseVendor(nextValue: string) {
    onSelect(nextValue);
    setOpen(false);
    setVendorQuery("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setVendorQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={`Vendor: ${selectedLabel || "All vendors"}`}
          className={cn(
            "h-auto min-h-11 w-full justify-between px-3 py-2",
            active && "border-[var(--border-strong)] bg-muted text-foreground",
          )}
        >
          <FilterButtonContent title="Vendor" selectedLabel={selectedLabel} placeholder="All vendors" active={active} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0">
        <div className="border-b border-border p-2">
          <label className="relative block">
            <span className="sr-only">Search vendors</span>
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={vendorQuery}
              onChange={(event) => setVendorQuery(event.target.value)}
              placeholder="Search vendors"
              className="vw-input h-9 py-2 pl-8 text-sm"
            />
          </label>
        </div>
        <div className="max-h-[20rem] overflow-y-auto p-1" role="listbox" aria-label="Vendor filter">
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => chooseVendor("")}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              !value && "bg-accent text-accent-foreground",
            )}
          >
            <span className="min-w-0 truncate">All vendors</span>
            <span className="font-[var(--font-mono)] text-[0.6875rem] tabular-nums text-muted-foreground">
              {totalOptionCount(options)}
            </span>
          </button>
          {filteredOptions.length ? (
            filteredOptions.map((option) => {
              const isSelected = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => chooseVendor(option.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent text-accent-foreground",
                  )}
                >
                  <VendorMark vendorSlug={option.value} vendorName={option.label} size="sm" />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <span className="font-[var(--font-mono)] text-[0.6875rem] tabular-nums text-muted-foreground">
                    {option.count}
                  </span>
                  {isSelected ? <Check aria-hidden="true" className="text-foreground" /> : null}
                </button>
              );
            })
          ) : (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No vendors found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ActiveFilterChips({
  filters,
  onClearAll,
}: {
  filters: ActiveFilterChip[];
  onClearAll: () => void;
}) {
  if (!filters.length) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={filter.onClear}
          className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground"
        >
          <span className="font-[var(--font-mono)] uppercase tracking-wider">{filter.label}</span>
          <span className="max-w-48 truncate text-foreground">{filter.value}</span>
          <X aria-hidden="true" className="size-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        Clear all
      </button>
    </div>
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
  const facets = useMemo(() => getSearchFacets(events), [events]);
  const vendorNameBySlug = useMemo(() => new Map(vendors.map((item) => [item.slug, item.name])), [vendors]);
  const vendorOptions = useMemo(
    () =>
      facets.vendors
        .map((facet) => ({
          ...facet,
          label: vendorNameBySlug.get(facet.value) ?? facet.label,
        }))
        .sort((a, b) => filterLabelCollator.compare(a.label, b.label) || a.value.localeCompare(b.value)),
    [facets.vendors, vendorNameBySlug],
  );
  const importanceOptions = useMemo(
    () =>
      facets.importanceBands
        .slice()
        .sort(
          (a, b) =>
            importanceRank(a.value) - importanceRank(b.value) || a.label.localeCompare(b.label),
        ),
    [facets.importanceBands],
  );
  const filteredEvents = filterEvents(events, {
    query: deferredQuery,
    vendor,
    category,
    stack,
    importance,
  });
  const featuredEvent = filteredEvents[0] ?? null;
  const remainingEvents = featuredEvent ? filteredEvents.slice(1) : [];
  const queryValue = query.trim();
  const highSignalCount = filteredEvents.filter((event) => {
    return event.importanceBand === "critical" || event.importanceBand === "high";
  }).length;
  const vendorCount = new Set(filteredEvents.map((event) => event.vendorSlug)).size;
  const activeFilterCount = [queryValue, vendor, category, stack, importance].filter(Boolean).length;

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

  function getEventHref(slug: string) {
    const params = new URLSearchParams(toQueryString({ query, vendor, category, stack, importance }));
    params.set("fromSearch", "true");
    return `/events/${slug}?${params.toString()}`;
  }

  const featuredRelative = featuredEvent
    ? formatDistanceToNowStrict(new Date(featuredEvent.publishedAt), { addSuffix: true })
    : null;
  const activeFilters: ActiveFilterChip[] = [
    queryValue ? { key: "query", label: "Query", value: queryValue, onClear: () => patchFilters({ query: "" }) } : null,
    vendor
      ? {
          key: "vendor",
          label: "Vendor",
          value: getOptionLabel(vendorOptions, vendor, vendor),
          onClear: () => patchFilters({ vendor: "" }),
        }
      : null,
    category
      ? {
          key: "category",
          label: "Category",
          value: getOptionLabel(facets.categories, category, category),
          onClear: () => patchFilters({ category: "" }),
        }
      : null,
    stack
      ? {
          key: "stack",
          label: "Stack",
          value: getOptionLabel(facets.stacks, stack, stack),
          onClear: () => patchFilters({ stack: "" }),
        }
      : null,
    importance
      ? {
          key: "importance",
          label: "Signal",
          value: getOptionLabel(importanceOptions, importance, importance),
          onClear: () => patchFilters({ importance: "" }),
        }
      : null,
  ].filter((filter): filter is ActiveFilterChip => Boolean(filter));

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
              <ActiveFilterChips filters={activeFilters} onClearAll={clearAll} />
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
          <aside className="xl:sticky xl:top-20 xl:self-start">
            <section className="vw-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
                  <SlidersHorizontal aria-hidden="true" className="size-3.5" />
                  Filters
                </h2>
                {activeFilterCount ? (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Reset
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <DropdownFilter
                  title="Importance"
                  value={importance}
                  options={importanceOptions}
                  placeholder="Any signal"
                  onSelect={(nextValue) => patchFilters({ importance: nextValue as ImportanceBand | "" })}
                />
                <VendorFilter
                  value={vendor}
                  options={vendorOptions}
                  onSelect={(nextValue) => patchFilters({ vendor: nextValue })}
                />
                <DropdownFilter
                  title="Category"
                  value={category}
                  options={facets.categories}
                  placeholder="All categories"
                  onSelect={(nextValue) => patchFilters({ category: nextValue })}
                />
                <DropdownFilter
                  title="Affected stack"
                  value={stack}
                  options={facets.stacks}
                  placeholder="All stacks"
                  onSelect={(nextValue) => patchFilters({ stack: nextValue })}
                />
              </div>
            </section>
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
                  <Link href={getEventHref(featuredEvent.slug)} className="vw-button vw-button-primary">
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
                <EventCard key={event.id} event={event} compact eventHref={getEventHref(event.slug)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
