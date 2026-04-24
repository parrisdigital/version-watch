import { query } from "./_generated/server";
import { v } from "convex/values";

import { isCompletedRefreshStatus } from "./ingestState";

function getStatusForSource(source: any) {
  if ((source.consecutiveFailures ?? 0) >= 3) {
    return "failing";
  }

  if ((source.consecutiveFailures ?? 0) > 0) {
    return "degraded";
  }

  return "healthy";
}

function isCompletedRefreshRun(run: any) {
  return run.finishedAt && isCompletedRefreshStatus(run.status);
}

function formatRefreshRun(run: any) {
  return {
    status: run.status,
    runType: run.runType,
    reason: run.reason ?? null,
    startedAt: new Date(run.startedAt).toISOString(),
    finishedAt: run.finishedAt ? new Date(run.finishedAt).toISOString() : null,
    sourcesProcessed: run.sourcesProcessed,
    itemsFetched: run.itemsFetched,
    itemsCreated: run.itemsCreated,
    itemsDeduped: run.itemsDeduped,
    published: run.published,
    failures: run.failures,
    errorMessage: run.errorMessage ?? null,
  };
}

async function formatSourceHealth(ctx: any, source: any) {
  const vendor = await ctx.db.get(source.vendorId);

  if (!vendor) {
    return null;
  }

  return {
    vendorName: vendor.name,
    sourceName: source.name,
    sourceUrl: source.url,
    status: getStatusForSource(source),
    lastSuccessAt: source.lastSuccessAt ? new Date(source.lastSuccessAt).toISOString() : null,
    lastFailureAt: source.lastFailureAt ? new Date(source.lastFailureAt).toISOString() : null,
    pollIntervalMinutes: source.pollIntervalMinutes,
    consecutiveFailures: source.consecutiveFailures ?? 0,
  };
}

export const sourceHealth = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const sources = await ctx.db.query("sources").collect();

    const items = await Promise.all(
      sources
        .filter((source) => source.isActive)
        .map((source) => formatSourceHealth(ctx, source)),
    );

    return items
      .filter(Boolean)
      .sort((a, b) => a!.vendorName.localeCompare(b!.vendorName) || a!.sourceName.localeCompare(b!.sourceName));
  },
});

export const productionFreshness = query({
  args: {
    sinceHours: v.optional(v.number()),
    eventLimit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const since = now - (args.sinceHours ?? 8) * 60 * 60 * 1000;
    const eventLimit = Math.max(1, Math.min(args.eventLimit ?? 24, 100));
    const sources = await ctx.db.query("sources").collect();
    const sourceById = new Map(sources.map((source) => [source._id, source]));
    const vendorIds = Array.from(new Set(sources.map((source) => source.vendorId)));
    const vendorEntries = await Promise.all(vendorIds.map(async (vendorId) => [vendorId, await ctx.db.get(vendorId)] as const));
    const vendorById = new Map(vendorEntries);
    const events = await ctx.db
      .query("changeEvents")
      .withIndex("by_visibility_and_published", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(eventLimit);
    const ingestionRuns = await ctx.db.query("ingestionRuns").collect();
    const refreshRuns = await ctx.db.query("refreshRuns").withIndex("by_started_at").order("desc").take(100);

    const sourceHealth = await Promise.all(
      sources
        .filter((source) => source.isActive)
        .map((source) => formatSourceHealth(ctx, source)),
    );

    const latestEvents = await Promise.all(
      events.map(async (event) => {
        const vendor = await ctx.db.get(event.vendorId);
        return {
          slug: event.slug,
          vendorName: vendor?.name ?? "Unknown vendor",
          vendorSlug: vendor?.slug ?? "",
          title: event.title,
          importanceBand: event.importanceBand,
          importanceScore: event.importanceScore,
          publishedAt: new Date(event.publishedAt).toISOString(),
          sourceUrl: event.sourceUrl,
        };
      }),
    );

    const recentRuns = ingestionRuns
      .filter((run) => run.startedAt >= since)
      .sort((a, b) => b.startedAt - a.startedAt)
      .map((run) => {
        const source = sourceById.get(run.sourceId);
        const vendor = source ? vendorById.get(source.vendorId) : null;

        return {
          vendorName: vendor?.name ?? "Unknown vendor",
          sourceName: source?.name ?? "Unknown source",
          sourceUrl: source?.url ?? null,
          status: run.status,
          runType: run.runType,
          startedAt: new Date(run.startedAt).toISOString(),
          finishedAt: run.finishedAt ? new Date(run.finishedAt).toISOString() : null,
          itemsFetched: run.itemsFetched,
          itemsCreated: run.itemsCreated,
          itemsDeduped: run.itemsDeduped,
          errorMessage: run.errorMessage ?? null,
        };
      });
    const recentRefreshRuns = refreshRuns
      .filter((run) => run.startedAt >= since)
      .sort((a, b) => b.startedAt - a.startedAt)
      .map(formatRefreshRun);
    const latestFeedRefresh = refreshRuns
      .filter(isCompletedRefreshRun)
      .sort((a, b) => (b.finishedAt ?? b.startedAt) - (a.finishedAt ?? a.startedAt))
      .map(formatRefreshRun)[0] ?? null;

    return {
      checkedAt: new Date(now).toISOString(),
      sinceHours: args.sinceHours ?? 8,
      latestEvents,
      sources: sourceHealth.filter(Boolean).sort((a, b) => {
        return a!.vendorName.localeCompare(b!.vendorName) || a!.sourceName.localeCompare(b!.sourceName);
      }),
      latestFeedRefresh,
      recentRefreshRuns,
      recentRefreshFailureCount: recentRefreshRuns.filter((run) => run.status === "failure").length,
      recentRuns,
      recentFailureCount: recentRuns.filter((run) => run.status === "failure").length,
    };
  },
});
