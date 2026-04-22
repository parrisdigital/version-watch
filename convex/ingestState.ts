import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

import { publishRawCandidate } from "./lib/publish";

const normalizedEntryValidator = v.object({
  title: v.string(),
  sourceUrl: v.string(),
  summary: v.string(),
  whatChanged: v.string(),
  whyItMatters: v.string(),
  whoShouldCare: v.array(v.string()),
  affectedStack: v.array(v.string()),
  categories: v.array(v.string()),
  publishedAt: v.number(),
  importanceScore: v.number(),
  importanceBand: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
  parseConfidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  githubUrl: v.optional(v.string()),
});

function buildDedupeKey(sourceId: string, item: { sourceUrl: string; publishedAt: number; title: string }) {
  return `${sourceId}::${item.sourceUrl}::${item.publishedAt}::${item.title.toLowerCase()}`;
}

function shouldPollSource(source: any, now: number, force: boolean) {
  if (force) {
    return true;
  }

  const lastAttemptAt = Math.max(source.lastSuccessAt ?? 0, source.lastFailureAt ?? 0);
  if (!lastAttemptAt) {
    return true;
  }

  return now - lastAttemptAt >= source.pollIntervalMinutes * 60 * 1000;
}

const AUTO_PUBLISH_VENDOR_SLUGS = new Set([
  "android-developers",
  "anthropic",
  "apple-developer",
  "clerk",
  "cloudflare",
  "cursor",
  "docker",
  "exa",
  "firebase",
  "firecrawl",
  "gemini",
  "github",
  "linear",
  "openai",
  "resend",
  "stripe",
  "supabase",
  "vercel",
]);

