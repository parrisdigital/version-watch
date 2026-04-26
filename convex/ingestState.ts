import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

import { sourceErrorCodeValidator } from "./ingestionErrors";
import { publishRawCandidate } from "./lib/publish";
import {
  getLifecycleStateAfterFailure,
  getLifecycleStateAfterSuccess,
  shouldPollLifecycleState,
} from "./sourceLifecycle";
import {
  getEffectiveFreshnessTier,
  getNextDueAt,
  getPollIntervalMinutesForFreshnessTier,
} from "./sourceFreshness";

const normalizedEntryValidator = v.object({
  title: v.string(),
  rawTitle: v.optional(v.string()),
  sourceUrl: v.string(),
  summary: v.string(),
  whatChanged: v.string(),
  whyItMatters: v.string(),
  whoShouldCare: v.array(v.string()),
  affectedStack: v.array(v.string()),
  categories: v.array(v.string()),
  topicTags: v.array(v.string()),
  releaseClass: v.union(
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
  ),
  impactConfidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  signalReasons: v.array(v.string()),
  scoreVersion: v.string(),
  publishedAt: v.number(),
  importanceScore: v.number(),
  importanceBand: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
  parseConfidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  githubUrl: v.optional(v.string()),
});

const runTypeValidator = v.union(
  v.literal("scheduled"),
  v.literal("manual"),
  v.literal("deep_diff"),
  v.literal("watchdog"),
);

const refreshRequestStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("skipped"),
  v.literal("failure"),
);

const refreshRunStatusValidator = v.union(
  v.literal("running"),
  v.literal("success"),
  v.literal("partial_failure"),
  v.literal("failure"),
);

function buildDedupeKey(sourceId: string, item: { sourceUrl: string; publishedAt: number; title: string }) {
  return `${sourceId}::${item.sourceUrl}::${item.publishedAt}::${item.title.toLowerCase()}`;
}

function normalizeTitleKey(title: string) {
  return title
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .replace(
      /([^\s])(?:Checkout|Paymentlinks|Connect|Elements|Payments|Crypto|Issuing|Radar|Billing|Invoicing|Climate|Payouts|Financialconnections|Tax|Treasury)(?:\+\s*\d+\s*more)?$/i,
      "$1",
    )
    .trim()
    .toLowerCase();
}

function canonicalSourceUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.split("#")[0]!.replace(/\/$/, "");
  }
}

const POLL_DUE_GRACE_MS = 60 * 1000;
const BASE_BACKOFF_MS = 15 * 60 * 1000;
const MAX_BACKOFF_MS = 6 * 60 * 60 * 1000;
const CIRCUIT_BREAKER_BACKOFF_MS = 24 * 60 * 60 * 1000;

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function deterministicJitterMs(key: string, maxJitterMs: number) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }

  return hash % Math.max(1, maxJitterMs);
}

function getSourceNextDueAt(source: any, fromAt: number) {
  const tier = getEffectiveFreshnessTier(source);
  return getNextDueAt(fromAt, tier);
}

export function getFailureBackoffUntil(source: any, now: number, consecutiveFailures: number) {
  const sourceKey = String(source?._id ?? source?.sourceId ?? source?.url ?? "source");
  const tier = getEffectiveFreshnessTier(source);
  const intervalMs = getPollIntervalMinutesForFreshnessTier(tier) * 60 * 1000;
  const exponentialMs = BASE_BACKOFF_MS * 2 ** Math.max(0, consecutiveFailures - 1);
  const cappedMs = consecutiveFailures >= 5
    ? CIRCUIT_BREAKER_BACKOFF_MS
    : Math.min(MAX_BACKOFF_MS, Math.max(intervalMs, exponentialMs));
  const jitterMs = deterministicJitterMs(sourceKey, 5 * 60 * 1000);

  return now + cappedMs + jitterMs;
}

