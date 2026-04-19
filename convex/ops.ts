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

export const sourceHealth = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const sources = await ctx.db.query("sources").collect();

    const items = await Promise.all(
      sources
        .filter((source) => source.isActive)
        .map(async (source) => {
          const vendor = await ctx.db.get(source.vendorId);

          if (!vendor) {
            return null;
          }

          return {
            vendorName: vendor.name,
            sourceName: source.name,
            status: getStatusForSource(source),
            lastSuccessAt: source.lastSuccessAt ? new Date(source.lastSuccessAt).toISOString() : null,
          };
        }),
    );

    return items
      .filter(Boolean)
      .sort((a, b) => a!.vendorName.localeCompare(b!.vendorName) || a!.sourceName.localeCompare(b!.sourceName));
  },
});
