import { query } from "./_generated/server";
import { v } from "convex/values";

function getStatusForSource(source: any) {
  if ((source.consecutiveFailures ?? 0) >= 3) {
    return "failing";
  }

  if ((source.consecutiveFailures ?? 0) > 0) {
    return "degraded";
  }

  return "healthy";
}

async function formatSourceHealth(ctx: any, source: any) {
  const vendor = await ctx.db.get(source.vendorId);

  if (!vendor) {
    return null;
  }

  return {
    vendorName: vendor.name,
    sourceName: source.name,
    status: getStatusForSource(source),
    lastSuccessAt: source.lastSuccessAt ? new Date(source.lastSuccessAt).toISOString() : null,
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
    const events = await ctx.db
      .query("changeEvents")
      .withIndex("by_visibility_and_published", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(eventLimit);
    const ingestionRuns = await ctx.db.query("ingestionRuns").collect();

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
      .map((run) => ({
        status: run.status,
        runType: run.runType,
        startedAt: new Date(run.startedAt).toISOString(),
        finishedAt: run.finishedAt ? new Date(run.finishedAt).toISOString() : null,
        itemsFetched: run.itemsFetched,
        itemsCreated: run.itemsCreated,
        itemsDeduped: run.itemsDeduped,
        errorMessage: run.errorMessage ?? null,
      }));

    return {
      checkedAt: new Date(now).toISOString(),
      sinceHours: args.sinceHours ?? 8,
      latestEvents,
      sources: sourceHealth.filter(Boolean).sort((a, b) => {
        return a!.vendorName.localeCompare(b!.vendorName) || a!.sourceName.localeCompare(b!.sourceName);
      }),
      recentRuns,
      recentFailureCount: recentRuns.filter((run) => run.status === "failure").length,
    };
  },
});
