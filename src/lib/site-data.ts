import { format } from "date-fns";
import { fetchQuery } from "convex/nextjs";

import { api } from "../../convex/_generated/api";
import {
  decodeUpdateCursor,
  encodeUpdateCursor,
  paginateEventsForPublicUpdates,
  type UpdateFilters,
} from "@/lib/agent-feed";
import { scoreEvent } from "@/lib/classification/score";
import {
  buildSourceLinkQualityReport,
  type SourceLinkQualityReport,
} from "@/lib/source-link-quality";
import {
  events as fallbackEvents,
  reviewCandidates,
  sourceHealth,
  vendors as fallbackVendors,
  type MockEvent,
  type ReviewCandidate,
  type SourceHealthEntry,
  type VendorRecord,
} from "@/lib/mock-data";

export type SiteEvent = MockEvent & { computedScore?: number };

export type FreshnessSummary = {
  checkedAt: string;
  latestRunAt: string | null;
  sourceCount: number;
};

export type ProductionFreshnessOptions = {
  sinceHours?: number;
  eventLimit?: number;
};

export function getRelativeTimestamp(daysAgo: number): number {
  return Date.now() - daysAgo * 24 * 60 * 60 * 1000;
}

type ReviewQueueEntry = ReviewCandidate & {
  publishedDateLabel: string;
};

type SourceHealthView = SourceHealthEntry & {
  lastSuccessLabel: string;
};

async function readFromConvex<T>(
  read: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  const fallbackDisabled =
    process.env.VERSION_WATCH_DISABLE_DATA_FALLBACK === "1";

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    if (process.env.NODE_ENV === "production" || fallbackDisabled) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is required in production.");
    }

    return fallback();
  }

  try {
    return await read();
  } catch (error) {
    if (process.env.NODE_ENV === "production" || fallbackDisabled) {
      throw error;
    }

    console.warn("Version Watch falling back to local data.", error);
    return fallback();
  }
}

const fallbackUnsupportedVendorSlugs = new Set<string>();

function isFallbackUnsupportedVendor(slug: string) {
  return fallbackUnsupportedVendorSlugs.has(slug);
}

function attachScores(items: SiteEvent[]): SiteEvent[] {
  return items.map((event) => ({
    ...event,
    computedScore: scoreEvent(event),
  }));
}

// Recency-first ordering, score as tiebreaker. Used across public event lists.
function withComputedScores(items: SiteEvent[]) {
  return attachScores(items).sort((a, b) => {
    const dateDiff =
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    if (dateDiff !== 0) return dateDiff;
    return (b.computedScore ?? 0) - (a.computedScore ?? 0);
  });
}

export async function getHomepageEvents() {
  const items = await readFromConvex<SiteEvent[]>(
    () => fetchQuery(api.events.homepageFeed, {}) as Promise<SiteEvent[]>,
    () => fallbackEvents,
  );

  return withComputedScores(items);
}

export async function getOperationalPublicEvents(maxEvents = 5000) {
  const boundedMaxEvents = Math.max(1, Math.min(Math.trunc(maxEvents), 5000));
  const fallbackDisabled =
    process.env.VERSION_WATCH_DISABLE_DATA_FALLBACK === "1";

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    if (process.env.NODE_ENV === "production" || fallbackDisabled) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is required in production.");
    }
    return withComputedScores(fallbackEvents);
  }

  try {
    const events: SiteEvent[] = [];
    let cursorPosition: UpdateFilters["cursorPosition"];
    let hasMore = true;

    while (hasMore && events.length < boundedMaxEvents) {
      const page = await getPublicUpdatesPage({
        limit: Math.min(100, boundedMaxEvents - events.length),
        cursorPosition,
      });
      events.push(...page.events);
      hasMore = Boolean(page.next_cursor);
      cursorPosition = page.next_cursor
        ? (decodeUpdateCursor(page.next_cursor) ?? undefined)
        : undefined;
    }

    return withComputedScores(events);
  } catch (error) {
    if (process.env.NODE_ENV === "production" || fallbackDisabled) throw error;
    console.warn("Version Watch falling back to local data.", error);
    return withComputedScores(fallbackEvents);
  }
}

