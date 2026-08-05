import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";

const GLOBAL_SCOPE_KEY = "global";
const REBUILD_PAGE_SIZE = 500;
const HIGH_SIGNAL_BANDS = new Set(["critical", "high"]);
const sourceTypeValidator = v.union(
  v.literal("github_release"),
  v.literal("changelog_page"),
  v.literal("docs_page"),
  v.literal("blog"),
  v.literal("rss"),
);

type SourceType =
  | "github_release"
  | "changelog_page"
  | "docs_page"
  | "blog"
  | "rss";
type RebuildResult = { rows: number; rebuiltAt: number };

type StatsDelta = {
  vendorSlug: string;
  eventDelta: number;
  highSignalDelta: number;
  audiences?: string[];
  tags?: string[];
  sourceType?: SourceType;
};

function sortedUnique(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
}

function requireAdminSecret(suppliedSecret: string | undefined) {
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    throw new Error("Unauthorized");
  }
}

async function readStatsRow(
  ctx: any,
  scope: "global" | "vendor",
  scopeKey: string,
) {
  return await ctx.db
    .query("publicEventStats")
    .withIndex("by_scope_and_key", (q: any) =>
      q.eq("scope", scope).eq("scopeKey", scopeKey),
    )
    .unique();
}

export async function adjustPublicEventStats(ctx: any, delta: StatsDelta) {
  const global = await readStatsRow(ctx, "global", GLOBAL_SCOPE_KEY);

  // A full rebuild establishes the baseline. Do not create partial counters if
  // ingestion happens during the first deployment window.
  if (!global) {
    return;
  }

  const vendor = await readStatsRow(ctx, "vendor", delta.vendorSlug);
  const now = Date.now();
  const nextAudiences = sortedUnique([
    ...(global.audiences ?? []),
    ...(delta.audiences ?? []),
  ]);
  const nextTags = sortedUnique([
    ...(global.tags ?? []),
    ...(delta.tags ?? []),
  ]);
  const nextSourceTypes = sortedUnique([
    ...(global.sourceTypes ?? []),
    ...(delta.sourceType ? [delta.sourceType] : []),
  ]) as SourceType[];

  await ctx.db.patch(global._id, {
    eventCount: Math.max(0, global.eventCount + delta.eventDelta),
    highSignalCount: Math.max(
      0,
      global.highSignalCount + delta.highSignalDelta,
    ),
    audiences: nextAudiences,
    tags: nextTags,
    sourceTypes: nextSourceTypes,
    updatedAt: now,
  });

  if (vendor) {
    await ctx.db.patch(vendor._id, {
      eventCount: Math.max(0, vendor.eventCount + delta.eventDelta),
      highSignalCount: Math.max(
        0,
        vendor.highSignalCount + delta.highSignalDelta,
      ),
      updatedAt: now,
    });
  } else if (delta.eventDelta > 0) {
    await ctx.db.insert("publicEventStats", {
      scope: "vendor",
      scopeKey: delta.vendorSlug,
      eventCount: delta.eventDelta,
      highSignalCount: Math.max(0, delta.highSignalDelta),
      rebuiltAt: global.rebuiltAt,
      updatedAt: now,
    });
  }
}

export const get = query({
  args: { vendorSlug: v.optional(v.string()) },
  returns: v.object({
    ready: v.boolean(),
    eventCount: v.number(),
    highSignalCount: v.number(),
    updatedAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const scope = args.vendorSlug ? "vendor" : "global";
    const scopeKey = args.vendorSlug ?? GLOBAL_SCOPE_KEY;
    const row = await readStatsRow(ctx, scope, scopeKey);

    return {
      ready: Boolean(row),
      eventCount: row?.eventCount ?? 0,
      highSignalCount: row?.highSignalCount ?? 0,
      updatedAt: row?.updatedAt ?? null,
    };
  },
});

export const taxonomy = query({
  args: {},
  returns: v.object({
    ready: v.boolean(),
    audiences: v.array(v.string()),
    tags: v.array(v.string()),
    sourceTypes: v.array(sourceTypeValidator),
    updatedAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx) => {
    const row = await readStatsRow(ctx, "global", GLOBAL_SCOPE_KEY);

    return {
      ready: Boolean(row),
      audiences: row?.audiences ?? [],
      tags: row?.tags ?? [],
      sourceTypes: row?.sourceTypes ?? [],
      updatedAt: row?.updatedAt ?? null,
    };
  },
});

export const countPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("changeEvents")
      .withIndex("by_visibility_and_published", (q) =>
        q.eq("visibility", "public"),
      )
      .order("asc")
      .paginate(args.paginationOpts);
    const vendorIds = Array.from(
      new Set(result.page.map((event) => String(event.vendorId))),
    );
    const sourceIds = Array.from(
      new Set(result.page.map((event) => String(event.sourceId))),
    );
    const vendorRows = await Promise.all(
      vendorIds.map((id) => ctx.db.get(id as any)),
    );
    const sourceRows = await Promise.all(
      sourceIds.map((id) => ctx.db.get(id as any)),
    );
    const vendorSlugById = new Map(
      vendorRows
        .filter(Boolean)
        .map((vendor: any) => [String(vendor._id), vendor.slug]),
    );
    const sourceTypeById = new Map(
      sourceRows
        .filter(Boolean)
        .map((source: any) => [String(source._id), source.sourceType]),
    );
    const byVendor = new Map<
      string,
      { eventCount: number; highSignalCount: number }
    >();
    const audiences = new Set<string>();
    const tags = new Set<string>();
    const sourceTypes = new Set<SourceType>();
    let highSignalCount = 0;

    for (const event of result.page) {
      const isHighSignal = HIGH_SIGNAL_BANDS.has(event.importanceBand);
      if (isHighSignal) highSignalCount += 1;

      const vendorSlug = vendorSlugById.get(String(event.vendorId));
      if (vendorSlug) {
        const current = byVendor.get(vendorSlug) ?? {
          eventCount: 0,
          highSignalCount: 0,
        };
        current.eventCount += 1;
        if (isHighSignal) current.highSignalCount += 1;
        byVendor.set(vendorSlug, current);
      }

      for (const audience of event.whoShouldCare)
        audiences.add(audience.trim().toLowerCase());
      for (const tag of [
        ...event.categories,
        ...(event.topicTags ?? []),
        ...event.affectedStack,
      ]) {
        tags.add(tag.trim().toLowerCase());
      }
      const sourceType = sourceTypeById.get(String(event.sourceId));
      if (sourceType) sourceTypes.add(sourceType as SourceType);
    }

    return {
      continueCursor: result.continueCursor,
      isDone: result.isDone,
      eventCount: result.page.length,
      highSignalCount,
      byVendor: Array.from(byVendor.entries()).map(([vendorSlug, counts]) => ({
        vendorSlug,
        ...counts,
      })),
      audiences: sortedUnique(Array.from(audiences)),
      tags: sortedUnique(Array.from(tags)),
      sourceTypes: sortedUnique(Array.from(sourceTypes)),
    };
  },
});

