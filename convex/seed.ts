import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

import {
  events as mockEvents,
  reviewCandidates as mockReviewCandidates,
  sourceHealth as mockSourceHealth,
  vendors as vendorRegistry,
} from "../src/lib/mock-data";
import {
  getEffectiveLifecycleState,
  getRegistryLifecycleState,
  type SourceLifecycleState,
} from "./sourceLifecycle";
import {
  getFreshnessTier,
  getNextDueAt,
  getPollIntervalMinutesForFreshnessTier,
} from "./sourceFreshness";

function getImportanceScore(band: "critical" | "high" | "medium" | "low") {
  if (band === "critical") return 90;
  if (band === "high") return 70;
  if (band === "medium") return 45;
  return 20;
}

function getCandidateBand(confidence: "high" | "medium" | "low") {
  if (confidence === "high") return "medium" as const;
  if (confidence === "medium") return "low" as const;
  return "low" as const;
}

function getCandidateScore(confidence: "high" | "medium" | "low") {
  if (confidence === "high") return 35;
  if (confidence === "medium") return 24;
  return 16;
}

function resolveSyncedLifecycleState(existingSource: any, registryState: SourceLifecycleState) {
  if (!existingSource) {
    return registryState;
  }

  if (registryState === "paused" || registryState === "unsupported") {
    return registryState;
  }

  const currentState = getEffectiveLifecycleState(existingSource);
  return currentState === "unsupported" ? registryState : currentState;
}

export function buildSourceRegistryPayload(args: {
  existingSource?: any;
  vendorId: any;
  vendorSlug: string;
  source: { name: string; type: string; url: string };
  isPrimary: boolean;
  now: number;
}) {
  const registryState = getRegistryLifecycleState(args.source.url);
  const lifecycleState = resolveSyncedLifecycleState(args.existingSource, registryState);
  const freshnessTier = getFreshnessTier(args.vendorSlug, args.source.type);
  const pollIntervalMinutes = getPollIntervalMinutesForFreshnessTier(freshnessTier);
  const latestAttemptAt =
    args.existingSource?.lastAttemptAt ??
    args.existingSource?.lastSuccessAt ??
    args.existingSource?.lastFailureAt ??
    null;
  const payload: any = {
    vendorId: args.vendorId,
    name: args.source.name,
    sourceType: args.source.type,
    url: args.source.url,
    isPrimary: args.isPrimary,
    freshnessTier,
    pollIntervalMinutes,
    parserKey: `${args.vendorSlug}:${args.source.type}`,
    isActive: true,
    lifecycleState,
    updatedAt: args.now,
  };

  if (!args.existingSource) {
    payload.consecutiveFailures = 0;
  }

  if (!args.existingSource?.nextDueAt) {
    payload.nextDueAt = latestAttemptAt ? getNextDueAt(latestAttemptAt, freshnessTier) : args.now;
  }

  return payload;
}

async function syncVendorRegistryRecords(ctx: any) {
  let vendorCount = 0;
  let sourceCount = 0;
  const now = Date.now();

  const vendorIds = new Map<string, any>();
  const sourceIds = new Map<string, any>();

  for (const [index, vendor] of vendorRegistry.entries()) {
    const existingVendor = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q: any) => q.eq("slug", vendor.slug))
      .unique();

    const vendorPayload = {
      slug: vendor.slug,
      name: vendor.name,
      description: vendor.description,
      homepageUrl: vendor.sources[0]?.url ?? "",
      isActive: true,
      sortOrder: index + 1,
      updatedAt: now,
    };

    const vendorId =
      existingVendor?._id ??
      (await ctx.db.insert("vendors", {
        ...vendorPayload,
        createdAt: now,
      }));

    if (existingVendor) {
      await ctx.db.patch(existingVendor._id, vendorPayload);
    } else {
      vendorCount += 1;
    }

    vendorIds.set(vendor.slug, vendorId);

    const allowedSourceUrls = new Set(vendor.sources.map((source) => source.url));

    for (const source of vendor.sources) {
      const existingSource = await ctx.db
        .query("sources")
        .withIndex("by_vendor_and_url", (q: any) => q.eq("vendorId", vendorId).eq("url", source.url))
        .unique();

      const sourcePayload = buildSourceRegistryPayload({
        existingSource,
        vendorId,
        vendorSlug: vendor.slug,
        source,
        isPrimary: source.url === vendor.sources[0]?.url,
        now,
      });

      const sourceId =
        existingSource?._id ??
        (await ctx.db.insert("sources", {
          ...sourcePayload,
          createdAt: now,
        }));

      if (existingSource) {
        await ctx.db.patch(existingSource._id, sourcePayload);
      } else {
        sourceCount += 1;
      }

      sourceIds.set(`${vendor.slug}:${source.url}`, sourceId);
    }

    const existingSources = await ctx.db
      .query("sources")
      .withIndex("by_vendor", (q: any) => q.eq("vendorId", vendorId))
      .collect();

    for (const source of existingSources) {
      if (!allowedSourceUrls.has(source.url) && source.isActive) {
        await ctx.db.patch(source._id, {
          isActive: false,
          lifecycleState: "paused",
          updatedAt: now,
        });
      }
    }
  }

  return {
    vendorCount,
    sourceCount,
    vendorIds,
    sourceIds,
  };
}

