"use client";

import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, Search as SearchIcon, X } from "lucide-react";

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
import { filterEvents, getSearchFacets, type SearchFilters, type SinceWindow } from "@/lib/search/filter-events";
import type { ImportanceBand, SourceType, VendorRecord } from "@/lib/mock-data";
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

const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  github_release: "GitHub release",
  changelog_page: "Changelog",
  docs_page: "Docs",
  blog: "Blog",
  rss: "RSS",
};

const SINCE_LABEL: Record<SinceWindow, string> = {
  "": "All time",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};
const SINCE_OPTIONS: SinceWindow[] = ["", "7d", "30d", "90d"];

const SEVERITY_DOT: Record<ImportanceBand, string> = {
  critical: "bg-[var(--color-critical)]",
  high: "bg-[var(--color-high)]",
  medium: "bg-[var(--color-medium)]",
  low: "bg-[var(--muted-foreground)]",
};

function toQueryString(filters: SearchFilters) {
  const params = new URLSearchParams();
  if (filters.query?.trim()) params.set("query", filters.query.trim());
  if (filters.vendor) params.set("vendor", filters.vendor);
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.since) params.set("since", filters.since);
  if (filters.sourceType) params.set("sourceType", filters.sourceType);
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

function FilterPillContent({
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
      <span className="font-mono text-[0.625rem] uppercase tracking-wider text-[var(--muted-foreground)]">
        {title}
      </span>
      <span className={cn("text-sm", active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]")}>
        {selectedLabel || placeholder}
      </span>
      <ChevronDown aria-hidden="true" className="size-3 opacity-60" />
    </>
  );
}

function DropdownFilter({
  title,
  value,
  options,
  placeholder,
  onSelect,
  formatLabel,
}: {
  title: string;
  value: string;
  options: FilterOption[];
  placeholder: string;
  onSelect: (nextValue: string) => void;
  formatLabel?: (value: string) => string;
}) {
  const selectedLabel = formatLabel
    ? value
      ? formatLabel(value)
      : ""
    : getOptionLabel(options, value);
  const active = Boolean(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${title}: ${selectedLabel || placeholder}`}
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors",
            active
              ? "border-[var(--border-strong)] bg-[var(--muted)]"
              : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--border-strong)]",
          )}
        >
          <FilterPillContent title={title} selectedLabel={selectedLabel} placeholder={placeholder} active={active} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[24rem] min-w-[14rem] overflow-y-auto">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={value || ALL_FILTER_VALUE}
          onValueChange={(nextValue) => onSelect(nextValue === ALL_FILTER_VALUE ? "" : nextValue)}
        >
          <DropdownMenuGroup>
            <DropdownMenuRadioItem value={ALL_FILTER_VALUE}>
              <span className="flex flex-1 items-center justify-between gap-3">
                <span>All {title.toLowerCase()}</span>
                <span className="font-mono text-[0.6875rem] tabular-nums text-[var(--muted-foreground)]">
                  {totalOptionCount(options)}
                </span>
              </span>
            </DropdownMenuRadioItem>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                <span className="flex flex-1 items-center justify-between gap-3">
                  <span className="truncate">{formatLabel ? formatLabel(option.value) : option.label}</span>
                  <span className="font-mono text-[0.6875rem] tabular-nums text-[var(--muted-foreground)]">
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

function SinceFilter({ value, onSelect }: { value: SinceWindow; onSelect: (next: SinceWindow) => void }) {
  const active = Boolean(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Since: ${SINCE_LABEL[value]}`}
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors",
            active
              ? "border-[var(--border-strong)] bg-[var(--muted)]"
              : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--border-strong)]",
          )}
        >
          <FilterPillContent title="Since" selectedLabel={SINCE_LABEL[value]} placeholder="All time" active={active} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[12rem]">
        <DropdownMenuLabel>Since</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={value || ALL_FILTER_VALUE}
          onValueChange={(next) => onSelect(next === ALL_FILTER_VALUE ? "" : (next as SinceWindow))}
        >
          {SINCE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option || ALL_FILTER_VALUE} value={option || ALL_FILTER_VALUE}>
              {SINCE_LABEL[option]}
            </DropdownMenuRadioItem>
          ))}
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
  const listboxId = "vendor-filter-listbox";
  const selectedLabel = getOptionLabel(options, value);
  const active = Boolean(value);
  const normalizedVendorQuery = vendorQuery.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedVendorQuery) return true;
    return (
      option.label.toLowerCase().includes(normalizedVendorQuery) ||
      option.value.includes(normalizedVendorQuery)
    );
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
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={`Vendor: ${selectedLabel || "All vendors"}`}
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors",
            active
              ? "border-[var(--border-strong)] bg-[var(--muted)]"
              : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--border-strong)]",
          )}
        >
          <FilterPillContent title="Vendor" selectedLabel={selectedLabel} placeholder="All vendors" active={active} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 overflow-hidden p-0">
        <div className="border-b border-[var(--border)] p-2">
          <label className="relative block">
            <span className="sr-only">Search vendors</span>
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            />
            <input
              value={vendorQuery}
              onChange={(event) => setVendorQuery(event.target.value)}
              placeholder="Filter vendors"
              className="vw-input h-9 py-2 pl-8 text-sm"
            />
          </label>
        </div>
        <div
          id={listboxId}
          className="max-h-[20rem] overflow-y-auto p-1"
          role="listbox"
          aria-label="Vendor filter"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => chooseVendor("")}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-[var(--accent)]",
              !value && "bg-[var(--accent)]",
            )}
          >
            <span className="min-w-0 truncate">All vendors</span>
            <span className="font-mono text-[0.6875rem] tabular-nums text-[var(--muted-foreground)]">
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
                    "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-[var(--accent)]",
                    isSelected && "bg-[var(--accent)]",
                  )}
                >
                  <VendorMark vendorSlug={option.value} vendorName={option.label} size="sm" />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <span className="font-mono text-[0.6875rem] tabular-nums text-[var(--muted-foreground)]">
                    {option.count}
                  </span>
                  {isSelected ? <Check aria-hidden="true" className="size-3.5" /> : null}
                </button>
              );
            })
          ) : (
            <p className="px-2 py-6 text-center text-sm text-[var(--muted-foreground)]">No vendors.</p>
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
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={filter.onClear}
          aria-label={`Clear ${filter.label}: ${filter.value}`}
          className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted-foreground)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
        >
          <span className="font-mono uppercase tracking-wider">{filter.label}</span>
          <span className="max-w-48 truncate text-[var(--foreground)]">{filter.value}</span>
          <X aria-hidden="true" className="size-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        Clear all
      </button>
    </div>
  );
}