export type PublicUpdatesPage = {
  events: SiteEvent[];
  total_count: number | null;
  total_count_is_exact: boolean;
  next_cursor: string | null;
};

export async function getPublicUpdatesPage(
  filters: UpdateFilters,
): Promise<PublicUpdatesPage> {
  return await readFromConvex<PublicUpdatesPage>(
    async () => {
      const queryArgs: {
        vendor?: string;
        query?: string;
        sourceType?: UpdateFilters["sourceType"];
        sinceTimestamp?: number;
        severity?: UpdateFilters["severity"];
        releaseClass?: UpdateFilters["releaseClass"];
        audience?: string;
        tag?: string;
        cursorPublishedAt?: number;
        cursorId?: string;
        limit: number;
      } = { limit: filters.limit };

      if (filters.vendor) queryArgs.vendor = filters.vendor;
      if (filters.query) queryArgs.query = filters.query;
      if (filters.sourceType) queryArgs.sourceType = filters.sourceType;
      if (filters.sinceTimestamp !== undefined)
        queryArgs.sinceTimestamp = filters.sinceTimestamp;
      if (filters.severity) queryArgs.severity = filters.severity;
      if (filters.releaseClass) queryArgs.releaseClass = filters.releaseClass;
      if (filters.audience) queryArgs.audience = filters.audience;
      if (filters.tag) queryArgs.tag = filters.tag;
      if (filters.cursorPosition) {
        queryArgs.cursorPublishedAt = Date.parse(
          filters.cursorPosition.publishedAt,
        );
        queryArgs.cursorId = filters.cursorPosition.id;
      }

      const page = (await fetchQuery(
        api.events.listPublicUpdatesPage,
        queryArgs,
      )) as {
        events: SiteEvent[];
        totalCount: number | null;
        totalCountIsExact: boolean;
        hasMore: boolean;
        nextCursor: { publishedAt: number; id: string } | null;
      };

      return {
        events: page.events,
        total_count: page.totalCount,
        total_count_is_exact: page.totalCountIsExact,
        next_cursor:
          page.hasMore && page.nextCursor
            ? encodeUpdateCursor({
                publishedAt: new Date(
                  page.nextCursor.publishedAt,
                ).toISOString(),
                id: page.nextCursor.id,
              })
            : null,
      };
    },
    () => ({
      ...paginateEventsForPublicUpdates(fallbackEvents, filters),
      total_count_is_exact: true,
    }),
  );
}

export async function getPublicSearchPage(
  filters: UpdateFilters,
): Promise<PublicUpdatesPage> {
  const events: SiteEvent[] = [];
  let cursorPosition = filters.cursorPosition;
  let nextCursor: string | null = null;
  let totalCount: number | null = null;
  let totalCountIsExact = false;

  // Each backend request scans at most 1,000 indexed rows. Continue through
  // sparse matches without reintroducing one unbounded query.
  for (
    let pageNumber = 0;
    pageNumber < 10 && events.length < filters.limit;
    pageNumber += 1
  ) {
    const page = await getPublicUpdatesPage({
      ...filters,
      limit: filters.limit - events.length,
      cursorPosition,
    });
    events.push(...page.events);
    totalCount = page.total_count;
    totalCountIsExact = page.total_count_is_exact;
    nextCursor = page.next_cursor;
    if (!nextCursor) break;
    cursorPosition = decodeUpdateCursor(nextCursor) ?? undefined;
    if (!cursorPosition) break;
  }

  return {
    events,
    total_count: totalCount,
    total_count_is_exact: totalCountIsExact,
    next_cursor: nextCursor,
  };
}

export type PublicEventStats = {
  ready: boolean;
  eventCount: number;
  highSignalCount: number;
  updatedAt: number | null;
};

export async function getPublicEventStats(
  vendorSlug?: string,
): Promise<PublicEventStats> {
  return await readFromConvex<PublicEventStats>(
    () =>
      fetchQuery(api.publicStats.get, {
        vendorSlug,
      }) as Promise<PublicEventStats>,
    () => {
      const events = vendorSlug
        ? fallbackEvents.filter((event) => event.vendorSlug === vendorSlug)
        : fallbackEvents;
      return {
        ready: true,
        eventCount: events.length,
        highSignalCount: events.filter(
          (event) =>
            event.importanceBand === "critical" ||
            event.importanceBand === "high",
        ).length,
        updatedAt: Date.now(),
      };
    },
  );
}

