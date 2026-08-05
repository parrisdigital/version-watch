import { query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

function sortPublicEvents(a: any, b: any) {
  const aPublishedAt =
    typeof a.publishedAt === "string"
      ? Date.parse(a.publishedAt)
      : a.publishedAt;
  const bPublishedAt =
    typeof b.publishedAt === "string"
      ? Date.parse(b.publishedAt)
      : b.publishedAt;
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
  const aPublishedAt =
    typeof a.publishedAt === "string"
      ? Date.parse(a.publishedAt)
      : a.publishedAt;
  const bPublishedAt =
    typeof b.publishedAt === "string"
      ? Date.parse(b.publishedAt)
      : b.publishedAt;
  const dateDiff = bPublishedAt - aPublishedAt;
  if (dateDiff !== 0) {
    return dateDiff;
  }

  return a.slug.localeCompare(b.slug);
}

async function formatEvent(ctx: any, event: any) {
  const vendor = await ctx.db.get(event.vendorId);
  const source = await ctx.db.get(event.sourceId);

  if (!vendor || !source) {
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
    sourceSurfaceUrl: source.surfaceUrl ?? source.url,
    sourceSurfaceName: source.name,
    sourceSurfaceType: source.sourceType,
    sourceTitle: event.sourceTitle ?? event.title,
    importanceBand: event.importanceBand,
    githubUrl: event.githubUrl,
    computedScore: event.importanceScore,
  };
}

const LEGACY_PUBLIC_EVENT_LIMIT = 1000;
const PUBLIC_UPDATE_SCAN_LIMIT = 1000;
const MAX_FUTURE_SKEW_MS = 60 * 60 * 1000;
const importanceBandValidator = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);
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
const sourceTypeValidator = v.union(
  v.literal("github_release"),
  v.literal("changelog_page"),
  v.literal("docs_page"),
  v.literal("blog"),
  v.literal("rss"),
);

function normalize(value: string | undefined | null) {
  return (value ?? "").trim().toLowerCase();
}

function matchesPublicUpdateFilters(event: any, args: any, now: number) {
  if (event.publishedAt - now > MAX_FUTURE_SKEW_MS) {
    return false;
  }

  if (
    args.sinceTimestamp !== undefined &&
    event.publishedAt < args.sinceTimestamp
  ) {
    return false;
  }

  if (
    args.query &&
    ![
      event.title,
      event.summary,
      event.whatChanged,
      event.whyItMatters,
      ...event.whoShouldCare,
      ...event.categories,
      ...(event.topicTags ?? []),
      ...event.affectedStack,
    ]
      .join(" ")
      .toLowerCase()
      .includes(args.query)
  ) {
    return false;
  }

  if (args.severity && event.importanceBand !== args.severity) {
    return false;
  }

  if (args.releaseClass && event.releaseClass !== args.releaseClass) {
    return false;
  }

  if (
    args.audience &&
    !event.whoShouldCare.some(
      (item: string) => normalize(item) === args.audience,
    )
  ) {
    return false;
  }

  if (
    args.tag &&
    ![
      ...event.categories,
      ...(event.topicTags ?? []),
      ...event.affectedStack,
    ].some((item: string) => normalize(item) === args.tag)
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
      .withIndex("by_visibility_and_published", (q) =>
        q.eq("visibility", "public"),
      )
      .order("desc")
      .take(LEGACY_PUBLIC_EVENT_LIMIT);

    const formatted = await Promise.all(
      rows.map((row) => formatEvent(ctx, row)),
    );

    return formatted.filter(Boolean).sort(sortPublicEvents);
  },
});