function ResultRow({ event, href }: { event: SiteEvent; href: string }) {
  const relative = formatDistanceToNowStrict(new Date(event.publishedAt), { addSuffix: true });
  return (
    <li>
      <Link
        href={href}
        className="group flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-[var(--color-line-quiet)] bg-[var(--card)] px-4 py-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--color-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      >
        <VendorMark vendorSlug={event.vendorSlug} vendorName={event.vendorName} size="sm" />
        <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
          {event.vendorName}
        </span>
        <span
          className={cn("size-1.5 rounded-full", SEVERITY_DOT[event.importanceBand])}
          aria-label={`${event.importanceBand} importance`}
        />
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)] transition-colors group-hover:text-[var(--color-signal)]">
          {event.title}
        </span>
        <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
          {SOURCE_TYPE_LABEL[event.sourceType]}
        </span>
        <span
          className="font-mono text-[0.6875rem] tabular-nums text-[var(--muted-foreground)]"
          title={new Date(event.publishedAt).toLocaleString()}
        >
          {relative}
        </span>
      </Link>
    </li>
  );
}

export function SearchExplorer({ events, vendors, initialFilters }: SearchExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialFilters.query ?? "");
  const [vendor, setVendor] = useState(initialFilters.vendor ?? "");
  const [topic, setTopic] = useState(initialFilters.topic ?? initialFilters.category ?? initialFilters.stack ?? "");
  const [since, setSince] = useState<SinceWindow>(initialFilters.since ?? "");
  const [sourceType, setSourceType] = useState<SourceType | "">(initialFilters.sourceType ?? "");
  const [importance, setImportance] = useState<ImportanceBand | "">(initialFilters.importance ?? "");

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const deferredQuery = useDeferredValue(query);
  const facets = useMemo(() => getSearchFacets(events), [events]);
  const vendorNameBySlug = useMemo(
    () => new Map(vendors.map((item) => [item.slug, item.name])),
    [vendors],
  );
  const vendorOptions = useMemo(
    () =>
      facets.vendors
        .map((facet) => ({
          ...facet,
          label: vendorNameBySlug.get(facet.value) ?? facet.label,
        }))
        .sort(
          (a, b) => filterLabelCollator.compare(a.label, b.label) || a.value.localeCompare(b.value),
        ),
    [facets.vendors, vendorNameBySlug],
  );
  const importanceOptions = useMemo(
    () =>
      facets.importanceBands
        .slice()
        .sort(
          (a, b) => importanceRank(a.value) - importanceRank(b.value) || a.label.localeCompare(b.label),
        ),
    [facets.importanceBands],
  );
  const filteredEvents = useMemo(
    () =>
      filterEvents(events, {
        query: deferredQuery,
        vendor,
        topic,
        since,
        sourceType,
        importance,
      }),
    [events, deferredQuery, vendor, topic, since, sourceType, importance],
  );

  const queryValue = query.trim();
  const activeFilterCount = [queryValue, vendor, topic, since, sourceType, importance].filter(Boolean).length;
  const hasResults = filteredEvents.length > 0;

  // Autofocus the search input on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Global "/" keyboard shortcut focuses the search input.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTyping) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function replaceUrl(nextFilters: SearchFilters) {
    const queryString = toQueryString(nextFilters);
    const nextHref = queryString ? `${pathname}?${queryString}` : pathname;
    startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  }

  function patchFilters(patch: Partial<SearchFilters>) {
    const next: SearchFilters = {
      query,
      vendor,
      topic,
      since,
      sourceType,
      importance,
      ...patch,
    };
    setQuery(next.query ?? "");
    setVendor(next.vendor ?? "");
    setTopic(next.topic ?? "");
    setSince((next.since ?? "") as SinceWindow);
    setSourceType((next.sourceType ?? "") as SourceType | "");
    setImportance((next.importance ?? "") as ImportanceBand | "");
    replaceUrl(next);
  }

  function clearAll() {
    patchFilters({ query: "", vendor: "", topic: "", since: "", sourceType: "", importance: "" });
  }

  function getEventHref(slug: string) {
    const params = new URLSearchParams(toQueryString({ query, vendor, topic, since, sourceType, importance }));
    params.set("fromSearch", "true");
    return `/events/${slug}?${params.toString()}`;
  }

  function focusFirstResult() {
    const first = listRef.current?.querySelector<HTMLAnchorElement>('a[href]');
    first?.focus();
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    const links = listRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]');
    if (!links || links.length === 0) return;
    const current = document.activeElement as HTMLAnchorElement | null;
    const currentIndex = current ? Array.from(links).indexOf(current) : -1;

    if (event.key === "j" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, links.length - 1);
      links[next]?.focus();
    } else if (event.key === "k" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
      links[next]?.focus();
    }
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusFirstResult();
    }
  }

  const activeFilters: ActiveFilterChip[] = [
    queryValue
      ? { key: "query", label: "Query", value: queryValue, onClear: () => patchFilters({ query: "" }) }
      : null,
    vendor
      ? {
          key: "vendor",
          label: "Vendor",
          value: getOptionLabel(vendorOptions, vendor, vendor),
          onClear: () => patchFilters({ vendor: "" }),
        }
      : null,
    topic
      ? {
          key: "topic",
          label: "Topic",
          value: getOptionLabel(facets.topics, topic, topic),
          onClear: () => patchFilters({ topic: "" }),
        }
      : null,
    since
      ? {
          key: "since",
          label: "Since",
          value: SINCE_LABEL[since],
          onClear: () => patchFilters({ since: "" }),
        }
      : null,
    sourceType
      ? {
          key: "sourceType",
          label: "Source",
          value: SOURCE_TYPE_LABEL[sourceType],
          onClear: () => patchFilters({ sourceType: "" }),
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
    <section className="px-4 pb-20 pt-6 sm:px-6">
      <div className="vw-shell">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="vw-kicker">Search</p>
          <p className="hidden font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)] md:block">
            Press <kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1 py-0.5 font-mono text-[0.625rem] text-[var(--foreground)]">/</kbd> to focus, <kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1 py-0.5 font-mono text-[0.625rem] text-[var(--foreground)]">↓</kbd> or <kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1 py-0.5 font-mono text-[0.625rem] text-[var(--foreground)]">j</kbd>/<kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1 py-0.5 font-mono text-[0.625rem] text-[var(--foreground)]">k</kbd> to navigate
          </p>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="relative block">
            <span className="sr-only">Search the feed</span>
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            />
            <input
              ref={inputRef}
              id="search-query"
              name="query"
              type="search"
              value={query}
              onChange={(event) => patchFilters({ query: event.target.value })}
              onKeyDown={onInputKeyDown}
              placeholder="Search vendors, models, payments, auth, mobile, ci-cd…"
              autoComplete="off"
              spellCheck={false}
              className="vw-input vw-input-lg pl-10 pr-10"
            />
            {queryValue ? (
              <button
                type="button"
                onClick={() => patchFilters({ query: "" })}
                aria-label="Clear query"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <VendorFilter
              value={vendor}
              options={vendorOptions}
              onSelect={(next) => patchFilters({ vendor: next })}
            />
            <DropdownFilter
              title="Importance"
              value={importance}
              options={importanceOptions}
              placeholder="Any signal"
              onSelect={(next) => patchFilters({ importance: next as ImportanceBand | "" })}
            />
            <DropdownFilter
              title="Topic"
              value={topic}
              options={facets.topics}
              placeholder="Any topic"
              onSelect={(next) => patchFilters({ topic: next })}
            />
            <SinceFilter value={since} onSelect={(next) => patchFilters({ since: next })} />
            <DropdownFilter
              title="Source"
              value={sourceType}
              options={facets.sourceTypes}
              placeholder="Any source"
              onSelect={(next) => patchFilters({ sourceType: next as SourceType | "" })}
              formatLabel={(value) => SOURCE_TYPE_LABEL[value as SourceType] ?? value}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-line-quiet)] pt-3">
            <p className="font-mono text-[0.6875rem] uppercase tracking-wider tabular-nums text-[var(--muted-foreground)]">
              {filteredEvents.length} {filteredEvents.length === 1 ? "result" : "results"}
              {activeFilterCount > 0 ? ` · ${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}` : ""}
            </p>
            <ActiveFilterChips filters={activeFilters} onClearAll={clearAll} />
          </div>
        </div>

        {hasResults ? (
          <ul
            ref={listRef}
            role="list"
            onKeyDown={onListKeyDown}
            className="mt-6 grid gap-2"
          >
            {filteredEvents.map((event) => (
              <ResultRow key={event.id} event={event} href={getEventHref(event.slug)} />
            ))}
          </ul>
        ) : (
          <EmptyState filters={activeFilters} onClearAll={clearAll} />
        )}
      </div>
    </section>
  );
}

function EmptyState({
  filters,
  onClearAll,
}: {
  filters: ActiveFilterChip[];
  onClearAll: () => void;
}) {
  return (
    <div className="mt-10 vw-panel p-8 md:p-10">
      <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
        No results
      </p>
      <h2 className="vw-title mt-3 text-balance text-2xl">
        Nothing matches the current filter set.
      </h2>
      {filters.length > 0 ? (
        <>
          <p className="mt-3 max-w-[58ch] text-base text-[var(--muted-foreground)]">
            Try removing one filter at a time. The most-restrictive filter is usually the cause.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={filter.onClear}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted-foreground)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
              >
                <X aria-hidden="true" className="size-3" />
                <span className="font-mono uppercase tracking-wider">{filter.label}</span>
                <span className="text-[var(--foreground)]">{filter.value}</span>
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              Clear all
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-3 max-w-[58ch] text-base text-[var(--muted-foreground)]">
          The feed is currently empty. Check back soon, or read the latest from the{" "}
          <Link href="/" className="underline-offset-4 hover:underline">
            homepage
          </Link>
          .
        </p>
      )}
    </div>
  );
}
