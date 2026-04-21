import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { publishRawCandidate } from "./lib/publish";

function requireAdminSecret(suppliedSecret: string | undefined) {
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    throw new Error("Unauthorized");
  }
}

async function recordReviewAction(
  ctx: any,
  rawCandidateId: any,
  action: "approve" | "reject" | "suppress",
  performedBy: string,
) {
  await ctx.db.insert("reviewActions", {
    rawCandidateId,
    action,
    performedAt: Date.now(),
    performedBy,
  });
}

export const listPending = query({
  args: { adminSecret: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);

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
  args: {
    rawCandidateId: v.id("rawCandidates"),
    performedBy: v.string(),
    adminSecret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);

    const rawCandidate = await ctx.db.get(args.rawCandidateId);

    if (!rawCandidate) {
      return null;
    }

    await ctx.db.patch(args.rawCandidateId, { status: "published" });
    await publishRawCandidate(ctx, {
      ...rawCandidate,
      status: "published",
    });
    await recordReviewAction(ctx, args.rawCandidateId, "approve", args.performedBy);
    return null;
  },
});

export const reject = mutation({
  args: {
    rawCandidateId: v.id("rawCandidates"),
    performedBy: v.string(),
    adminSecret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);

    const rawCandidate = await ctx.db.get(args.rawCandidateId);

    if (!rawCandidate) {
      return null;
    }

    await ctx.db.patch(args.rawCandidateId, { status: "rejected" });
    await recordReviewAction(ctx, args.rawCandidateId, "reject", args.performedBy);
    return null;
  },
});

export const suppress = mutation({
  args: {
    rawCandidateId: v.id("rawCandidates"),
    performedBy: v.string(),
    adminSecret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);

    const rawCandidate = await ctx.db.get(args.rawCandidateId);

    if (!rawCandidate) {
      return null;
    }

    await ctx.db.patch(args.rawCandidateId, { status: "suppressed" });
    await recordReviewAction(ctx, args.rawCandidateId, "suppress", args.performedBy);
    return null;
  },
});