export const listPublicUpdatesPage = query({
  args: {
    vendor: v.optional(v.string()),
    query: v.optional(v.string()),
    sourceType: v.optional(sourceTypeValidator),
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
    const scanLimit = Math.max(
      200,
      Math.min(PUBLIC_UPDATE_SCAN_LIMIT, limit * 50),
    );
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
          totalCountIsExact: true,
          hasMore: false,
          nextCursor: null,
        };
      }

      rows = await ctx.db
        .query("changeEvents")
        .withIndex("by_vendor_visibility_and_published", (q) =>
          args.cursorPublishedAt === undefined
            ? q.eq("vendorId", vendor._id).eq("visibility", "public")
            : q
                .eq("vendorId", vendor._id)
                .eq("visibility", "public")
                .lte("publishedAt", args.cursorPublishedAt),
        )
        .order("desc")
        .take(scanLimit);
    } else if (args.severity) {
      rows = await ctx.db
        .query("changeEvents")
        .withIndex("by_importance_visibility_and_published", (q) =>
          args.cursorPublishedAt === undefined
            ? q.eq("importanceBand", args.severity!).eq("visibility", "public")
            : q
                .eq("importanceBand", args.severity!)
                .eq("visibility", "public")
                .lte("publishedAt", args.cursorPublishedAt),
        )
        .order("desc")
        .take(scanLimit);
    } else {
      rows = await ctx.db
        .query("changeEvents")
        .withIndex("by_visibility_and_published", (q) =>
          args.cursorPublishedAt === undefined
            ? q.eq("visibility", "public")
            : q
                .eq("visibility", "public")
                .lte("publishedAt", args.cursorPublishedAt),
        )
        .order("desc")
        .take(scanLimit);
    }

    let sourceMatches: Set<string> | null = null;
    if (args.sourceType) {
      const sourceIds = Array.from(
        new Set(rows.map((row) => String(row.sourceId))),
      );
      const sources = await Promise.all(
        sourceIds.map((id) => ctx.db.get(id as any)),
      );
      sourceMatches = new Set(
        sources
          .filter((source: any) => source?.sourceType === args.sourceType)
          .map((source: any) => String(source._id)),
      );
    }

    const matches = rows
      .filter(
        (row) => !sourceMatches || sourceMatches.has(String(row.sourceId)),
      )
      .filter((row) => matchesPublicUpdateFilters(row, args, now))
      .sort(comparePublicUpdateEvents);
    const eligible = matches.filter((row) =>
      isAfterPublicUpdateCursor(row, args),
    );
    const pageRows = eligible.slice(0, limit);
    const formatted = await Promise.all(
      pageRows.map((row) => formatEvent(ctx, row)),
    );
    const lastReturned = pageRows[pageRows.length - 1];
    const lastScanned = rows[rows.length - 1];
    const nextRow =
      eligible.length > limit
        ? lastReturned
        : rows.length === scanLimit
          ? lastScanned
          : undefined;
    const hasExactStats =
      args.sinceTimestamp === undefined &&
      args.query === undefined &&
      args.sourceType === undefined &&
      args.severity === undefined &&
      args.releaseClass === undefined &&
      args.audience === undefined &&
      args.tag === undefined;
    const statsScope = args.vendor ? "vendor" : "global";
    const statsKey = args.vendor ?? "global";
    const stats = hasExactStats
      ? await ctx.db
          .query("publicEventStats")
          .withIndex("by_scope_and_key", (q) =>
            q.eq("scope", statsScope).eq("scopeKey", statsKey),
          )
          .unique()
      : null;

    return {
      events: formatted.filter(Boolean),
      totalCount: stats?.eventCount ?? null,
      totalCountIsExact: Boolean(stats),
      hasMore: Boolean(nextRow),
      nextCursor: nextRow
        ? { publishedAt: nextRow.publishedAt, id: nextRow.slug }
        : null,
    };
  },
});

export const homepageFeed = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("changeEvents")
      .withIndex("by_visibility_and_published", (q) =>
        q.eq("visibility", "public"),
      )
      .order("desc")
      .take(24);

    const formatted = await Promise.all(
      rows.map((row) => formatEvent(ctx, row)),
    );

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
      .withIndex("by_vendor_visibility_and_published", (q) =>
        q.eq("vendorId", vendor._id).eq("visibility", "public"),
      )
      .order("desc")
      .take(100);

    const formatted = await Promise.all(
      rows.map((row) => formatEvent(ctx, row)),
    );

    return formatted.filter(Boolean).sort(sortPublicEvents);
  },
});

export const adjacentBySlug = query({
  args: { slug: v.string() },
  returns: v.object({
    newer: v.union(v.object({ slug: v.string(), title: v.string() }), v.null()),
    older: v.union(v.object({ slug: v.string(), title: v.string() }), v.null()),
  }),
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("changeEvents")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!current || current.visibility !== "public") {
      return { newer: null, older: null };
    }

    const [newerRows, olderRows] = await Promise.all([
      ctx.db
        .query("changeEvents")
        .withIndex("by_vendor_visibility_and_published", (q) =>
          q
            .eq("vendorId", current.vendorId)
            .eq("visibility", "public")
            .gte("publishedAt", current.publishedAt),
        )
        .order("asc")
        .take(3),
      ctx.db
        .query("changeEvents")
        .withIndex("by_vendor_visibility_and_published", (q) =>
          q
            .eq("vendorId", current.vendorId)
            .eq("visibility", "public")
            .lte("publishedAt", current.publishedAt),
        )
        .order("desc")
        .take(3),
    ]);
    const newerCandidates = newerRows
      .filter((event) => event._id !== current._id)
      .sort(
        (a, b) => a.publishedAt - b.publishedAt || a.slug.localeCompare(b.slug),
      );
    const olderCandidates = olderRows
      .filter((event) => event._id !== current._id)
      .sort(
        (a, b) => b.publishedAt - a.publishedAt || a.slug.localeCompare(b.slug),
      );
    const newer = newerCandidates[0];
    const older = olderCandidates[0];

    return {
      newer: newer ? { slug: newer.slug, title: newer.title } : null,
      older: older ? { slug: older.slug, title: older.title } : null,
    };
  },
});

export const listPublicSitemapPage = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("changeEvents")
      .withIndex("by_visibility_and_published", (q) =>
        q.eq("visibility", "public"),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      page: result.page.map((event) => ({
        slug: event.slug,
        publishedAt: new Date(event.publishedAt).toISOString(),
      })),
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
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
