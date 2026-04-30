import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { publishRawCandidate } from "./lib/publish";
import { deriveSignalMetadataForEvents } from "../src/lib/classification/signal";

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

export const rescoreSignalV2 = mutation({
  args: {
    adminSecret: v.string(),
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    scanned: v.number(),
    updated: v.number(),
    skipped: v.number(),
    samples: v.array(
      v.object({
        slug: v.string(),
        previousScore: v.number(),
        nextScore: v.number(),
        previousBand: v.string(),
        nextBand: v.string(),
        releaseClass: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);

    const limit = Math.min(Math.max(args.limit ?? 1000, 1), 2000);
    const rows = await ctx.db
      .query("changeEvents")
      .withIndex("by_visibility_and_published", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(limit);
    const hydrated = (
      await Promise.all(
        rows.map(async (event) => {
          const vendor = await ctx.db.get(event.vendorId);
          const source = await ctx.db.get(event.sourceId);
          const rawCandidate = await ctx.db.get(event.rawCandidateId);

          if (!vendor || !source || !rawCandidate) {
            return null;
          }

          return {
            event,
            rawCandidate,
            input: {
              id: String(event._id),
              slug: event.slug,
              vendorSlug: vendor.slug,
              vendorName: vendor.name,
              title: rawCandidate.rawTitle || event.title,
              summary: event.summary,
              whatChanged: event.whatChanged,
              whyItMatters: event.whyItMatters,
              categories: event.categories,
              affectedStack: event.affectedStack,
              publishedAt: new Date(event.publishedAt).toISOString(),
              sourceUrl: event.sourceUrl,
              sourceType: source.sourceType,
              sourceName: source.name,
              sourceTitle: rawCandidate.rawTitle,
              githubUrl: event.githubUrl,
            },
          };
        }),
      )
    ).filter(Boolean) as Array<{
      event: any;
      rawCandidate: any;
      input: any;
    }>;

    const rescored = deriveSignalMetadataForEvents(hydrated.map((item) => item.input));
    let updated = 0;
    let skipped = 0;
    const samples = [];

    for (let index = 0; index < hydrated.length; index += 1) {
      const item = hydrated[index]!;
      const metadata = rescored[index]!.metadata;
      const eventPatch = {
        title: metadata.displayTitle,
        whyItMatters: metadata.whyItMatters,
        topicTags: metadata.topicTags,
        releaseClass: metadata.releaseClass,
        impactConfidence: metadata.impactConfidence,
        signalReasons: metadata.signalReasons,
        scoreVersion: metadata.scoreVersion,
        importanceScore: metadata.signalScore,
        importanceBand: metadata.importanceBand,
        updatedAt: Date.now(),
      };
      const rawPatch = {
        proposedTitle: metadata.displayTitle,
        proposedWhyItMatters: metadata.whyItMatters,
        proposedTopicTags: metadata.topicTags,
        releaseClass: metadata.releaseClass,
        impactConfidence: metadata.impactConfidence,
        signalReasons: metadata.signalReasons,
        scoreVersion: metadata.scoreVersion,
        importanceScore: metadata.signalScore,
        importanceBand: metadata.importanceBand,
      };
      const changed =
        item.event.scoreVersion !== metadata.scoreVersion ||
        item.event.importanceScore !== metadata.signalScore ||
        item.event.importanceBand !== metadata.importanceBand ||
        item.event.releaseClass !== metadata.releaseClass ||
        item.event.title !== metadata.displayTitle;

      if (changed) {
        updated += 1;
        if (samples.length < 8) {
          samples.push({
            slug: item.event.slug,
            previousScore: item.event.importanceScore,
            nextScore: metadata.signalScore,
            previousBand: item.event.importanceBand,
            nextBand: metadata.importanceBand,
            releaseClass: metadata.releaseClass,
          });
        }

        if (!args.dryRun) {
          await ctx.db.patch(item.event._id, eventPatch);
          await ctx.db.patch(item.rawCandidate._id, rawPatch);
        }
      } else {
        skipped += 1;
      }
    }

    return {
      dryRun: args.dryRun ?? false,
      scanned: hydrated.length,
      updated,
      skipped,
      samples,
    };
  },
});

function matchesSourceUrlPrefix(sourceUrl: string, prefixes: string[]) {
  try {
    const url = new URL(sourceUrl);
    const normalizedBaseUrl = `${url.origin}${url.pathname}`.replace(/\/$/, "");
    const normalizedFullUrl = `${url.origin}${url.pathname}${url.search}${url.hash}`;
    const normalizedPath = url.pathname.replace(/\/$/, "");
    const normalizedFullPath = `${url.pathname}${url.search}${url.hash}`;

    return prefixes.some((prefix) => {
      const trimmed = prefix.trim();
      if (!trimmed) {
        return false;
      }

      const includesDetail = /[?#]/.test(trimmed);
      if (trimmed.startsWith("/")) {
        const normalizedPrefix = includesDetail ? trimmed : trimmed.replace(/\/$/, "");
        const target = includesDetail ? normalizedFullPath : normalizedPath;
        return target === normalizedPrefix || (!includesDetail && target.startsWith(`${normalizedPrefix}/`));
      }

      const normalizedPrefix = includesDetail ? trimmed : trimmed.replace(/\/$/, "");
      const target = includesDetail ? normalizedFullUrl : normalizedBaseUrl;
      return target === normalizedPrefix || (!includesDetail && target.startsWith(`${normalizedPrefix}/`));
    });
  } catch {
    return prefixes.some((prefix) => sourceUrl.startsWith(prefix));
  }
}

export const suppressSourceUrlPrefixes = mutation({
  args: {
    adminSecret: v.string(),
    vendorSlug: v.string(),
    prefixes: v.array(v.string()),
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    vendorSlug: v.string(),
    scanned: v.number(),
    matched: v.number(),
    suppressed: v.number(),
    samples: v.array(
      v.object({
        slug: v.string(),
        title: v.string(),
        sourceUrl: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);

    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", args.vendorSlug))
      .unique();

    if (!vendor) {
      throw new Error(`Unknown vendor: ${args.vendorSlug}`);
    }

    const prefixes = args.prefixes.map((prefix) => prefix.trim()).filter(Boolean);
    if (!prefixes.length) {
      throw new Error("At least one URL prefix is required.");
    }

    const limit = Math.min(Math.max(args.limit ?? 500, 1), 2000);
    const rows = await ctx.db
      .query("changeEvents")
      .withIndex("by_vendor_and_published", (q) => q.eq("vendorId", vendor._id))
      .order("desc")
      .take(limit);

    let matched = 0;
    let suppressed = 0;
    const samples = [];

    for (const event of rows) {
      if (event.visibility !== "public") {
        continue;
      }

      if (!matchesSourceUrlPrefix(event.sourceUrl, prefixes)) {
        continue;
      }

      matched += 1;
      if (samples.length < 10) {
        samples.push({
          slug: event.slug,
          title: event.title,
          sourceUrl: event.sourceUrl,
        });
      }

      if (!args.dryRun) {
        await ctx.db.patch(event._id, {
          visibility: "hidden",
          updatedAt: Date.now(),
        });
        await ctx.db.patch(event.rawCandidateId, {
          status: "suppressed",
        });
        await recordReviewAction(ctx, event.rawCandidateId, "suppress", "source-link-repair");
        suppressed += 1;
      }
    }

    return {
      dryRun: args.dryRun ?? false,
      vendorSlug: vendor.slug,
      scanned: rows.length,
      matched,
      suppressed,
      samples,
    };
  },
});