export type PublicTaxonomyStats = {
  ready: boolean;
  audiences: string[];
  tags: string[];
  sourceTypes: string[];
  updatedAt: number | null;
};

export async function getPublicTaxonomyStats(): Promise<PublicTaxonomyStats> {
  return await readFromConvex<PublicTaxonomyStats>(
    () =>
      fetchQuery(api.publicStats.taxonomy, {}) as Promise<PublicTaxonomyStats>,
    () => ({
      ready: true,
      audiences: Array.from(
        new Set(fallbackEvents.flatMap((event) => event.whoShouldCare)),
      ).sort(),
      tags: Array.from(
        new Set(
          fallbackEvents.flatMap((event) => [
            ...event.categories,
            ...(event.topicTags ?? []),
            ...event.affectedStack,
          ]),
        ),
      ).sort(),
      sourceTypes: Array.from(
        new Set(fallbackEvents.map((event) => event.sourceType)),
      ).sort(),
      updatedAt: Date.now(),
    }),
  );
}

export async function getPublicSitemapEntries() {
  return await readFromConvex<Array<{ slug: string; publishedAt: string }>>(
    async () => {
      const entries: Array<{ slug: string; publishedAt: string }> = [];
      let cursor: string | null = null;
      let isDone = false;

      while (!isDone) {
        const page = (await fetchQuery(api.events.listPublicSitemapPage, {
          paginationOpts: { numItems: 1000, cursor },
        })) as {
          page: Array<{ slug: string; publishedAt: string }>;
          continueCursor: string;
          isDone: boolean;
        };
        entries.push(...page.page);
        cursor = page.continueCursor;
        isDone = page.isDone;
      }

      return entries;
    },
    () =>
      fallbackEvents.map((event) => ({
        slug: event.slug,
        publishedAt: event.publishedAt,
      })),
  );
}

export async function getAdjacentPublicEvents(slug: string) {
  return await readFromConvex<{
    newer: { slug: string; title: string } | null;
    older: { slug: string; title: string } | null;
  }>(
    () => fetchQuery(api.events.adjacentBySlug, { slug }) as Promise<any>,
    () => {
      const event = fallbackEvents.find((item) => item.slug === slug);
      if (!event) return { newer: null, older: null };
      const vendorEvents = fallbackEvents
        .filter((item) => item.vendorSlug === event.vendorSlug)
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
      const index = vendorEvents.findIndex((item) => item.slug === slug);
      const newer = index > 0 ? vendorEvents[index - 1]! : null;
      const older =
        index >= 0 && index < vendorEvents.length - 1
          ? vendorEvents[index + 1]!
          : null;
      return {
        newer: newer ? { slug: newer.slug, title: newer.title } : null,
        older: older ? { slug: older.slug, title: older.title } : null,
      };
    },
  );
}

export async function getVendors(): Promise<VendorRecord[]> {
  return await readFromConvex<VendorRecord[]>(
    () => fetchQuery(api.vendors.list, {}) as Promise<VendorRecord[]>,
    () => fallbackVendors,
  );
}

export async function getProductionFreshnessReport(
  options: ProductionFreshnessOptions = {},
): Promise<any> {
  return await readFromConvex<any>(
    () =>
      fetchQuery(api.ops.productionFreshness, {
        sinceHours: options.sinceHours ?? 8,
        eventLimit: options.eventLimit ?? 24,
      }) as Promise<any>,
    () => ({
      checkedAt: new Date().toISOString(),
      sources: sourceHealth,
      coverage: {
        activeVendorCount: fallbackVendors.length,
        pausedVendorCount: 0,
        unsupportedVendorCount: 0,
        activeSourceCount: fallbackVendors.reduce(
          (count, vendor) => count + vendor.sources.length,
          0,
        ),
        pausedSourceCount: 0,
        unsupportedSourceCount: 0,
      },
      recentRuns: [],
      recentRefreshRuns: [],
      latestFeedRefresh: null,
      latestEvents: fallbackEvents
        .slice()
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime(),
        )
        .slice(0, options.eventLimit ?? 24),
    }),
  );
}