export function shouldPollSource(source: any, now: number, force: boolean) {
  if (force) {
    return true;
  }

  if (isFinitePositive(source.backoffUntil) && now + POLL_DUE_GRACE_MS < source.backoffUntil) {
    return false;
  }

  if (isFinitePositive(source.nextDueAt)) {
    return now + POLL_DUE_GRACE_MS >= source.nextDueAt;
  }

  const lastAttemptAt = Math.max(source.lastAttemptAt ?? 0, source.lastSuccessAt ?? 0, source.lastFailureAt ?? 0);
  if (!lastAttemptAt) {
    return true;
  }

  const pollIntervalMs = (source.pollIntervalMinutes || getPollIntervalMinutesForFreshnessTier("standard")) * 60 * 1000;
  return now - lastAttemptAt >= pollIntervalMs - POLL_DUE_GRACE_MS;
}

function getRefreshRunStatus(result: { sourcesProcessed: number; failures: number }) {
  if (result.sourcesProcessed === 0) {
    return "success" as const;
  }

  if (result.failures >= result.sourcesProcessed) {
    return "failure" as const;
  }

  if (result.failures > 0) {
    return "partial_failure" as const;
  }

  return "success" as const;
}

export function isCompletedRefreshStatus(status: string) {
  return status === "success" || status === "partial_failure";
}

