import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

function requireAdminSecret(suppliedSecret: string | undefined) {
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    throw new Error("Unauthorized");
  }
}

export const store = internalMutation({
  args: {
    type: v.union(
      v.literal("suggest_vendor"),
      v.literal("missing_update"),
      v.literal("wrong_signal"),
      v.literal("incorrect_summary"),
      v.literal("general"),
    ),
    message: v.string(),
    email: v.optional(v.string()),
    pageUrl: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.id("feedbackSubmissions"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("feedbackSubmissions", {
      ...args,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const markNotificationResult = internalMutation({
  args: {
    feedbackId: v.id("feedbackSubmissions"),
    status: v.union(v.literal("emailed"), v.literal("email_failed"), v.literal("email_skipped")),
    notificationError: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const update = {
      status: args.status,
      updatedAt: Date.now(),
      ...(args.notificationError ? { notificationError: args.notificationError } : {}),
    };

    await ctx.db.patch(args.feedbackId, update);
    return null;
  },
});

export const listRecent = query({
  args: {
    adminSecret: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);

    return await ctx.db
      .query("feedbackSubmissions")
      .withIndex("by_created_at")
      .order("desc")
      .take(Math.max(1, Math.min(args.limit ?? 50, 100)));
  },
});