function fallbackVendorFreshnessRecords(slug?: string) {
  const filteredVendors = slug
    ? fallbackVendors.filter((vendor) => vendor.slug === slug)
    : fallbackVendors;
  const now = new Date().toISOString();

  return {
    checkedAt: now,
    vendors: filteredVendors.map((vendor) => {
      const unsupported = isFallbackUnsupportedVendor(vendor.slug);

      return {
        vendor: vendor.name,
        vendorSlug: vendor.slug,
        lifecycleState: unsupported ? "unsupported" : "active",
        freshnessTier: "standard",
        latestAttemptAt: null,
        latestSuccessAt: null,
        latestFailureAt: null,
        nextDueAt: null,
        backoffUntil: null,
        activeSourceCount: unsupported ? 0 : vendor.sources.length,
        degradedSourceCount: 0,
        failingSourceCount: 0,
        staleSourceCount: 0,
        pausedSourceCount: 0,
        unsupportedSourceCount: unsupported ? vendor.sources.length : 0,
        queuedRefresh: false,
      };
    }),
  };
}

export async function getVendorFreshnessReport(slug?: string): Promise<any> {
  return await readFromConvex<any>(
    () => fetchQuery(api.ops.vendorFreshness, { slug }) as Promise<any>,
    () => fallbackVendorFreshnessRecords(slug),
  );
}

export async function getFreshnessSummary(): Promise<FreshnessSummary> {
  return await readFromConvex<FreshnessSummary>(
    () => fetchQuery(api.ops.freshnessSummary, {}) as Promise<FreshnessSummary>,
    () => ({
      checkedAt: new Date().toISOString(),
      latestRunAt: null,
      sourceCount: fallbackVendors.reduce(
        (count, vendor) => count + vendor.sources.length,
        0,
      ),
    }),
  );
}

export async function getVendorBySlug(slug: string) {
  return await readFromConvex<VendorRecord | null>(
    () =>
      fetchQuery(api.vendors.bySlug, { slug }) as Promise<VendorRecord | null>,
    () => fallbackVendors.find((vendor) => vendor.slug === slug) ?? null,
  );
}

export async function getEventsForVendor(slug: string) {
  return (await getPublicUpdatesPage({ vendor: slug, limit: 100 })).events;
}

export async function getEventBySlug(slug: string) {
  const event = await readFromConvex<SiteEvent | null>(
    () => fetchQuery(api.events.bySlug, { slug }) as Promise<SiteEvent | null>,
    () => fallbackEvents.find((item) => item.slug === slug) ?? null,
  );

  if (!event) {
    return null;
  }

  return {
    ...event,
    computedScore: scoreEvent(event),
  };
}

export async function getReviewQueue(): Promise<ReviewQueueEntry[]> {
  const items = await readFromConvex<ReviewCandidate[]>(
    () => {
      const adminSecret = process.env.ADMIN_SECRET;
      if (!adminSecret) {
        throw new Error("ADMIN_SECRET is required to read the review queue.");
      }

      return fetchQuery(api.review.listPending, { adminSecret }) as Promise<
        ReviewCandidate[]
      >;
    },
    () => reviewCandidates,
  );

  return items
    .slice()
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .map((candidate) => ({
      ...candidate,
      publishedDateLabel: format(
        new Date(candidate.publishedAt),
        "MMM d, yyyy",
      ),
    }));
}

export async function getReviewCandidateById(id: string) {
  const queue = await getReviewQueue();
  return queue.find((candidate) => candidate.id === id) ?? null;
}

export async function getSourceHealth(): Promise<SourceHealthView[]> {
  const items = await readFromConvex<SourceHealthEntry[]>(
    () => fetchQuery(api.ops.sourceHealth, {}) as Promise<SourceHealthEntry[]>,
    () => sourceHealth,
  );

  return items.map((entry) => ({
    ...entry,
    lastSuccessLabel: entry.lastSuccessAt
      ? format(new Date(entry.lastSuccessAt), "MMM d, yyyy HH:mm")
      : "Never",
  }));
}

