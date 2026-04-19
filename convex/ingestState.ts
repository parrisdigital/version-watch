import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

import { publishRawCandidate } from "./lib/publish";

const normalizedEntryValidator = v.object({
  title: v.string(),
  sourceUrl: v.string(),
  summary: v.string(),
  whatChanged: v.string(),
  whyItMatters: v.string(),
  whoShouldCare: v.array(v.string()),
  affectedStack: v.array(v.string()),
  categories: v.array(v.string()),
  publishedAt: v.number(),
  importanceScore: v.number(),
  importanceBand: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
  parseConfidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  githubUrl: v.optional(v.string()),
});

function buildDedupeKey(sourceId: string, item: { sourceUrl: string; publishedAt: number; title: string }) {
  return `${sourceId}::${item.sourceUrl}::${item.publishedAt}::${item.title.toLowerCase()}`;
}

function shouldPollSource(source: any, now: number, force: boolean) {
  if (force) {
    return true;
  }

  const lastAttemptAt = Math.max(source.lastSuccessAt ?? 0, source.lastFailureAt ?? 0);
  if (!lastAttemptAt) {
    return true;
  }

  return now - lastAttemptAt >= source.pollIntervalMinutes * 60 * 1000;
}

export const listDueSources = internalQuery({
  args: { force: v.boolean() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const now = Date.now();
    const sources = await ctx.db.query("sources").collect();
    const activeSources = sources.filter((source: any) => source.isActive && shouldPollSource(source, now, args.force));

    const hydrated = await Promise.all(
      activeSources.map(async (source: any) => {
        const vendor: any = await ctx.db.get(source.vendorId as any);
        if (!vendor || !vendor.isActive) {
          return null;
        }

        return {
          sourceId: source._id,
          vendorId: vendor._id,
          vendorSlug: vendor.slug,
          vendorName: vendor.name,
          sourceType: source.sourceType,
          name: source.name,
          url: source.url,
          parserKey: source.parserKey,
        };
      }),
    );

    return hydrated
      .filter(Boolean)
      .sort((a, b) => {
        return a!.vendorName.localeCompare(b!.vendorName) || a!.name.localeCompare(b!.name);
      });
  },
});

export const persistSourceEntries = internalMutation({
  args: {
    sourceId: v.id("sources"),
    vendorId: v.id("vendors"),
    startedAt: v.number(),
    runType: v.union(v.literal("scheduled"), v.literal("manual"), v.literal("deep_diff")),
    items: v.array(normalizedEntryValidator),
  },
  returns: v.object({
    itemsFetched: v.number(),
    itemsCreated: v.number(),
    itemsDeduped: v.number(),
    published: v.number(),
    failed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    let itemsCreated = 0;
    let itemsDeduped = 0;
    let published = 0;

    for (const item of args.items) {
      const dedupeKey = buildDedupeKey(String(args.sourceId), item);
      const existingCandidate = await ctx.db
        .query("rawCandidates")
        .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", dedupeKey))
        .unique();

      const rawPayload = {
        vendorId: args.vendorId,
        sourceId: args.sourceId,
        externalId: item.sourceUrl,
        sourceUrl: item.sourceUrl,
        githubUrl: item.githubUrl,
        rawTitle: item.title,
        rawBody: item.summary,
        rawPublishedAt: item.publishedAt,
        discoveredAt: Date.now(),
        checksum: dedupeKey,
        parseConfidence: item.parseConfidence,
        normalizationVersion: "v2",
        proposedSummary: item.summary,
        proposedWhatChanged: item.whatChanged,
        proposedWhyItMatters: item.whyItMatters,
        proposedWhoShouldCare: item.whoShouldCare,
        proposedAffectedStack: item.affectedStack,
        proposedCategories: item.categories,
        importanceScore: item.importanceScore,
        importanceBand: item.importanceBand,
        status: "published" as const,
        dedupeKey,
      };

      let rawCandidate: any = existingCandidate;
      if (existingCandidate) {
        await ctx.db.patch(existingCandidate._id, rawPayload);
        rawCandidate = {
          ...existingCandidate,
          ...rawPayload,
        } as any;
        itemsDeduped += 1;
      } else {
        const insertedId = await ctx.db.insert("rawCandidates", rawPayload);
        rawCandidate = {
          _id: insertedId,
          ...rawPayload,
        } as any;
        itemsCreated += 1;
      }

      const publishedId = await publishRawCandidate(ctx, rawCandidate);
      if (publishedId) {
        published += 1;
      }
    }

    await ctx.db.patch(args.sourceId, {
      lastSuccessAt: Date.now(),
      consecutiveFailures: 0,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("ingestionRuns", {
      sourceId: args.sourceId,
      vendorId: args.vendorId,
      startedAt: args.startedAt,
      finishedAt: Date.now(),
      status: "success",
      itemsFetched: args.items.length,
      itemsCreated,
      itemsDeduped,
      runType: args.runType,
    });

    return {
      itemsFetched: args.items.length,
      itemsCreated,
      itemsDeduped,
      published,
      failed: false,
    };
  },
});

export const persistSourceFailure = internalMutation({
  args: {
    sourceId: v.id("sources"),
    vendorId: v.id("vendors"),
    startedAt: v.number(),
    runType: v.union(v.literal("scheduled"), v.literal("manual"), v.literal("deep_diff")),
    errorMessage: v.string(),
  },
  returns: v.object({
    itemsFetched: v.number(),
    itemsCreated: v.number(),
    itemsDeduped: v.number(),
    published: v.number(),
    failed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);

    await ctx.db.patch(args.sourceId, {
      lastFailureAt: Date.now(),
      consecutiveFailures: (source?.consecutiveFailures ?? 0) + 1,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("ingestionRuns", {
      sourceId: args.sourceId,
      vendorId: args.vendorId,
      startedAt: args.startedAt,
      finishedAt: Date.now(),
      status: "failure",
      itemsFetched: 0,
      itemsCreated: 0,
      itemsDeduped: 0,
      errorMessage: args.errorMessage,
      runType: args.runType,
    });

    return {
      itemsFetched: 0,
      itemsCreated: 0,
      itemsDeduped: 0,
      published: 0,
      failed: true,
    };
  },
});
