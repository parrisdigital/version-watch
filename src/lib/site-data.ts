import { format } from "date-fns";
import { fetchAction, fetchQuery } from "convex/nextjs";

import { api } from "../../convex/_generated/api";
import { scoreEvent } from "@/lib/classification/score";
import { buildSourceLinkQualityReport, type SourceLinkQualityReport } from "@/lib/source-link-quality";
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

type ReviewQueueEntry = ReviewCandidate & {
  publishedDateLabel: string;
};

type SourceHealthView = SourceHealthEntry & {
  lastSuccessLabel: string;
};

async function readFromConvex<T>(read: () => Promise<T>, fallback: () => T): Promise<T> {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is required in production.");
    }

    return fallback();
  }

  try {
    return await read();
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    console.warn("Version Watch falling back to local data.", error);
    return fallback();
  }
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
    const dateDiff = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
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

export async function getAllPublicEvents() {
  const items = await readFromConvex<SiteEvent[]>(
    () => fetchQuery(api.events.listPublic, {}) as Promise<SiteEvent[]>,
    () => fallbackEvents,
  );

  return withComputedScores(items);
}

export async function getVendors(): Promise<VendorRecord[]> {
  return await readFromConvex<VendorRecord[]>(
    () => fetchQuery(api.vendors.list, {}) as Promise<VendorRecord[]>,
    () => fallbackVendors,
  );
}

export async function getProductionFreshnessReport(options: ProductionFreshnessOptions = {}): Promise<any> {
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
        activeSourceCount: fallbackVendors.reduce((count, vendor) => count + vendor.sources.length, 0),
        pausedSourceCount: 0,
        unsupportedSourceCount: 0,
      },
      recentRuns: [],
      recentRefreshRuns: [],
      latestFeedRefresh: null,
      latestEvents: fallbackEvents
        .slice()
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, options.eventLimit ?? 24),
    }),
  );
}

function fallbackVendorFreshnessRecords(slug?: string) {
  const filteredVendors = slug ? fallbackVendors.filter((vendor) => vendor.slug === slug) : fallbackVendors;
  const now = new Date().toISOString();

  return {
    checkedAt: now,
    vendors: filteredVendors.map((vendor) => ({
      vendor: vendor.name,
      vendorSlug: vendor.slug,
      lifecycleState: vendor.slug === "railway" ? "unsupported" : "active",
      freshnessTier: "standard",
      latestAttemptAt: null,
      latestSuccessAt: null,
      latestFailureAt: null,
      nextDueAt: null,
      backoffUntil: null,
      activeSourceCount: vendor.slug === "railway" ? 0 : vendor.sources.length,
      degradedSourceCount: 0,
      failingSourceCount: 0,
      staleSourceCount: 0,
      pausedSourceCount: 0,
      unsupportedSourceCount: vendor.slug === "railway" ? vendor.sources.length : 0,
      queuedRefresh: false,
    })),
  };
}

export async function getVendorFreshnessReport(slug?: string): Promise<any> {
  return await readFromConvex<any>(
    () => fetchQuery(api.ops.vendorFreshness, { slug }) as Promise<any>,
    () => fallbackVendorFreshnessRecords(slug),
  );
}

export async function requestVendorRefreshIfStale(vendorSlug: string) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return null;
  }

  try {
    return await fetchAction(api.ingest.requestVendorRefresh, { vendorSlug });
  } catch (error) {
    console.warn(`Could not enqueue refresh for ${vendorSlug}.`, error);
    return null;
  }
}

export async function getFreshnessSummary(): Promise<FreshnessSummary> {
  const report = await getProductionFreshnessReport({ sinceHours: 8, eventLimit: 1 });

  const latestRun =
    report.latestFeedRefresh ??
    report.recentRefreshRuns?.find((run: any) => run.finishedAt || run.startedAt) ??
    report.recentRuns?.find((run: any) => run.finishedAt || run.startedAt);

  return {
    checkedAt: report.checkedAt,
    latestRunAt: latestRun?.finishedAt ?? latestRun?.startedAt ?? null,
    sourceCount: report.sources?.length ?? 0,
  };
}

export async function getVendorBySlug(slug: string) {
  return await readFromConvex<VendorRecord | null>(
    () => fetchQuery(api.vendors.bySlug, { slug }) as Promise<VendorRecord | null>,
    () => fallbackVendors.find((vendor) => vendor.slug === slug) ?? null,
  );
}

export async function getEventsForVendor(slug: string) {
  const items = await readFromConvex<SiteEvent[]>(
    () => fetchQuery(api.events.byVendorSlug, { slug }) as Promise<SiteEvent[]>,
    () =>
      fallbackEvents.filter((event) => event.vendorSlug === slug).sort((a, b) => {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }),
  );

  return withComputedScores(items);
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

      return fetchQuery(api.review.listPending, { adminSecret }) as Promise<ReviewCandidate[]>;
    },
    () => reviewCandidates,
  );

  return items
    .slice()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .map((candidate) => ({
      ...candidate,
      publishedDateLabel: format(new Date(candidate.publishedAt), "MMM d, yyyy"),
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
    getAllPublicEvents(),
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
  type: "suggest_vendor" | "missing_update" | "wrong_signal" | "incorrect_summary" | "general";
  message: string;
  pageUrl?: string;
  userAgent?: string;
  createdAt: number;
  updatedAt: number;
};

export async function getFeedbackSubmissions(): Promise<FeedbackSubmissionEntry[]> {
  return await readFromConvex<FeedbackSubmissionEntry[]>(
    () => {
      const adminSecret = process.env.ADMIN_SECRET;
      if (!adminSecret) {
        throw new Error("ADMIN_SECRET is required to read feedback submissions.");
      }

      return fetchQuery(api.feedback.listRecent, {
        adminSecret,
        limit: 100,
      }) as Promise<FeedbackSubmissionEntry[]>;
    },
    () => [],
  );
}