export async function getSourceLinkQualityReport(): Promise<SourceLinkQualityReport> {
  const [vendors, events, freshnessReport] = await Promise.all([
    getVendors(),
    getOperationalPublicEvents(),
    getProductionFreshnessReport({ sinceHours: 8, eventLimit: 24 }),
  ]);

  return buildSourceLinkQualityReport({
    vendors,
    events,
    freshnessReport,
  });
}

export type FeedbackSubmissionEntry = {
  _id: string;
  type:
    | "suggest_vendor"
    | "missing_update"
    | "wrong_signal"
    | "incorrect_summary"
    | "general";
  message: string;
  pageUrl?: string;
  userAgent?: string;
  createdAt: number;
  updatedAt: number;
};

export type RelevanceSignalValue = "impacted" | "needs_review" | "no_impact";
export type RelevanceArea =
  | "api"
  | "auth"
  | "billing"
  | "deployments"
  | "sdk"
  | "security"
  | "mobile"
  | "ai_agents"
  | "docs"
  | "other";

export type RawRelevanceSignalEntry = {
  _id: string;
  eventSlug: string;
  signal: RelevanceSignalValue;
  area: RelevanceArea;
  note?: string;
  userAgent?: string;
  createdAt: number;
  eventTitle?: string | null;
  eventVisibility?: "public" | "hidden" | null;
  vendorName?: string | null;
  vendorSlug?: string | null;
};

export type RelevanceSignalEntry = RawRelevanceSignalEntry & {
  signalLabel: string;
  areaLabel: string;
  eventTitle: string;
  vendorName: string;
  eventUrl: string;
};

export const RELEVANCE_SIGNAL_LABEL: Record<RelevanceSignalValue, string> = {
  impacted: "Impacted us",
  needs_review: "Needs review",
  no_impact: "No impact",
};

export const RELEVANCE_AREA_LABEL: Record<RelevanceArea, string> = {
  api: "API",
  auth: "Auth",
  billing: "Billing",
  deployments: "Deployments",
  sdk: "SDK",
  security: "Security",
  mobile: "Mobile",
  ai_agents: "AI agents",
  docs: "Docs",
  other: "Other",
};

export function formatRelevanceSignals(
  items: RawRelevanceSignalEntry[],
): RelevanceSignalEntry[] {
  return items.map((entry) => ({
    ...entry,
    signalLabel: RELEVANCE_SIGNAL_LABEL[entry.signal] ?? entry.signal,
    areaLabel: RELEVANCE_AREA_LABEL[entry.area] ?? entry.area,
    eventTitle: entry.eventTitle ?? entry.eventSlug,
    vendorName: entry.vendorName ?? "Unknown vendor",
    eventUrl: `/events/${entry.eventSlug}`,
  }));
}

export async function getFeedbackSubmissions(): Promise<
  FeedbackSubmissionEntry[]
> {
  return await readFromConvex<FeedbackSubmissionEntry[]>(
    () => {
      const adminSecret = process.env.ADMIN_SECRET;
      if (!adminSecret) {
        throw new Error(
          "ADMIN_SECRET is required to read feedback submissions.",
        );
      }

      return fetchQuery(api.feedback.listRecent, {
        adminSecret,
        limit: 100,
      }) as Promise<FeedbackSubmissionEntry[]>;
    },
    () => [],
  );
}

export async function getRelevanceSignals(): Promise<RelevanceSignalEntry[]> {
  const items = await readFromConvex<RawRelevanceSignalEntry[]>(
    () => {
      const adminSecret = process.env.ADMIN_SECRET;
      if (!adminSecret) {
        throw new Error("ADMIN_SECRET is required to read relevance signals.");
      }

      return fetchQuery(api.relevance.listRecent, {
        adminSecret,
        limit: 100,
      }) as Promise<RawRelevanceSignalEntry[]>;
    },
    () => [],
  );

  return formatRelevanceSignals(items);
}
