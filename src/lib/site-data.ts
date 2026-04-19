import { format } from "date-fns";
import { fetchQuery } from "convex/nextjs";

import { api } from "../../convex/_generated/api";
import { scoreEvent } from "@/lib/classification/score";
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

type ReviewQueueEntry = ReviewCandidate & {
  publishedDateLabel: string;
};

type SourceHealthView = SourceHealthEntry & {
  lastSuccessLabel: string;
};

async function readFromConvex<T>(read: () => Promise<T>, fallback: () => T): Promise<T> {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return fallback();
  }

  try {
    return await read();
  } catch (error) {
    console.warn("Version Watch falling back to local data.", error);
    return fallback();
  }
}

function withComputedScores(items: SiteEvent[]) {
  return [...items]
    .sort((a, b) => {
      const scoreDiff = scoreEvent(b) - scoreEvent(a);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    })
    .map((event) => ({
      ...event,
      computedScore: event.computedScore ?? scoreEvent(event),
    }));
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
    computedScore: event.computedScore ?? scoreEvent(event),
  };
}

export async function getReviewQueue(): Promise<ReviewQueueEntry[]> {
  const items = await readFromConvex<ReviewCandidate[]>(
    () => fetchQuery(api.review.listPending, {}) as Promise<ReviewCandidate[]>,
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
