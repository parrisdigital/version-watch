import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";

import {
  events as mockEvents,
  getSourceSurfaceUrl,
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

const MAX_SOURCES_PER_VENDOR = 50;
// Explicit one-time URL transitions. Reuse the existing source identity so its
// candidates, moderation decisions and ingestion history remain attached.
const SOURCE_URL_MIGRATIONS: Record<string, { from: string; to: string }> = {
  windsurf: { from: "https://docs.devin.ai/desktop/changelog", to: "https://docs.devin.ai/desktop/changelog/rss.xml" },
  exa: { from: "https://exa.ai/docs/changelog", to: "https://exa.ai/docs/changelog/rss.xml" },
  langchain: { from: "https://docs.langchain.com/langsmith/changelog", to: "https://docs.langchain.com/langsmith/changelog/rss.xml" },
  firecrawl: { from: "https://www.firecrawl.dev/changelog", to: "https://www.firecrawl.dev/changelog/rss.xml" },
  linear: { from: "https://linear.app/changelog", to: "https://linear.app/rss/changelog.xml" },
  vercel: { from: "https://vercel.com/changelog", to: "https://vercel.com/atom" },
  "google-antigravity": { from: "https://www.antigravity.google/changelog", to: "https://antigravity.google/docs/changelog" },
};
const CLEAR_CONTENT_BATCH_SIZE = 500;
const MAX_CLEAR_BATCHES_PER_TABLE = 1_000;
const clearContentTableValidator = v.union(
  v.literal("eventLinks"),
  v.literal("changeEvents"),
  v.literal("reviewActions"),
  v.literal("rawCandidates"),
  v.literal("ingestionRuns"),
  v.literal("refreshRuns"),
);
const clearContentCountsValidator = v.object({
  eventLinks: v.number(),
  changeEvents: v.number(),
  rawCandidates: v.number(),
  reviewActions: v.number(),
  ingestionRuns: v.number(),
  refreshRuns: v.number(),
});
const CLEAR_CONTENT_TABLES = [
  "eventLinks",
  "changeEvents",
  "reviewActions",
  "rawCandidates",
  "ingestionRuns",
  "refreshRuns",
] as const;

type ClearContentTable = (typeof CLEAR_CONTENT_TABLES)[number];

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
  if (currentState === "paused" && registryState === "active") {
    return registryState;
  }

  return currentState === "unsupported" ? registryState : currentState;
}

export function buildSourceRegistryPayload(args: {
  existingSource?: any;
  vendorId: any;
  vendorSlug: string;
  source: { name: string; type: string; url: string; surfaceUrl?: string };
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
    surfaceUrl: getSourceSurfaceUrl(args.source),
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

  if (args.existingSource && args.existingSource.url !== args.source.url) {
    // Validators belong to the old response representation, not the new URL.
    // Convex patch removes optional fields when their value is undefined.
    payload.etag = undefined;
    payload.lastModified = undefined;
    payload.contentHash = undefined;
  }

  if (!args.existingSource?.nextDueAt) {
    payload.nextDueAt = latestAttemptAt ? getNextDueAt(latestAttemptAt, freshnessTier) : args.now;
  }

  return payload;
}

export async function resolveRegistrySource(ctx: any, vendorId: any, vendorSlug: string, targetUrl: string) {
  const find = (url: string) => ctx.db
    .query("sources")
    .withIndex("by_vendor_and_url", (q: any) => q.eq("vendorId", vendorId).eq("url", url))
    .unique();
  const target = await find(targetUrl);
  const migration = SOURCE_URL_MIGRATIONS[vendorSlug];
  if (!migration || migration.to !== targetUrl) return target;

  const previous = await find(migration.from);
  if (previous && target && previous._id !== target._id) {
    throw new Error(`Source URL migration collision for ${vendorSlug}: both ${migration.from} and ${targetUrl} exist. Resolve source identities explicitly before syncing.`);
  }
  return target ?? previous;
}

export async function syncVendorRegistryRecords(ctx: any) {
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
      const existingSource = await resolveRegistrySource(ctx, vendorId, vendor.slug, source.url);

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
      .take(MAX_SOURCES_PER_VENDOR + 1);

    if (existingSources.length > MAX_SOURCES_PER_VENDOR) {
      throw new Error(
        `Vendor ${vendor.slug} exceeded the ${MAX_SOURCES_PER_VENDOR}-source registry boundary.`,
      );
    }

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

export const clearContentBatch = internalMutation({
  args: {
    table: clearContentTableValidator,
    limit: v.optional(v.number()),
  },
  returns: v.object({
    deleted: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const limit = Math.min(
      CLEAR_CONTENT_BATCH_SIZE,
      Math.max(1, Math.trunc(args.limit ?? CLEAR_CONTENT_BATCH_SIZE)),
    );
    const rows = await ctx.db.query(args.table).take(limit);

    await Promise.all(rows.map((row) => ctx.db.delete(row._id)));

    return {
      deleted: rows.length,
      hasMore: rows.length === limit,
    };
  },
});

export const clearContent = internalAction({
  args: {},
  returns: clearContentCountsValidator,
  handler: async (ctx) => {
    const counts: Record<ClearContentTable, number> = {
      eventLinks: 0,
      changeEvents: 0,
      reviewActions: 0,
      rawCandidates: 0,
      ingestionRuns: 0,
      refreshRuns: 0,
    };

    for (const table of CLEAR_CONTENT_TABLES) {
      let hasMore = true;

      for (let batch = 0; hasMore; batch += 1) {
        if (batch >= MAX_CLEAR_BATCHES_PER_TABLE) {
          throw new Error(
            `Clearing ${table} exceeded ${MAX_CLEAR_BATCHES_PER_TABLE} batches.`,
          );
        }

        const result: { deleted: number; hasMore: boolean } =
          await ctx.runMutation(internal.seed.clearContentBatch, {
            table,
            limit: CLEAR_CONTENT_BATCH_SIZE,
          });
        counts[table] += result.deleted;
        hasMore = result.hasMore;
      }
    }

    return {
      eventLinks: counts.eventLinks,
      changeEvents: counts.changeEvents,
      rawCandidates: counts.rawCandidates,
      reviewActions: counts.reviewActions,
      ingestionRuns: counts.ingestionRuns,
      refreshRuns: counts.refreshRuns,
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
