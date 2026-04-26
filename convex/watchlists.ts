import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
const webhookTypeValidator = v.union(v.literal("discord"), v.literal("slack"), v.literal("generic"));

function requireAdminSecret(suppliedSecret: string | undefined) {
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    throw new Error("Unauthorized");
  }
}

function clampText(value: string | undefined, maxLength: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeValues(values: string[] | undefined, maxItems = 25) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => clampText(value, 80).toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, maxItems);
}

function normalizeWebhookUrl(value: string | undefined) {
  const raw = clampText(value, 2000);
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function redactWebhookUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname.slice(0, 24)}...`;
  } catch {
    return "configured";
  }
}

export const list = query({
  args: { adminSecret: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);

    const rows = await ctx.db.query("watchlists").collect();

    return rows
      .map((row) => ({
        id: row._id,
        name: row.name,
        description: row.description ?? null,
        is_active: row.isActive,
        vendor_slugs: row.vendorSlugs,
        severities: row.severities,
        audiences: row.audiences,
        tags: row.tags,
        release_classes: row.releaseClasses,
        webhook_type: row.webhookType,
        webhook_url_redacted: redactWebhookUrl(row.webhookUrl),
        created_at: new Date(row.createdAt).toISOString(),
        updated_at: new Date(row.updatedAt).toISOString(),
        last_dispatch_at: row.lastDispatchAt ? new Date(row.lastDispatchAt).toISOString() : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const upsert = mutation({
  args: {
    adminSecret: v.string(),
    id: v.optional(v.id("watchlists")),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    vendorSlugs: v.optional(v.array(v.string())),
    severities: v.optional(v.array(importanceBandValidator)),
    audiences: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    releaseClasses: v.optional(v.array(releaseClassValidator)),
    webhookType: webhookTypeValidator,
    webhookUrl: v.optional(v.string()),
  },
  returns: v.object({ id: v.id("watchlists") }),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);

    const now = Date.now();
    const name = clampText(args.name, 120);
    if (!name) throw new Error("Watchlist name is required.");

    const existing = args.id ? await ctx.db.get(args.id) : null;
    const webhookUrl = normalizeWebhookUrl(args.webhookUrl) ?? existing?.webhookUrl ?? null;
    if (!webhookUrl) throw new Error("A valid HTTPS webhook URL is required.");

    const patch = {
      name,
      description: clampText(args.description, 500) || undefined,
      isActive: args.isActive ?? existing?.isActive ?? true,
      vendorSlugs: normalizeValues(args.vendorSlugs),
      severities: args.severities ?? [],
      audiences: normalizeValues(args.audiences),
      tags: normalizeValues(args.tags),
      releaseClasses: args.releaseClasses ?? [],
      webhookType: args.webhookType,
      webhookUrl,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return { id: existing._id };
    }

    const id = await ctx.db.insert("watchlists", {
      ...patch,
      createdAt: now,
    });

    return { id };
  },
});

export const dispatchState = query({
  args: {
    adminSecret: v.string(),
    watchlistId: v.optional(v.id("watchlists")),
  },
  returns: v.object({
    watchlists: v.array(v.any()),
    deliveries: v.array(v.any()),
  }),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);

    const watchlists = args.watchlistId
      ? [await ctx.db.get(args.watchlistId)].filter(Boolean)
      : await ctx.db.query("watchlists").withIndex("by_active", (q) => q.eq("isActive", true)).collect();
    const deliveries = await ctx.db.query("watchlistDeliveries").collect();
    const watchlistIds = new Set(watchlists.map((watchlist: any) => String(watchlist._id)));

    return {
      watchlists: watchlists.map((watchlist: any) => ({
        id: watchlist._id,
        name: watchlist.name,
        description: watchlist.description ?? null,
        is_active: watchlist.isActive,
        vendor_slugs: watchlist.vendorSlugs,
        severities: watchlist.severities,
        audiences: watchlist.audiences,
        tags: watchlist.tags,
        release_classes: watchlist.releaseClasses,
        webhook_type: watchlist.webhookType,
        webhook_url: watchlist.webhookUrl,
      })),
      deliveries: deliveries
        .filter((delivery) => watchlistIds.has(String(delivery.watchlistId)) && delivery.status === "sent")
        .map((delivery) => ({
          watchlist_id: delivery.watchlistId,
          event_slug: delivery.eventSlug,
          status: delivery.status,
        })),
    };
  },
});

export const recordDelivery = mutation({
  args: {
    adminSecret: v.string(),
    watchlistId: v.id("watchlists"),
    eventSlug: v.string(),
    status: v.union(v.literal("sent"), v.literal("failure"), v.literal("skipped")),
    responseStatus: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);

    const now = Date.now();
    await ctx.db.insert("watchlistDeliveries", {
      watchlistId: args.watchlistId,
      eventSlug: args.eventSlug,
      status: args.status,
      attemptedAt: now,
      responseStatus: args.responseStatus,
      errorMessage: clampText(args.errorMessage, 500) || undefined,
    });
    await ctx.db.patch(args.watchlistId, { lastDispatchAt: now, updatedAt: now });

    return { ok: true };
  },
});