const AUTO_PUBLISH_VENDOR_SLUGS = new Set([
  "android-developers",
  "anthropic",
  "apple-developer",
  "bun",
  "clerk",
  "cloudflare",
  "cursor",
  "dp-code",
  "docker",
  "exa",
  "firebase",
  "firecrawl",
  "gemini",
  "github",
  "hermes-agent",
  "hono",
  "linear",
  "openai",
  "openclaw",
  "opencode",
  "openusage",
  "biome",
  "convex",
  "augment-code",
  "brave",
  "cline",
  "dia",
  "pnpm",
  "fastify",
  "groq",
  "posthog",
  "netlify",
  "render",
  "railway",
  "prisma",
  "neon",
  "planetscale",
  "expo",
  "sentry",
  "better-auth",
  "meta-ai",
  "langchain",
  "resend",
  "shadcn",
  "stripe",
  "supabase",
  "t3-code",
  "uv",
  "vercel",
  "vite",
  "vscode",
  "warp",
  "workos",
  "xai",
  "zed",
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
const SHORT_MEANINGFUL_SUFFIXES = new Set(["api", "cli", "sdk", "mcp"]);
const GITHUB_RELEASE_TAG_TITLE_PATTERN =
  /^(?:[a-z0-9][a-z0-9+._/-]*[@ ]+)?v?\d+\.\d+(?:\.\d+)?(?:[-+.][a-z0-9]+)*(?:\.[a-z0-9]+)*$/i;

const OFFICIAL_HOSTS_BY_VENDOR: Record<string, string[]> = {
  anthropic: ["anthropic.com", "claude.com", "docs.claude.com", "platform.claude.com", "support.claude.com"],
  "better-auth": ["better-auth.com", "github.com"],
  supabase: ["supabase.com", "github.com"],
};

const BLOCKED_DETAIL_PATHS_BY_VENDOR: Record<string, RegExp[]> = {
  supabase: [/^\/blog(?:\/|$)/i],
  vercel: [/^\/blog(?:\/|$)/i],
};

function normalizeHost(value: string) {
  return value.replace(/^www\./, "");
}

function hostMatches(candidateHost: string, sourceHost: string) {
  return candidateHost === sourceHost || candidateHost.endsWith(`.${sourceHost}`);
}

function isBlockedDetailUrl(candidateUrl: string, vendorSlug: string) {
  const blockedPaths = BLOCKED_DETAIL_PATHS_BY_VENDOR[vendorSlug] ?? [];
  if (!blockedPaths.length) {
    return false;
  }

  try {
    const pathname = new URL(candidateUrl).pathname;
    return blockedPaths.some((pattern) => pattern.test(pathname));
  } catch {
    return false;
  }
}

export function isOfficialSourceUrl(candidateUrl: string, sourceUrl: string, vendorSlug: string) {
  try {
    const candidateHost = normalizeHost(new URL(candidateUrl).hostname);
    const sourceHost = normalizeHost(new URL(sourceUrl).hostname);

    if (isBlockedDetailUrl(candidateUrl, vendorSlug)) {
      return false;
    }

    if (hostMatches(candidateHost, sourceHost)) {
      return true;
    }

    const officialHosts = OFFICIAL_HOSTS_BY_VENDOR[vendorSlug] ?? [];
    return officialHosts.some((host) => hostMatches(candidateHost, normalizeHost(host)));
  } catch {
    return false;
  }
}

export function hasMeaningfulTitle(title: string, sourceUrl?: string) {
  const normalized = title.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
  const normalizedLower = normalizeTitleKey(normalized);

  if (normalized.length > 180) {
    return false;
  }

  if (/^learn what['’]s changing/i.test(normalized)) {
    return false;
  }

  if (normalized.length < 12 && !SHORT_MEANINGFUL_TITLES.has(normalizedLower)) {
    const isGitHubReleaseTitle =
      sourceUrl?.includes("github.com/") && GITHUB_RELEASE_TAG_TITLE_PATTERN.test(normalized);
    const titleTokens = normalizedLower.split(/\s+/).filter(Boolean);
    const hasMeaningfulShortSuffix =
      titleTokens.length >= 2 && SHORT_MEANINGFUL_SUFFIXES.has(titleTokens[titleTokens.length - 1]!);

    if (!isGitHubReleaseTitle && !hasMeaningfulShortSuffix) {
      return false;
    }
  }

  return !NOISE_TITLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function findSameSourceCandidateByTitle<T extends { rawTitle: string }>(candidates: T[], title: string) {
  const normalizedTitle = normalizeTitleKey(title);
  return candidates.find((candidate) => normalizeTitleKey(candidate.rawTitle) === normalizedTitle) ?? null;
}

function findSameCanonicalSourceCandidate<T extends { rawTitle: string; sourceUrl: string }>(
  candidates: T[],
  item: { sourceUrl: string },
) {
  const normalizedUrl = canonicalSourceUrl(item.sourceUrl);

  return (
    candidates.find((candidate) => {
      return canonicalSourceUrl(candidate.sourceUrl) === normalizedUrl && !hasMeaningfulTitle(candidate.rawTitle);
    }) ?? null
  );
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

  if (!hasMeaningfulTitle(item.title, source.url) || !isReasonablePublishDate(item.publishedAt, now)) {
    return false;
  }

  return isOfficialSourceUrl(item.sourceUrl, source.url, vendor.slug);
}

export const listDueSources = internalQuery({
  args: {
    force: v.boolean(),
    vendorSlug: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const now = Date.now();
    const sources = await ctx.db.query("sources").collect();

    const hydrated = await Promise.all(
      sources.map(async (source: any) => {
        const vendor: any = await ctx.db.get(source.vendorId as any);
        if (!vendor || !vendor.isActive) {
          return null;
        }

        if (args.vendorSlug && vendor.slug !== args.vendorSlug) {
          return null;
        }

        if (args.sourceUrl && source.url !== args.sourceUrl) {
          return null;
        }

        if (!source.isActive || !shouldPollLifecycleState(source) || !shouldPollSource(source, now, args.force)) {
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
          freshnessTier: getEffectiveFreshnessTier(source),
          etag: source.etag,
          lastModified: source.lastModified,
          contentHash: source.contentHash,
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

export const startRefreshRun = internalMutation({
  args: {
    runType: runTypeValidator,
    force: v.boolean(),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    refreshRunId: v.optional(v.id("refreshRuns")),
    skipped: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const running = await ctx.db
      .query("refreshRuns")
      .withIndex("by_status_and_started_at", (q) => q.eq("status", "running"))
      .order("desc")
      .first();

    if (running) {
      return {
        skipped: true,
        reason: `Refresh already running since ${new Date(running.startedAt).toISOString()}.`,
      };
    }

    const refreshRunId = await ctx.db.insert("refreshRuns", {
      startedAt: now,
      status: "running",
      runType: args.runType,
      force: args.force,
      reason: args.reason,
      sourcesProcessed: 0,
      itemsFetched: 0,
      itemsCreated: 0,
      itemsDeduped: 0,
      published: 0,
      failures: 0,
    });

    return {
      refreshRunId,
      skipped: false,
    };
  },
});

export const expireStaleRefreshRuns = internalMutation({
  args: {
    runningGraceMs: v.number(),
  },
  returns: v.object({
    expired: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const runningRuns = await ctx.db
      .query("refreshRuns")
      .withIndex("by_status_and_started_at", (q) => q.eq("status", "running"))
      .collect();
    let expired = 0;

    for (const run of runningRuns) {
      if (now - run.startedAt <= args.runningGraceMs) {
        continue;
      }

      await ctx.db.patch(run._id, {
        finishedAt: now,
        status: "failure",
        errorMessage: `Marked failed by watchdog after running longer than ${Math.round(
          args.runningGraceMs / 60000,
        )} minutes.`,
      });
      expired += 1;
    }

    return { expired };
  },
});

export const finishRefreshRun = internalMutation({
  args: {
    refreshRunId: v.id("refreshRuns"),
    sourcesProcessed: v.number(),
    itemsFetched: v.number(),
    itemsCreated: v.number(),
    itemsDeduped: v.number(),
    published: v.number(),
    failures: v.number(),
  },
  returns: refreshRunStatusValidator,
  handler: async (ctx, args) => {
    const status = getRefreshRunStatus(args);

    await ctx.db.patch(args.refreshRunId, {
      finishedAt: Date.now(),
      status,
      sourcesProcessed: args.sourcesProcessed,
      itemsFetched: args.itemsFetched,
      itemsCreated: args.itemsCreated,
      itemsDeduped: args.itemsDeduped,
      published: args.published,
      failures: args.failures,
    });

    return status;
  },
});

export const failRefreshRun = internalMutation({
  args: {
    refreshRunId: v.id("refreshRuns"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.refreshRunId, {
      finishedAt: Date.now(),
      status: "failure",
      errorMessage: args.errorMessage,
    });

    return null;
  },
});

export const getRefreshWatchdogState = internalQuery({
  args: {
    staleAfterMs: v.number(),
    runningGraceMs: v.number(),
  },
  returns: v.object({
    checkedAt: v.number(),
    shouldRecover: v.boolean(),
    reason: v.string(),
    latestCompletedAt: v.optional(v.number()),
    latestRunningAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const rows = await ctx.db.query("refreshRuns").withIndex("by_started_at").order("desc").take(50);
    const latestRunning = rows.find((run) => run.status === "running");
    const latestCompleted = rows.find((run) => run.finishedAt && isCompletedRefreshStatus(run.status));

    if (latestRunning) {
      if (now - latestRunning.startedAt <= args.runningGraceMs) {
        return {
          checkedAt: now,
          shouldRecover: false,
          reason: "A refresh is already running.",
          latestCompletedAt: latestCompleted?.finishedAt,
          latestRunningAt: latestRunning.startedAt,
        };
      }

      return {
        checkedAt: now,
        shouldRecover: true,
        reason: `A refresh has been running longer than ${Math.round(args.runningGraceMs / 60000)} minutes.`,
        latestCompletedAt: latestCompleted?.finishedAt,
        latestRunningAt: latestRunning.startedAt,
      };
    }

    if (!latestCompleted?.finishedAt) {
      return {
        checkedAt: now,
        shouldRecover: true,
        reason: "No completed refresh run has been recorded.",
      };
    }

    if (now - latestCompleted.finishedAt > args.staleAfterMs) {
      return {
        checkedAt: now,
        shouldRecover: true,
        reason: `Latest completed refresh is older than ${Math.round(args.staleAfterMs / 60000)} minutes.`,
        latestCompletedAt: latestCompleted.finishedAt,
      };
    }

    return {
      checkedAt: now,
      shouldRecover: false,
      reason: "Feed refresh is current.",
      latestCompletedAt: latestCompleted.finishedAt,
    };
  },
});

export const persistSourceEntries = internalMutation({
  args: {
    sourceId: v.id("sources"),
    vendorId: v.id("vendors"),
    startedAt: v.number(),
    runType: runTypeValidator,
    items: v.array(normalizedEntryValidator),
    etag: v.optional(v.string()),
    lastModified: v.optional(v.string()),
    contentHash: v.optional(v.string()),
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
      const rawTitle = item.rawTitle ?? item.title;
      const dedupeKey = buildDedupeKey(String(args.sourceId), { ...item, title: rawTitle });
      const exactCandidate = await ctx.db
        .query("rawCandidates")
        .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", dedupeKey))
        .unique();
      const sameSourceCandidate =
        exactCandidate ??
        findSameSourceCandidateByTitle(
          await ctx.db
            .query("rawCandidates")
            .withIndex("by_source_url_published", (q) =>
              q.eq("sourceId", args.sourceId).eq("sourceUrl", item.sourceUrl).eq("rawPublishedAt", item.publishedAt),
            )
            .collect(),
          rawTitle,
        );
      const sameTitleCandidate =
        sameSourceCandidate ??
        (await ctx.db
          .query("rawCandidates")
          .withIndex("by_source_and_title", (q) => q.eq("sourceId", args.sourceId).eq("rawTitle", rawTitle))
          .first());
      const sourceCandidates = sameTitleCandidate
        ? []
        : await ctx.db
            .query("rawCandidates")
            .withIndex("by_source_and_title", (q) => q.eq("sourceId", args.sourceId))
            .collect();
      const sameNormalizedTitleCandidate =
        sameTitleCandidate ?? findSameSourceCandidateByTitle(sourceCandidates, rawTitle);
      const sameCanonicalSourceCandidate =
        sameNormalizedTitleCandidate ?? findSameCanonicalSourceCandidate(sourceCandidates, item);
      const existingCandidate = sameCanonicalSourceCandidate;

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
        rawTitle,
        rawBody: item.summary,
        rawPublishedAt: item.publishedAt,
        discoveredAt: now,
        checksum: dedupeKey,
        parseConfidence: item.parseConfidence,
        normalizationVersion: "v2",
        proposedSummary: item.summary,
        proposedTitle: item.title,
        proposedWhatChanged: item.whatChanged,
        proposedWhyItMatters: item.whyItMatters,
        proposedWhoShouldCare: item.whoShouldCare,
        proposedAffectedStack: item.affectedStack,
        proposedCategories: item.categories,
        proposedTopicTags: item.topicTags,
        releaseClass: item.releaseClass,
        impactConfidence: item.impactConfidence,
        signalReasons: item.signalReasons,
        scoreVersion: item.scoreVersion,
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
      lastAttemptAt: args.startedAt,
      lastSuccessAt: now,
      lifecycleState: getLifecycleStateAfterSuccess(source ?? {}),
      nextDueAt: getSourceNextDueAt(source ?? {}, now),
      backoffUntil: undefined,
      etag: args.etag,
      lastModified: args.lastModified,
      contentHash: args.contentHash,
      lastErrorCode: undefined,
      lastErrorMessage: undefined,
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

export const persistSourceUnchanged = internalMutation({
  args: {
    sourceId: v.id("sources"),
    vendorId: v.id("vendors"),
    startedAt: v.number(),
    runType: runTypeValidator,
    etag: v.optional(v.string()),
    lastModified: v.optional(v.string()),
    contentHash: v.optional(v.string()),
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
    const source = await ctx.db.get(args.sourceId);

    await ctx.db.patch(args.sourceId, {
      lastAttemptAt: args.startedAt,
      lastSuccessAt: now,
      lifecycleState: getLifecycleStateAfterSuccess(source ?? {}),
      nextDueAt: getSourceNextDueAt(source ?? {}, now),
      backoffUntil: undefined,
      etag: args.etag,
      lastModified: args.lastModified,
      contentHash: args.contentHash,
      lastErrorCode: undefined,
      lastErrorMessage: undefined,
      consecutiveFailures: 0,
      updatedAt: now,
    });

    await ctx.db.insert("ingestionRuns", {
      sourceId: args.sourceId,
      vendorId: args.vendorId,
      startedAt: args.startedAt,
      finishedAt: now,
      status: "success",
      itemsFetched: 0,
      itemsCreated: 0,
      itemsDeduped: 0,
      runType: args.runType,
    });

    return {
      itemsFetched: 0,
      itemsCreated: 0,
      itemsDeduped: 0,
      published: 0,
      failed: false,
    };
  },
});

export const persistSourceFailure = internalMutation({
  args: {
    sourceId: v.id("sources"),
    vendorId: v.id("vendors"),
    startedAt: v.number(),
    runType: runTypeValidator,
    errorCode: sourceErrorCodeValidator,
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

    const now = Date.now();
    const consecutiveFailures = (source?.consecutiveFailures ?? 0) + 1;
    const backoffUntil = getFailureBackoffUntil(source ?? {}, now, consecutiveFailures);

    await ctx.db.patch(args.sourceId, {
      lastAttemptAt: args.startedAt,
      lastFailureAt: now,
      lifecycleState: getLifecycleStateAfterFailure(source ?? {}),
      nextDueAt: backoffUntil,
      backoffUntil,
      lastErrorCode: args.errorCode,
      lastErrorMessage: args.errorMessage,
      consecutiveFailures,
      updatedAt: now,
    });

    await ctx.db.insert("ingestionRuns", {
      sourceId: args.sourceId,
      vendorId: args.vendorId,
      startedAt: args.startedAt,
      finishedAt: now,
      status: "failure",
      itemsFetched: 0,
      itemsCreated: 0,
      itemsDeduped: 0,
      errorCode: args.errorCode,
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

function isRefreshRequestOpen(request: any) {
  return request.status === "queued" || request.status === "running";
}

export const enqueueVendorRefreshRequest = internalMutation({
  args: {
    vendorSlug: v.string(),
  },
  returns: v.object({
    queued: v.boolean(),
    reason: v.string(),
    refreshRequestId: v.optional(v.id("refreshRequests")),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (q) => q.eq("slug", args.vendorSlug))
      .unique();

    if (!vendor || !vendor.isActive) {
      return {
        queued: false,
        reason: "Vendor is not tracked.",
      };
    }

    const existingQueued = await ctx.db
      .query("refreshRequests")
      .withIndex("by_vendor_slug_and_status", (q) => q.eq("vendorSlug", args.vendorSlug).eq("status", "queued"))
      .order("desc")
      .first();
    const existingRunning = await ctx.db
      .query("refreshRequests")
      .withIndex("by_vendor_slug_and_status", (q) => q.eq("vendorSlug", args.vendorSlug).eq("status", "running"))
      .order("desc")
      .first();
    const existing = [existingQueued, existingRunning].filter(Boolean).find(isRefreshRequestOpen);

    if (existing) {
      return {
        queued: false,
        reason: "A refresh is already queued or running for this vendor.",
      };
    }

    const sources = await ctx.db
      .query("sources")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
      .collect();
    const dueSources = sources.filter((source) => {
      return source.isActive && shouldPollLifecycleState(source) && shouldPollSource(source, now, false);
    });

    if (!dueSources.length) {
      return {
        queued: false,
        reason: "Vendor sources are already fresh or currently backed off.",
      };
    }

    const refreshRequestId = await ctx.db.insert("refreshRequests", {
      vendorId: vendor._id,
      vendorSlug: vendor.slug,
      requestedAt: now,
      status: "queued",
      reason: "Public vendor-filtered API request found due source coverage.",
    });

    return {
      queued: true,
      reason: "Vendor refresh queued.",
      refreshRequestId,
    };
  },
});

export const markRefreshRequestRunning = internalMutation({
  args: {
    refreshRequestId: v.id("refreshRequests"),
  },
  returns: v.object({
    vendorSlug: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.refreshRequestId);
    const now = Date.now();

    if (!request) {
      throw new Error("Refresh request not found.");
    }

    await ctx.db.patch(args.refreshRequestId, {
      status: "running",
      startedAt: now,
    });

    return {
      vendorSlug: request.vendorSlug,
      sourceUrl: request.sourceUrl,
    };
  },
});

export const completeRefreshRequest = internalMutation({
  args: {
    refreshRequestId: v.id("refreshRequests"),
    status: refreshRequestStatusValidator,
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.refreshRequestId, {
      status: args.status,
      reason: args.reason,
      finishedAt: Date.now(),
    });

    return null;
  },
});

export const failRefreshRequest = internalMutation({
  args: {
    refreshRequestId: v.id("refreshRequests"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.refreshRequestId, {
      status: "failure",
      errorMessage: args.errorMessage,
      finishedAt: Date.now(),
    });

    return null;
  },
});
