import { query } from "./_generated/server";
import { v } from "convex/values";

function sortPublicEvents(a: any, b: any) {
  const aPublishedAt = typeof a.publishedAt === "string" ? Date.parse(a.publishedAt) : a.publishedAt;
  const bPublishedAt = typeof b.publishedAt === "string" ? Date.parse(b.publishedAt) : b.publishedAt;
  const dateDiff = bPublishedAt - aPublishedAt;
  if (dateDiff !== 0) {
    return dateDiff;
  }

  const scoreDiff = b.importanceScore - a.importanceScore;
  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  return 0;
}

async function formatEvent(ctx: any, event: any) {
  const vendor = await ctx.db.get(event.vendorId);
  const source = await ctx.db.get(event.sourceId);
  const rawCandidate = await ctx.db.get(event.rawCandidateId);

  if (!vendor || !source || !rawCandidate) {
    return null;
  }

  return {
    id: event.rawCandidateId,
    slug: event.slug,
    vendorSlug: vendor.slug,
    vendorName: vendor.name,
    title: event.title,
    summary: event.summary,
    whatChanged: event.whatChanged,
    whyItMatters: event.whyItMatters,
    whoShouldCare: event.whoShouldCare,
    affectedStack: event.affectedStack,
    categories: event.categories,
    topicTags: event.topicTags ?? [],
    releaseClass: event.releaseClass,
    impactConfidence: event.impactConfidence,
    signalReasons: event.signalReasons ?? [],
    scoreVersion: event.scoreVersion,
    publishedAt: new Date(event.publishedAt).toISOString(),
    sourceUrl: event.sourceUrl,
    sourceType: source.sourceType,
    sourceName: source.name,
    sourceTitle: rawCandidate.rawTitle,
    importanceBand: event.importanceBand,
    githubUrl: event.githubUrl,
    computedScore: event.importanceScore,
  };
}

export const listPublic = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("changeEvents")
      .withIndex("by_visibility_and_published", (q) => q.eq("visibility", "public"))
      .collect();

    const formatted = await Promise.all(rows.map((row) => formatEvent(ctx, row)));

    return formatted.filter(Boolean).sort(sortPublicEvents);
  },
});

export const homepageFeed = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("changeEvents")
      .withIndex("by_visibility_and_published", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(24);

    const formatted = await Promise.all(rows.map((row) => formatEvent(ctx, row)));

    return formatted.filter(Boolean);
  },
});

export const byVendorSlug = query({
  args: { slug: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!vendor) {
      return [];
    }

    const rows = await ctx.db
      .query("changeEvents")
      .withIndex("by_vendor_and_published", (q) => q.eq("vendorId", vendor._id))
      .filter((q) => q.eq(q.field("visibility"), "public"))
      .collect();

    const formatted = await Promise.all(rows.map((row) => formatEvent(ctx, row)));

    return formatted.filter(Boolean).sort(sortPublicEvents);
  },
});

export const bySlug = query({
  args: { slug: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("changeEvents")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!row || row.visibility !== "public") {
      return null;
    }

    return await formatEvent(ctx, row);
  },
});