export const replace = internalMutation({
  args: {
    eventCount: v.number(),
    highSignalCount: v.number(),
    byVendor: v.array(
      v.object({
        vendorSlug: v.string(),
        eventCount: v.number(),
        highSignalCount: v.number(),
      }),
    ),
    audiences: v.array(v.string()),
    tags: v.array(v.string()),
    sourceTypes: v.array(sourceTypeValidator),
  },
  returns: v.object({ rows: v.number(), rebuiltAt: v.number() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("publicEventStats").take(501);
    if (existing.length > 500) {
      throw new Error(
        "publicEventStats exceeded the supported 500-row rebuild boundary.",
      );
    }
    for (const row of existing) await ctx.db.delete(row._id);

    const rebuiltAt = Date.now();
    await ctx.db.insert("publicEventStats", {
      scope: "global",
      scopeKey: GLOBAL_SCOPE_KEY,
      eventCount: args.eventCount,
      highSignalCount: args.highSignalCount,
      audiences: sortedUnique(args.audiences),
      tags: sortedUnique(args.tags),
      sourceTypes: sortedUnique(args.sourceTypes) as SourceType[],
      rebuiltAt,
      updatedAt: rebuiltAt,
    });

    for (const vendor of args.byVendor) {
      await ctx.db.insert("publicEventStats", {
        scope: "vendor",
        scopeKey: vendor.vendorSlug,
        eventCount: vendor.eventCount,
        highSignalCount: vendor.highSignalCount,
        rebuiltAt,
        updatedAt: rebuiltAt,
      });
    }

    return { rows: args.byVendor.length + 1, rebuiltAt };
  },
});

async function rebuildStats(ctx: any): Promise<RebuildResult> {
  let cursor: string | null = null;
  let isDone = false;
  let eventCount = 0;
  let highSignalCount = 0;
  const byVendor = new Map<
    string,
    { eventCount: number; highSignalCount: number }
  >();
  const audiences = new Set<string>();
  const tags = new Set<string>();
  const sourceTypes = new Set<string>();

  while (!isDone) {
    const page: any = await ctx.runQuery(internal.publicStats.countPage, {
      paginationOpts: { numItems: REBUILD_PAGE_SIZE, cursor },
    });
    eventCount += page.eventCount;
    highSignalCount += page.highSignalCount;
    for (const vendor of page.byVendor) {
      const current = byVendor.get(vendor.vendorSlug) ?? {
        eventCount: 0,
        highSignalCount: 0,
      };
      current.eventCount += vendor.eventCount;
      current.highSignalCount += vendor.highSignalCount;
      byVendor.set(vendor.vendorSlug, current);
    }
    for (const audience of page.audiences) audiences.add(audience);
    for (const tag of page.tags) tags.add(tag);
    for (const sourceType of page.sourceTypes) sourceTypes.add(sourceType);
    cursor = page.continueCursor;
    isDone = page.isDone;
  }

  return await ctx.runMutation(internal.publicStats.replace, {
    eventCount,
    highSignalCount,
    byVendor: Array.from(byVendor.entries()).map(([vendorSlug, counts]) => ({
      vendorSlug,
      ...counts,
    })),
    audiences: Array.from(audiences),
    tags: Array.from(tags),
    sourceTypes: Array.from(sourceTypes),
  });
}

export const rebuildInternal: ReturnType<typeof internalAction> =
  internalAction({
    args: {},
    returns: v.object({ rows: v.number(), rebuiltAt: v.number() }),
    handler: async (ctx) => await rebuildStats(ctx),
  });

export const ensureInitialized = internalAction({
  args: {},
  returns: v.object({ rebuilt: v.boolean() }),
  handler: async (ctx) => {
    const state: any = await ctx.runQuery(internal.publicStats.getInternal, {});
    if (state.ready) return { rebuilt: false };
    await rebuildStats(ctx);
    return { rebuilt: true };
  },
});

export const getInternal = internalQuery({
  args: {},
  returns: v.object({ ready: v.boolean() }),
  handler: async (ctx) => ({
    ready: Boolean(await readStatsRow(ctx, "global", GLOBAL_SCOPE_KEY)),
  }),
});

export const rebuild = action({
  args: { adminSecret: v.string() },
  returns: v.object({ rows: v.number(), rebuiltAt: v.number() }),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);
    return await rebuildStats(ctx);
  },
});
