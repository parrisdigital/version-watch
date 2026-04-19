import { query } from "./_generated/server";
import { v } from "convex/values";

async function getVendorSources(ctx: any, vendorId: any) {
  const sources: any[] = await ctx.db
    .query("sources")
    .withIndex("by_vendor", (q: any) => q.eq("vendorId", vendorId as never))
    .collect();

  return sources
    .slice()
    .sort((a: any, b: any) => a.pollIntervalMinutes - b.pollIntervalMinutes || a.name.localeCompare(b.name))
    .map((source: any) => ({
      name: source.name,
      url: source.url,
      type: source.sourceType,
    }));
}

export const list = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const items: any[] = await ctx.db
      .query("vendors")
      .withIndex("by_active_and_sort_order", (q) => q.eq("isActive", true))
      .collect();

    const sorted = items.slice().sort((a: any, b: any) => a.sortOrder - b.sortOrder);

    return await Promise.all(
      sorted.map(async (vendor: any) => ({
        slug: vendor.slug,
        name: vendor.name,
        description: vendor.description,
        sources: await getVendorSources(ctx, vendor._id),
      })),
    );
  },
});

export const bySlug = query({
  args: { slug: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!vendor || !vendor.isActive) {
      return null;
    }

    return {
      slug: vendor.slug,
      name: vendor.name,
      description: vendor.description,
      sources: await getVendorSources(ctx, vendor._id),
    };
  },
});
