import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function requireAdminSecret(suppliedSecret: string | undefined) {
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    throw new Error("Unauthorized");
  }
}

function clampText(value: string | undefined, maxLength: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeUrl(value: string | undefined) {
  const url = clampText(value, 1000);
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export const submit = mutation({
  args: {
    type: v.union(
      v.literal("suggest_vendor"),
      v.literal("missing_update"),
      v.literal("wrong_signal"),
      v.literal("incorrect_summary"),
      v.literal("general"),
    ),
    message: v.string(),
    pageUrl: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    if (clampText(args.company, 200)) {
      return { ok: true };
    }

    const message = clampText(args.message, 4000);
    if (message.length < 8) {
      throw new Error("Feedback message is too short.");
    }

    const payload = {
      type: args.type,
      message,
      pageUrl: normalizeUrl(args.pageUrl),
      userAgent: clampText(args.userAgent, 500) || undefined,
    };
    const now = Date.now();

    await ctx.db.insert("feedbackSubmissions", {
      ...payload,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true };
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
