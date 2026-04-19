import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listPending = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("rawCandidates")
      .withIndex("by_status_and_published", (q) => q.eq("status", "pending_review"))
      .collect();

    const items = await Promise.all(
      rows.map(async (candidate) => {
        const vendor = await ctx.db.get(candidate.vendorId);
        const source = await ctx.db.get(candidate.sourceId);

        if (!vendor || !source) {
          return null;
        }

        return {
          id: candidate._id,
          vendorSlug: vendor.slug,
          vendorName: vendor.name,
          title: candidate.rawTitle,
          sourceType: source.sourceType,
          publishedAt: new Date(candidate.rawPublishedAt).toISOString(),
          status: candidate.status,
          parseConfidence: candidate.parseConfidence,
          rawBody: candidate.rawBody,
        };
      }),
    );

    return items
      .filter(Boolean)
      .sort((a, b) => new Date(b!.publishedAt).getTime() - new Date(a!.publishedAt).getTime());
  },
});

export const approve = mutation({
  args: { rawCandidateId: v.id("rawCandidates"), performedBy: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.rawCandidateId, { status: "published" });
    await ctx.db.insert("reviewActions", {
      rawCandidateId: args.rawCandidateId,
      action: "approve",
      performedAt: Date.now(),
      performedBy: args.performedBy,
    });
    return null;
  },
});