export const syncRegistry = internalMutation({
  args: {},
  returns: v.object({
    vendors: v.number(),
    sources: v.number(),
  }),
  handler: async (ctx) => {
    const result = await syncVendorRegistryRecords(ctx);

    return {
      vendors: result.vendorCount,
      sources: result.sourceCount,
    };
  },
});

export const clearContent = internalMutation({
  args: {},
  returns: v.object({
    eventLinks: v.number(),
    changeEvents: v.number(),
    rawCandidates: v.number(),
    reviewActions: v.number(),
    ingestionRuns: v.number(),
    refreshRuns: v.number(),
  }),
  handler: async (ctx) => {
    let eventLinks = 0;
    let changeEvents = 0;
    let rawCandidates = 0;
    let reviewActions = 0;
    let ingestionRuns = 0;
    let refreshRuns = 0;

    for (const row of await ctx.db.query("eventLinks").collect()) {
      await ctx.db.delete(row._id);
      eventLinks += 1;
    }

    for (const row of await ctx.db.query("changeEvents").collect()) {
      await ctx.db.delete(row._id);
      changeEvents += 1;
    }

    for (const row of await ctx.db.query("reviewActions").collect()) {
      await ctx.db.delete(row._id);
      reviewActions += 1;
    }

    for (const row of await ctx.db.query("rawCandidates").collect()) {
      await ctx.db.delete(row._id);
      rawCandidates += 1;
    }

    for (const row of await ctx.db.query("ingestionRuns").collect()) {
      await ctx.db.delete(row._id);
      ingestionRuns += 1;
    }

    for (const row of await ctx.db.query("refreshRuns").collect()) {
      await ctx.db.delete(row._id);
      refreshRuns += 1;
    }

    return {
      eventLinks,
      changeEvents,
      rawCandidates,
      reviewActions,
      ingestionRuns,
      refreshRuns,
    };
  },
});

