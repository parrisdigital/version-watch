import { SearchExplorer } from "@/components/search-explorer";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import type { SinceWindow } from "@/lib/search/filter-events";
import {
  getPublicEventStats,
  getPublicSearchPage,
  getRelativeTimestamp,
  getVendors,
} from "@/lib/site-data";
import type { ImportanceBand, SourceType } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const SINCE_VALUES: ReadonlySet<SinceWindow> = new Set([
  "",
  "7d",
  "30d",
  "90d",
]);
const SOURCE_TYPES: ReadonlySet<SourceType> = new Set([
  "github_release",
  "changelog_page",
  "docs_page",
  "blog",
  "rss",
]);
const IMPORTANCE_BANDS: ReadonlySet<ImportanceBand> = new Set([
  "critical",
  "high",
  "medium",
  "low",
]);

type SearchParams = {
  query?: string;
  vendor?: string;
  topic?: string;
  /** Legacy params that get coerced into topic for back-compat. */
  category?: string;
  stack?: string;
  since?: string;
  sourceType?: string;
  importance?: string;
};

function asSince(value: string | undefined): SinceWindow {
  if (!value) return "";
  return SINCE_VALUES.has(value as SinceWindow) ? (value as SinceWindow) : "";
}

function asSourceType(value: string | undefined): SourceType | "" {
  if (!value) return "";
  return SOURCE_TYPES.has(value as SourceType) ? (value as SourceType) : "";
}

function asImportance(value: string | undefined): ImportanceBand | "" {
  if (!value) return "";
  return IMPORTANCE_BANDS.has(value as ImportanceBand)
    ? (value as ImportanceBand)
    : "";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const topic = params.topic ?? params.category ?? params.stack ?? "";
  const since = asSince(params.since);
  const sinceTimestamp = since
    ? getRelativeTimestamp(Number.parseInt(since, 10))
    : undefined;
  const importance = asImportance(params.importance);
  const sourceType = asSourceType(params.sourceType);
  const [eventPage, vendors, stats] = await Promise.all([
    getPublicSearchPage({
      limit: 100,
      vendor: params.vendor?.trim().toLowerCase() || undefined,
      query: params.query?.trim().toLowerCase() || undefined,
      sourceType: sourceType || undefined,
      tag: topic.trim().toLowerCase() || undefined,
      severity: importance || undefined,
      sinceTimestamp,
    }),
    getVendors(),
    getPublicEventStats(),
  ]);

  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="px-4 pt-28 sm:px-6 md:pt-32">
        <div className="vw-shell">
          <h1 className="sr-only">Search</h1>
        </div>
      </section>

      <SearchExplorer
        events={eventPage.events}
        vendors={vendors}
        corpusEventCount={stats.eventCount}
        initialFilters={{
          query: params.query ?? "",
          vendor: params.vendor ?? "",
          topic,
          since,
          sourceType,
          importance,
        }}
      />

      <SiteFooter />
    </main>
  );
}
