"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { VendorMark } from "@/components/vendor-mark";
import { cn } from "@/lib/utils";
import { getCategoryForSlug, VENDOR_CATEGORIES, type VendorCategory } from "@/lib/vendor-categories";
import type { VendorRecord } from "@/lib/mock-data";

type ViewMode = "grouped" | "alphabetical";

const CATEGORY_ORDER: VendorCategory[] = [...VENDOR_CATEGORIES, "Other"];

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8 H12.5 M8.5 4 L12.5 8 L8.5 12" />
    </svg>
  );
}

function VendorCard({ vendor }: { vendor: VendorRecord }) {
  return (
    <Link
      href={`/vendors/${vendor.slug}`}
      className="group vw-panel-flat flex h-full flex-col p-5 transition-colors hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-raised)]"
    >
      <div className="flex items-center gap-3">
        <VendorMark vendorSlug={vendor.slug} vendorName={vendor.name} size="md" />
        <div className="flex min-w-0 flex-col leading-tight">
          <h3 className="font-[var(--font-display)] text-base font-semibold tracking-tight text-[var(--color-ink)]">
            {vendor.name}
          </h3>
          <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
            {vendor.sources.length} source{vendor.sources.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <p className="vw-copy mt-4 flex-1 text-sm">{vendor.description}</p>

      <div className="mt-4 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-signal)]">
        Open vendor <ArrowIcon />
      </div>
    </Link>
  );
}

function ViewToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-wider transition-colors",
        active
          ? "bg-[var(--secondary)] text-[var(--foreground)]"
          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
      )}
    >
      {children}
    </button>
  );
}

export function VendorDirectory({ vendors }: { vendors: VendorRecord[] }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grouped");
  const deferredQuery = useDeferredValue(query);
  const trimmed = deferredQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!trimmed) return vendors;
    const compactQuery = normalizeSearchText(trimmed);
    return vendors.filter(
      (vendor) => {
        const searchable = [vendor.name, vendor.slug, vendor.description].join(" ").toLowerCase();
        const compactSearchable = normalizeSearchText(searchable);
        return searchable.includes(trimmed) || compactSearchable.includes(compactQuery);
      },
    );
  }, [vendors, trimmed]);

  const grouped = useMemo(() => {
    const map = new Map<VendorCategory, VendorRecord[]>();
    for (const vendor of filtered) {
      const category = getCategoryForSlug(vendor.slug);
      const items = map.get(category) ?? [];
      items.push(vendor);
      map.set(category, items);
    }
    return CATEGORY_ORDER.filter((category) => map.has(category)).map((category) => ({
      label: category,
      items: map.get(category)!.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [filtered]);

  const alphabetical = useMemo(
    () => filtered.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [filtered],
  );

  const visibleCount = filtered.length;
  const hasResults = visibleCount > 0;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <label className="flex min-w-[18rem] flex-1">
          <span className="sr-only">Filter vendors</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter vendors by name, slug, or description"
            className="vw-input vw-input-lg"
            autoComplete="off"
          />
        </label>
        <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] p-1">
          <ViewToggle active={view === "grouped"} onClick={() => setView("grouped")}>
            Grouped
          </ViewToggle>
          <ViewToggle active={view === "alphabetical"} onClick={() => setView("alphabetical")}>
            A–Z
          </ViewToggle>
        </div>
        <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
          {visibleCount} {visibleCount === 1 ? "vendor" : "vendors"}
          {trimmed ? ` matching "${trimmed}"` : ""}
        </p>
      </div>

      {!hasResults ? (
        <div className="vw-panel p-10 text-center">
          <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
            No vendors match
          </p>
          <p className="mt-3 text-sm text-[var(--foreground)]">
            Nothing matches &ldquo;{trimmed}&rdquo;. Try a shorter query or clear the filter.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="vw-button vw-button-ghost mt-5"
          >
            Clear filter
          </button>
        </div>
      ) : view === "grouped" ? (
        <div className="grid gap-12">
          {grouped.map((group) => (
            <section key={group.label}>
              <header className="mb-4 flex items-baseline justify-between border-b border-[var(--color-line-quiet)] pb-2">
                <h2 className="font-mono text-xs uppercase tracking-wider text-[var(--foreground)]">
                  {group.label}
                </h2>
                <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
                  {group.items.length} {group.items.length === 1 ? "vendor" : "vendors"}
                </p>
              </header>
              <ul role="list" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((vendor) => (
                  <li key={vendor.slug}>
                    <VendorCard vendor={vendor} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul role="list" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alphabetical.map((vendor) => (
            <li key={vendor.slug}>
              <VendorCard vendor={vendor} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
