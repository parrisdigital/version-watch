import { mutation } from "./_generated/server";
import { v } from "convex/values";

function clampText(value: string | undefined, maxLength: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export const submit = mutation({
  args: {
    eventSlug: v.string(),
    signal: v.union(v.literal("impacted"), v.literal("needs_review"), v.literal("no_impact")),
    area: v.union(
      v.literal("api"),
      v.literal("auth"),
      v.literal("billing"),
      v.literal("deployments"),
      v.literal("sdk"),
      v.literal("security"),
      v.literal("mobile"),
      v.literal("ai_agents"),
      v.literal("docs"),
      v.literal("other"),
    ),
    note: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    if (clampText(args.company, 200)) {
      return { ok: true };
    }

    const event = await ctx.db
      .query("changeEvents")
      .withIndex("by_slug", (q) => q.eq("slug", args.eventSlug))
      .unique();

    if (!event || event.visibility !== "public") {
      throw new Error("Unknown event.");
    }

    await ctx.db.insert("eventRelevanceSignals", {
      eventSlug: args.eventSlug,
      signal: args.signal,
      area: args.area,
      note: clampText(args.note, 500) || undefined,
      userAgent: clampText(args.userAgent, 500) || undefined,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});
