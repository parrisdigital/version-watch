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

function comparePublicUpdateEvents(a: any, b: any) {
  const aPublishedAt = typeof a.publishedAt === "string" ? Date.parse(a.publishedAt) : a.publishedAt;
  const bPublishedAt = typeof b.publishedAt === "string" ? Date.parse(b.publishedAt) : b.publishedAt;
  const dateDiff = bPublishedAt - aPublishedAt;
  if (dateDiff !== 0) {
    return dateDiff;
  }

  return a.slug.localeCompare(b.slug);
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
    sourceSurfaceUrl: source.url,
    sourceSurfaceName: source.name,
    sourceSurfaceType: source.sourceType,
    sourceTitle: rawCandidate.rawTitle,
    importanceBand: event.importanceBand,
    githubUrl: event.githubUrl,
    computedScore: event.importanceScore,
  };
}

const PUBLIC_UPDATE_SCAN_LIMIT = 5000;
const MAX_FUTURE_SKEW_MS = 60 * 60 * 1000;
const importanceBandValidator = v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"));
const releaseClassValidator = v.union(
  v.literal("breaking"),
  v.literal("security"),
  v.literal("model_launch"),
  v.literal("pricing"),
  v.literal("policy"),
  v.literal("api_change"),
  v.literal("sdk_release"),
  v.literal("cli_patch"),
  v.literal("beta_release"),
  v.literal("docs_update"),
  v.literal("routine_release"),
);

function normalize(value: string | undefined | null) {
  return (value ?? "").trim().toLowerCase();
}

function matchesPublicUpdateFilters(event: any, args: any, now: number) {
  if (event.publishedAt - now > MAX_FUTURE_SKEW_MS) {
    return false;
  }

  if (args.sinceTimestamp !== undefined && event.publishedAt < args.sinceTimestamp) {
    return false;
  }

  if (args.severity && event.importanceBand !== args.severity) {
    return false;
  }

  if (args.releaseClass && event.releaseClass !== args.releaseClass) {
    return false;
  }

  if (args.audience && !event.whoShouldCare.some((item: string) => normalize(item) === args.audience)) {
    return false;
  }

  if (
    args.tag &&
    ![...event.categories, ...(event.topicTags ?? []), ...event.affectedStack].some(
      (item: string) => normalize(item) === args.tag,
    )
  ) {
    return false;
  }

  return true;
}

function isAfterPublicUpdateCursor(event: any, args: any) {
  if (args.cursorPublishedAt === undefined || !args.cursorId) {
    return true;
  }

  const publishedDiff = args.cursorPublishedAt - event.publishedAt;
  if (publishedDiff !== 0) {
    return publishedDiff > 0;
  }

  return event.slug.localeCompare(args.cursorId) > 0;
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

export const listPublicUpdatesPage = query({
  args: {
    vendor: v.optional(v.string()),
    sinceTimestamp: v.optional(v.number()),
    severity: v.optional(importanceBandValidator),
    releaseClass: v.optional(releaseClassValidator),
    audience: v.optional(v.string()),
    tag: v.optional(v.string()),
    cursorPublishedAt: v.optional(v.number()),
    cursorId: v.optional(v.string()),
    limit: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(Math.trunc(args.limit), 100));
    const scanLimit = Math.max(200, Math.min(PUBLIC_UPDATE_SCAN_LIMIT, limit * 50));
    const now = Date.now();
    let rows: any[];

    if (args.vendor) {
      const vendor = await ctx.db
        .query("vendors")
        .withIndex("by_slug", (q) => q.eq("slug", args.vendor!))
        .unique();

      if (!vendor) {
        return {
          events: [],
          totalCount: 0,
          hasMore: false,
        };
      }

      rows = await ctx.db
        .query("changeEvents")
        .withIndex("by_vendor_and_published", (q) => q.eq("vendorId", vendor._id))
        .filter((q) => q.eq(q.field("visibility"), "public"))
        .order("desc")
        .take(scanLimit);
    } else if (args.severity) {
      rows = await ctx.db
        .query("changeEvents")
        .withIndex("by_importance_and_published", (q) => q.eq("importanceBand", args.severity!))
        .filter((q) => q.eq(q.field("visibility"), "public"))
        .order("desc")
        .take(scanLimit);
    } else {
      rows = await ctx.db
        .query("changeEvents")
        .withIndex("by_visibility_and_published", (q) => q.eq("visibility", "public"))
        .order("desc")
        .take(scanLimit);
    }

    const matches = rows
      .filter((row) => matchesPublicUpdateFilters(row, args, now))
      .sort(comparePublicUpdateEvents);
    const eligible = matches.filter((row) => isAfterPublicUpdateCursor(row, args));
    const pageRows = eligible.slice(0, limit);
    const formatted = await Promise.all(pageRows.map((row) => formatEvent(ctx, row)));

    return {
      events: formatted.filter(Boolean),
      totalCount: matches.length,
      hasMore: eligible.length > limit || rows.length === scanLimit,
    };
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