export const seedDemoData = internalMutation({
  args: {},
  returns: v.object({
    vendors: v.number(),
    sources: v.number(),
    rawCandidates: v.number(),
    changeEvents: v.number(),
  }),
  handler: async (ctx) => {
    let rawCandidateCount = 0;
    let changeEventCount = 0;
    const registrySync = await syncVendorRegistryRecords(ctx);
    const vendorIds = registrySync.vendorIds;
    const sourceIds = registrySync.sourceIds;

    for (const healthEntry of mockSourceHealth) {
      const vendor = vendorRegistry.find((item) => item.name === healthEntry.vendorName);
      const source = vendor?.sources.find((item) => item.name === healthEntry.sourceName);

      if (!vendor || !source) {
        continue;
      }

      const sourceId = sourceIds.get(`${vendor.slug}:${source.url}`);

      if (!sourceId) {
        continue;
      }

      await ctx.db.patch(sourceId, {
        consecutiveFailures:
          healthEntry.status === "healthy" ? 0 : healthEntry.status === "degraded" ? 1 : 3,
        lastAttemptAt: Date.parse(healthEntry.lastSuccessAt),
        lastSuccessAt: Date.parse(healthEntry.lastSuccessAt),
        lastFailureAt:
          healthEntry.status === "healthy" ? undefined : Date.parse(healthEntry.lastSuccessAt) + 60 * 60 * 1000,
        updatedAt: Date.now(),
      });
    }

    for (const event of mockEvents) {
      const vendorId = vendorIds.get(event.vendorSlug);
      const vendor = vendorRegistry.find((item) => item.slug === event.vendorSlug);
      const source = vendor?.sources.find((item) => item.url === event.sourceUrl) ?? vendor?.sources[0];
      const sourceId = source ? sourceIds.get(`${event.vendorSlug}:${source.url}`) : undefined;

      if (!vendorId || !sourceId || !source) {
        continue;
      }

      const dedupeKey = `published:${event.id}`;
      const existingRaw = await ctx.db
        .query("rawCandidates")
        .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", dedupeKey))
        .unique();

      const rawPayload = {
        vendorId,
        sourceId,
        externalId: event.id,
        sourceUrl: event.sourceUrl,
        githubUrl: event.githubUrl,
        rawTitle: event.sourceTitle ?? event.title,
        rawBody: event.summary,
        rawPublishedAt: Date.parse(event.publishedAt),
        discoveredAt: Date.parse(event.publishedAt),
        checksum: dedupeKey,
        parseConfidence: "high" as const,
        normalizationVersion: "v1",
        proposedSummary: event.summary,
        proposedWhatChanged: event.whatChanged,
        proposedWhyItMatters: event.whyItMatters,
        proposedWhoShouldCare: event.whoShouldCare,
        proposedAffectedStack: event.affectedStack,
        proposedCategories: event.categories,
        importanceScore: getImportanceScore(event.importanceBand),
        importanceBand: event.importanceBand,
        status: "published" as const,
        dedupeKey,
      };

      const rawCandidateId =
        existingRaw?._id ??
        (await ctx.db.insert("rawCandidates", rawPayload));

      if (existingRaw) {
        await ctx.db.patch(existingRaw._id, rawPayload);
      } else {
        rawCandidateCount += 1;
      }

      const existingEvent = await ctx.db
        .query("changeEvents")
        .withIndex("by_slug", (q) => q.eq("slug", event.slug))
        .unique();

      const eventPayload = {
        vendorId,
        sourceId,
        rawCandidateId,
        slug: event.slug,
        title: event.title,
        summary: event.summary,
        whatChanged: event.whatChanged,
        whyItMatters: event.whyItMatters,
        whoShouldCare: event.whoShouldCare,
        affectedStack: event.affectedStack,
        categories: event.categories,
        importanceScore: getImportanceScore(event.importanceBand),
        importanceBand: event.importanceBand,
        publishedAt: Date.parse(event.publishedAt),
        discoveredAt: Date.parse(event.publishedAt),
        sourceUrl: event.sourceUrl,
        githubUrl: event.githubUrl,
        visibility: "public" as const,
        updatedAt: Date.now(),
      };

      if (existingEvent) {
        await ctx.db.patch(existingEvent._id, eventPayload);
      } else {
        await ctx.db.insert("changeEvents", {
          ...eventPayload,
          createdAt: Date.now(),
        });
        changeEventCount += 1;
      }
    }

    for (const candidate of mockReviewCandidates) {
      const vendorId = vendorIds.get(candidate.vendorSlug);
      const vendor = vendorRegistry.find((item) => item.slug === candidate.vendorSlug);
      const source = vendor?.sources.find((item) => item.type === candidate.sourceType) ?? vendor?.sources[0];
      const sourceId = source ? sourceIds.get(`${candidate.vendorSlug}:${source.url}`) : undefined;

      if (!vendorId || !sourceId || !source) {
        continue;
      }

      const dedupeKey = `review:${candidate.id}`;
      const existingRaw = await ctx.db
        .query("rawCandidates")
        .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", dedupeKey))
        .unique();

      const importanceBand = getCandidateBand(candidate.parseConfidence);

      const rawPayload = {
        vendorId,
        sourceId,
        externalId: candidate.id,
        sourceUrl: source.url,
        githubUrl: undefined,
        rawTitle: candidate.title,
        rawBody: candidate.rawBody,
        rawPublishedAt: Date.parse(candidate.publishedAt),
        discoveredAt: Date.parse(candidate.publishedAt),
        checksum: dedupeKey,
        parseConfidence: candidate.parseConfidence,
        normalizationVersion: "v1",
        proposedSummary: candidate.rawBody,
        proposedWhatChanged: candidate.rawBody,
        proposedWhyItMatters: "Pending editorial review before this reaches the public feed.",
        proposedWhoShouldCare: ["backend"],
        proposedAffectedStack: ["developer-workflow"],
        proposedCategories: ["docs"],
        importanceScore: getCandidateScore(candidate.parseConfidence),
        importanceBand,
        status: candidate.status,
        dedupeKey,
      };

      if (existingRaw) {
        await ctx.db.patch(existingRaw._id, rawPayload);
      } else {
        await ctx.db.insert("rawCandidates", rawPayload);
        rawCandidateCount += 1;
      }
    }

    return {
      vendors: registrySync.vendorCount,
      sources: registrySync.sourceCount,
      rawCandidates: rawCandidateCount,
      changeEvents: changeEventCount,
    };
  },
});