const NOISE_TITLE_PATTERNS = [
  /^release notes$/i,
  /^changelog$/i,
  /^what can we help you with\??$/i,
  /^what['’]?s changing$/i,
  /^questions\??$/i,
  /^timeline$/i,
  /^learn what'?s changing/i,
  /^overview$/i,
];

const SHORT_MEANINGFUL_TITLES = new Set(["canvases"]);

const OFFICIAL_HOSTS_BY_VENDOR: Record<string, string[]> = {
  anthropic: ["anthropic.com", "claude.com", "docs.claude.com", "platform.claude.com", "support.claude.com"],
};

function normalizeHost(value: string) {
  return value.replace(/^www\./, "");
}

function hostMatches(candidateHost: string, sourceHost: string) {
  return candidateHost === sourceHost || candidateHost.endsWith(`.${sourceHost}`);
}

function isOfficialSourceUrl(candidateUrl: string, sourceUrl: string, vendorSlug: string) {
  try {
    const candidateHost = normalizeHost(new URL(candidateUrl).hostname);
    const sourceHost = normalizeHost(new URL(sourceUrl).hostname);

    if (hostMatches(candidateHost, sourceHost)) {
      return true;
    }

    const officialHosts = OFFICIAL_HOSTS_BY_VENDOR[vendorSlug] ?? [];
    return officialHosts.some((host) => hostMatches(candidateHost, normalizeHost(host)));
  } catch {
    return false;
  }
}

function hasMeaningfulTitle(title: string) {
  const normalized = title.replace(/\s+/g, " ").trim();
  const normalizedLower = normalized.toLowerCase();

  if (normalized.length > 180) {
    return false;
  }

  if (normalized.length < 12 && !SHORT_MEANINGFUL_TITLES.has(normalizedLower)) {
    return false;
  }

  return !NOISE_TITLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isReasonablePublishDate(publishedAt: number, now: number) {
  const earliestAllowed = Date.UTC(2025, 0, 1);
  const latestAllowed = now + 36 * 60 * 60 * 1000;

  return publishedAt >= earliestAllowed && publishedAt <= latestAllowed;
}

function shouldAutoPublishCandidate(item: any, vendor: any, source: any, now: number) {
  if (!vendor || !source) {
    return false;
  }

  if (!AUTO_PUBLISH_VENDOR_SLUGS.has(vendor.slug)) {
    return false;
  }

  if (item.parseConfidence === "low") {
    return false;
  }

  if (!hasMeaningfulTitle(item.title) || !isReasonablePublishDate(item.publishedAt, now)) {
    return false;
  }

  return isOfficialSourceUrl(item.sourceUrl, source.url, vendor.slug);
}

export const listDueSources = internalQuery({
  args: { force: v.boolean() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const now = Date.now();
    const sources = await ctx.db.query("sources").collect();
    const activeSources = sources.filter((source: any) => source.isActive && shouldPollSource(source, now, args.force));

    const hydrated = await Promise.all(
      activeSources.map(async (source: any) => {
        const vendor: any = await ctx.db.get(source.vendorId as any);
        if (!vendor || !vendor.isActive) {
          return null;
        }

        return {
          sourceId: source._id,
          vendorId: vendor._id,
          vendorSlug: vendor.slug,
          vendorName: vendor.name,
          sourceType: source.sourceType,
          name: source.name,
          url: source.url,
          parserKey: source.parserKey,
        };
      }),
    );

    return hydrated
      .filter(Boolean)
      .sort((a, b) => {
        return a!.vendorName.localeCompare(b!.vendorName) || a!.name.localeCompare(b!.name);
      });
  },
});

export const persistSourceEntries = internalMutation({
  args: {
    sourceId: v.id("sources"),
    vendorId: v.id("vendors"),
    startedAt: v.number(),
    runType: v.union(v.literal("scheduled"), v.literal("manual"), v.literal("deep_diff")),
    items: v.array(normalizedEntryValidator),
  },
  returns: v.object({
    itemsFetched: v.number(),
    itemsCreated: v.number(),
    itemsDeduped: v.number(),
    published: v.number(),
    failed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const vendor = await ctx.db.get(args.vendorId);
    const source = await ctx.db.get(args.sourceId);
    let itemsCreated = 0;
    let itemsDeduped = 0;
    let published = 0;

    for (const item of args.items) {
      const dedupeKey = buildDedupeKey(String(args.sourceId), item);
      const exactCandidate = await ctx.db
        .query("rawCandidates")
        .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", dedupeKey))
        .unique();
      const sameSourceCandidate =
        exactCandidate ??
        (await ctx.db
          .query("rawCandidates")
          .withIndex("by_source_url_published", (q) =>
            q.eq("sourceId", args.sourceId).eq("sourceUrl", item.sourceUrl).eq("rawPublishedAt", item.publishedAt),
          )
          .first());
      const sameTitleCandidate =
        sameSourceCandidate ??
        (await ctx.db
          .query("rawCandidates")
          .withIndex("by_source_and_title", (q) => q.eq("sourceId", args.sourceId).eq("rawTitle", item.title))
          .first());
      const existingCandidate = sameTitleCandidate;

      const shouldPublish = shouldAutoPublishCandidate(item, vendor, source, now);
      const status =
        existingCandidate?.status === "pending_review" && shouldPublish
          ? ("published" as const)
          : (existingCandidate?.status ?? (shouldPublish ? ("published" as const) : ("pending_review" as const)));
      const rawPayload = {
        vendorId: args.vendorId,
        sourceId: args.sourceId,
        externalId: item.sourceUrl,
        sourceUrl: item.sourceUrl,
        githubUrl: item.githubUrl,
        rawTitle: item.title,
        rawBody: item.summary,
        rawPublishedAt: item.publishedAt,
        discoveredAt: now,
        checksum: dedupeKey,
        parseConfidence: item.parseConfidence,
        normalizationVersion: "v2",
        proposedSummary: item.summary,
        proposedWhatChanged: item.whatChanged,
        proposedWhyItMatters: item.whyItMatters,
        proposedWhoShouldCare: item.whoShouldCare,
        proposedAffectedStack: item.affectedStack,
        proposedCategories: item.categories,
        importanceScore: item.importanceScore,
        importanceBand: item.importanceBand,
        status,
        dedupeKey,
      };

      let rawCandidate: any = existingCandidate;
      if (existingCandidate) {
        await ctx.db.patch(existingCandidate._id, rawPayload);
        rawCandidate = {
          ...existingCandidate,
          ...rawPayload,
        } as any;
        itemsDeduped += 1;
      } else {
        const insertedId = await ctx.db.insert("rawCandidates", rawPayload);
        rawCandidate = {
          _id: insertedId,
          ...rawPayload,
        } as any;
        itemsCreated += 1;
      }

      if (rawCandidate.status === "published") {
        const publishedId = await publishRawCandidate(ctx, rawCandidate);
        if (publishedId) {
          published += 1;
        }
      }
    }

    await ctx.db.patch(args.sourceId, {
      lastSuccessAt: now,
      consecutiveFailures: 0,
      updatedAt: now,
    });

    await ctx.db.insert("ingestionRuns", {
      sourceId: args.sourceId,
      vendorId: args.vendorId,
      startedAt: args.startedAt,
      finishedAt: now,
      status: "success",
      itemsFetched: args.items.length,
      itemsCreated,
      itemsDeduped,
      runType: args.runType,
    });

    return {
      itemsFetched: args.items.length,
      itemsCreated,
      itemsDeduped,
      published,
      failed: false,
    };
  },
});

export const persistSourceFailure = internalMutation({
  args: {
    sourceId: v.id("sources"),
    vendorId: v.id("vendors"),
    startedAt: v.number(),
    runType: v.union(v.literal("scheduled"), v.literal("manual"), v.literal("deep_diff")),
    errorMessage: v.string(),
  },
  returns: v.object({
    itemsFetched: v.number(),
    itemsCreated: v.number(),
    itemsDeduped: v.number(),
    published: v.number(),
    failed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);

    await ctx.db.patch(args.sourceId, {
      lastFailureAt: Date.now(),
      consecutiveFailures: (source?.consecutiveFailures ?? 0) + 1,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("ingestionRuns", {
      sourceId: args.sourceId,
      vendorId: args.vendorId,
      startedAt: args.startedAt,
      finishedAt: Date.now(),
      status: "failure",
      itemsFetched: 0,
      itemsCreated: 0,
      itemsDeduped: 0,
      errorMessage: args.errorMessage,
      runType: args.runType,
    });

    return {
      itemsFetched: 0,
      itemsCreated: 0,
      itemsDeduped: 0,
      published: 0,
      failed: true,
    };
  },
});
