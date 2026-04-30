"use node";

import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import {
  classifyHttpStatus,
  classifyThrownError,
  getIngestionErrorMessage,
  SourceIngestionError,
} from "./ingestionErrors";
import {
  discoverAntigravityBundleUrl,
  discoverFeedUrl,
  normalizeParsedEntry,
  parseHtmlEntries,
  parsePostHogPageData,
  type ParsedSourceEntry,
} from "../src/lib/ingestion/source-ingestion";
import { deriveSignalMetadataForEvents } from "../src/lib/classification/signal";

function cleanText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

const DEFAULT_INGESTION_USER_AGENT =
  process.env.INGESTION_USER_AGENT ?? "VersionWatchBot/1.0 (+https://versionwatch.dev)";
const BROWSER_FALLBACK_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
// Some vendor sites disguise bot blocking as a 404 while serving the same URL
// normally to browser user-agents.
const BROWSER_RETRY_STATUSES = new Set([403, 404, 406, 429]);
const FETCH_TIMEOUT_MS = 30 * 1000;
const WATCHDOG_STALE_AFTER_MS = 270 * 60 * 1000;
const WATCHDOG_RUNNING_GRACE_MS = 30 * 60 * 1000;

type RunType = "scheduled" | "manual" | "deep_diff" | "watchdog";

type SourceFetchTarget = {
  url: string;
  parserKey?: string;
  sourceType?: string;
  etag?: string;
  lastModified?: string;
};

function sourceLooksLikeDirectFeed(source: SourceFetchTarget) {
  return source.sourceType === "rss" || /(?:rss|feed|atom).*\.(?:xml|rss)$|\/feed\/?$/i.test(source.url);
}

function canUseConditionalCache(source: SourceFetchTarget) {
  return sourceLooksLikeDirectFeed(source) || !source.parserKey || !FEED_PARSER_KEYS.has(source.parserKey);
}

function buildFetchHeaders(userAgent: string, source?: SourceFetchTarget) {
  const headers: Record<string, string> = {
    "User-Agent": userAgent,
    Accept: "text/markdown,text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
  };

  if (source && canUseConditionalCache(source)) {
    if (source.etag) {
      headers["If-None-Match"] = source.etag;
    }

    if (source.lastModified) {
      headers["If-Modified-Since"] = source.lastModified;
    }
  }

  return headers;
}

async function fetchTextOnce(source: SourceFetchTarget, userAgent: string) {
  try {
    return await fetch(source.url, {
      headers: buildFetchHeaders(userAgent, source),
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const code = classifyThrownError(error);
    throw new SourceIngestionError(code, getIngestionErrorMessage(error));
  }
}

function getContentHash(body: string) {
  return createHash("sha256").update(body).digest("hex");
}

async function fetchText(source: SourceFetchTarget | string) {
  const sourceTarget = typeof source === "string" ? { url: source } : source;
  let response = await fetchTextOnce(sourceTarget, DEFAULT_INGESTION_USER_AGENT);

  if (!response.ok && BROWSER_RETRY_STATUSES.has(response.status)) {
    await response.body?.cancel();
    response = await fetchTextOnce(sourceTarget, BROWSER_FALLBACK_USER_AGENT);
  }

  if (response.status === 304) {
    await response.body?.cancel();
    return {
      ok: true,
      notModified: true,
      url: response.url,
      status: response.status,
      body: "",
      etag: response.headers.get("etag") ?? sourceTarget.etag,
      lastModified: response.headers.get("last-modified") ?? sourceTarget.lastModified,
      contentHash: undefined,
    };
  }

  const body = await response.text();

  return {
    ok: response.ok,
    notModified: false,
    url: response.url,
    status: response.status,
    body,
    etag: response.headers.get("etag") ?? undefined,
    lastModified: response.headers.get("last-modified") ?? undefined,
    contentHash: body ? getContentHash(body) : undefined,
  };
}

const FEED_PARSER_KEYS = new Set([
  "bun:changelog_page",
  "clerk:changelog_page",
  "dp-code:changelog_page",
  "github:blog",
  "github:rss",
  "hermes-agent:changelog_page",
  "hono:changelog_page",
  "linear:changelog_page",
  "openclaw:changelog_page",
  "opencode:changelog_page",
  "openusage:changelog_page",
  "biome:changelog_page",
  "convex:changelog_page",
  "pnpm:changelog_page",
  "fastify:changelog_page",
  "langchain:changelog_page",
  "netlify:changelog_page",
  "neon:changelog_page",
  "planetscale:changelog_page",
  "render:changelog_page",
  "resend:changelog_page",
  "shadcn:changelog_page",
  "supabase:changelog_page",
  "t3-code:changelog_page",
  "uv:changelog_page",
  "vercel:changelog_page",
  "vite:changelog_page",
  "workos:changelog_page",
  "workos:github_release",
  "zed:changelog_page",
]);

async function parseFeedEntries(feedXml: string, fallbackUrl: string) {
  const parser = new Parser();

  try {
    const feed = await parser.parseString(feedXml);
    return (feed.items ?? [])
      .map((item) => {
        const publishedAt = Date.parse(item.isoDate ?? item.pubDate ?? "");
        const title = cleanText(item.title);
        const excerpt = cleanText(
          item.contentSnippet ?? item.summary ?? item.content ?? item["content:encoded"] ?? title,
        );
        const link = item.link ? new URL(item.link, fallbackUrl).toString() : fallbackUrl;
        const githubUrl =
          link.includes("github.com") ? link : cleanText(item.content ?? "").includes("github.com") ? link : undefined;

        if (!title || Number.isNaN(publishedAt)) {
          return null;
        }

        return {
          title,
          url: link,
          excerpt: excerpt || title,
          publishedAt,
          githubUrl,
          parseConfidence: "high" as const,
        } satisfies ParsedSourceEntry;
      })
      .filter(Boolean)
      .slice(0, 12) as ParsedSourceEntry[];
  } catch (error) {
    throw new SourceIngestionError("parse_error", getIngestionErrorMessage(error));
  }
}

function getUrlPath(value: string) {
  try {
    return new URL(value).pathname.replace(/\/$/, "") || "/";
  } catch {
    return "/";
  }
}

function getUrlHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function filterDiscoveredFeedEntries(entries: ParsedSourceEntry[], sourceUrl: string) {
  const sourcePath = getUrlPath(sourceUrl);
  const sourceHost = getUrlHost(sourceUrl);

  if (!sourceHost || sourcePath === "/") {
    return entries;
  }

  return entries.filter((entry) => {
    const entryHost = getUrlHost(entry.url);
    const entryPath = getUrlPath(entry.url);

    return entryHost === sourceHost && (entryPath === sourcePath || entryPath.startsWith(`${sourcePath}/`));
  });
}

function buildPostHogPageDataUrl(sourceUrl: string) {
  const url = new URL(sourceUrl);
  const normalizedPath = url.pathname.replace(/\/$/, "") || "/";
  url.pathname = `/page-data${normalizedPath}/page-data.json`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function parseSourceEntries(args: { parserKey: string; sourceUrl: string; body: string }) {
  try {
    return parseHtmlEntries({
      parserKey: args.parserKey,
      sourceUrl: args.sourceUrl,
      html: args.body,
    });
  } catch (error) {
    throw new SourceIngestionError("parse_error", getIngestionErrorMessage(error));
  }
}

async function ingestSource(ctx: any, source: any, runType: RunType) {
  const startedAt = Date.now();

  try {
    const sourceResponse = await fetchText(source);
    if (!sourceResponse.ok) {
      throw new SourceIngestionError(
        classifyHttpStatus(sourceResponse.status),
        `Fetch failed with status ${sourceResponse.status} for ${source.url}`,
      );
    }

    if (
      sourceResponse.notModified ||
      (canUseConditionalCache(source) &&
        source.contentHash &&
        sourceResponse.contentHash &&
        source.contentHash === sourceResponse.contentHash)
    ) {
      return await ctx.runMutation(internal.ingestState.persistSourceUnchanged, {
        sourceId: source.sourceId,
        vendorId: source.vendorId,
        startedAt,
        runType,
        etag: sourceResponse.etag,
        lastModified: sourceResponse.lastModified,
        contentHash: sourceResponse.contentHash ?? source.contentHash,
      });
    }

    let parsedEntries: ParsedSourceEntry[] = [];

    if (source.sourceType === "rss" || /(?:rss|feed|atom).*\.(?:xml|rss)$|\/feed\/?$/i.test(source.url)) {
      parsedEntries = await parseFeedEntries(sourceResponse.body, source.url);
    }

    if (parsedEntries.length === 0 && FEED_PARSER_KEYS.has(source.parserKey)) {
      const discoveredFeedUrl = discoverFeedUrl(sourceResponse.body, source.url);
      if (discoveredFeedUrl) {
        try {
          const feedResponse = await fetchText(discoveredFeedUrl);
          if (feedResponse.ok) {
            parsedEntries = filterDiscoveredFeedEntries(
              await parseFeedEntries(feedResponse.body, source.url),
              source.url,
            );
          }
        } catch {
          parsedEntries = [];
        }
      }
    }

    if (parsedEntries.length === 0 && source.parserKey === "posthog:changelog_page") {
      try {
        const pageDataResponse = await fetchText(buildPostHogPageDataUrl(sourceResponse.url));
        if (pageDataResponse.ok) {
          parsedEntries = parsePostHogPageData(sourceResponse.url, pageDataResponse.body);
        }
      } catch {
        parsedEntries = [];
      }
    }

    if (parsedEntries.length === 0 && source.parserKey === "google-antigravity:changelog_page") {
      const bundleUrl = discoverAntigravityBundleUrl(sourceResponse.body, sourceResponse.url);
      if (bundleUrl) {
        try {
          const bundleResponse = await fetchText(bundleUrl);
          if (bundleResponse.ok) {
            parsedEntries = parseSourceEntries({
              parserKey: source.parserKey,
              sourceUrl: sourceResponse.url,
              body: bundleResponse.body,
            });
          }
        } catch {
          parsedEntries = [];
        }
      }
    }

    if (parsedEntries.length === 0) {
      parsedEntries = parseSourceEntries({
        parserKey: source.parserKey,
        sourceUrl: sourceResponse.url,
        body: sourceResponse.body,
      });
    }

    const items = parsedEntries
      .map((entry) => {
        const normalized = normalizeParsedEntry({
          vendorSlug: source.vendorSlug,
          vendorName: source.vendorName,
          sourceName: source.name,
          sourceType: source.sourceType,
          entry,
        });

        return {
          title: normalized.title,
          rawTitle: normalized.rawTitle,
          sourceUrl: entry.url,
          summary: normalized.summary,
          whatChanged: normalized.whatChanged,
          whyItMatters: normalized.whyItMatters,
          whoShouldCare: normalized.whoShouldCare,
          affectedStack: normalized.affectedStack,
          categories: normalized.categories,
          topicTags: normalized.topicTags,
          releaseClass: normalized.releaseClass,
          impactConfidence: normalized.impactConfidence,
          signalReasons: normalized.signalReasons,
          scoreVersion: normalized.scoreVersion,
          publishedAt: entry.publishedAt,
          importanceScore: normalized.importanceScore,
          importanceBand: normalized.importanceBand,
          parseConfidence: normalized.parseConfidence,
          githubUrl: normalized.githubUrl ?? entry.githubUrl,
        };
      })
      .filter((item) => item.title && item.publishedAt);

    const enrichedItems = deriveSignalMetadataForEvents(
      items.map((item) => ({
        ...item,
        id: `${source.vendorSlug}:${item.sourceUrl}`,
        slug: `${source.vendorSlug}:${item.sourceUrl}:${item.publishedAt}`,
        vendorSlug: source.vendorSlug,
        vendorName: source.vendorName,
        publishedAt: new Date(item.publishedAt).toISOString(),
        sourceType: source.sourceType,
        sourceName: source.name,
      })),
    ).map(({ event, metadata }) => ({
      title: metadata.displayTitle,
      rawTitle: event.rawTitle,
      sourceUrl: event.sourceUrl,
      summary: event.summary,
      whatChanged: event.whatChanged,
      whyItMatters: metadata.whyItMatters,
      whoShouldCare: event.whoShouldCare,
      affectedStack: event.affectedStack,
      categories: event.categories,
      topicTags: metadata.topicTags,
      releaseClass: metadata.releaseClass,
      impactConfidence: metadata.impactConfidence,
      signalReasons: metadata.signalReasons,
      scoreVersion: metadata.scoreVersion,
      publishedAt: Date.parse(event.publishedAt),
      importanceScore: metadata.signalScore,
      importanceBand: metadata.importanceBand,
      parseConfidence: event.parseConfidence,
      githubUrl: event.githubUrl,
    }));

    if (enrichedItems.length === 0) {
      throw new SourceIngestionError("empty_result", `No parseable entries found for ${source.url}`);
    }

    return await ctx.runMutation(internal.ingestState.persistSourceEntries, {
      sourceId: source.sourceId,
      vendorId: source.vendorId,
      startedAt,
      runType,
      items: enrichedItems,
      etag: sourceResponse.etag,
      lastModified: sourceResponse.lastModified,
      contentHash: sourceResponse.contentHash,
    });
  } catch (error) {
    return await ctx.runMutation(internal.ingestState.persistSourceFailure, {
      sourceId: source.sourceId,
      vendorId: source.vendorId,
      startedAt,
      runType,
      errorCode: classifyThrownError(error),
      errorMessage: getIngestionErrorMessage(error),
    });
  }
}

function requireAdminSecret(suppliedSecret: string | undefined) {
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    throw new Error("Unauthorized");
  }
}

async function runIngestion(
  ctx: any,
  options: {
    force: boolean;
    runType: RunType;
    reason?: string;
    vendorSlug?: string;
    sourceUrl?: string;
  },
) {
  const refreshStart = await ctx.runMutation(internal.ingestState.startRefreshRun, {
    runType: options.runType,
    force: options.force,
    reason: options.reason,
  });

  if (refreshStart.skipped || !refreshStart.refreshRunId) {
    return {
      sourcesProcessed: 0,
      itemsFetched: 0,
      itemsCreated: 0,
      itemsDeduped: 0,
      published: 0,
      failures: 0,
      skipped: true,
      skipReason: refreshStart.reason ?? "A refresh is already running.",
    };
  }

  const refreshRunId = refreshStart.refreshRunId;

  try {
    await ctx.runMutation(internal.seed.syncRegistry, {});

    const sources = await ctx.runQuery(internal.ingestState.listDueSources, {
      force: options.force,
      vendorSlug: options.vendorSlug,
      sourceUrl: options.sourceUrl,
    });

    let itemsFetched = 0;
    let itemsCreated = 0;
    let itemsDeduped = 0;
    let published = 0;
    let failures = 0;

    for (const source of sources) {
      const result = await ingestSource(ctx, source, options.runType);
      itemsFetched += result.itemsFetched;
      itemsCreated += result.itemsCreated;
      itemsDeduped += result.itemsDeduped;
      published += result.published;
      if (result.failed) {
        failures += 1;
      }
    }

    const result = {
      sourcesProcessed: sources.length,
      itemsFetched,
      itemsCreated,
      itemsDeduped,
      published,
      failures,
    };

    await ctx.runMutation(internal.ingestState.finishRefreshRun, {
      refreshRunId,
      ...result,
    });

    return result;
  } catch (error) {
    await ctx.runMutation(internal.ingestState.failRefreshRun, {
      refreshRunId,
      errorMessage: error instanceof Error ? error.message : "Unknown refresh error",
    });

    throw error;
  }
}

export const fetchSource = action({
  args: {
    url: v.string(),
    adminSecret: v.string(),
  },
  returns: v.object({ ok: v.boolean(), body: v.string() }),
  handler: async (_ctx, args) => {
    requireAdminSecret(args.adminSecret);

    const response = await fetchText(args.url);

    return {
      ok: response.ok,
      body: response.body,
    };
  },
});

export const runManualIngestion: ReturnType<typeof action> = action({
  args: {
    adminSecret: v.string(),
    force: v.optional(v.boolean()),
    vendorSlug: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  returns: v.object({
    sourcesProcessed: v.number(),
    itemsFetched: v.number(),
    itemsCreated: v.number(),
    itemsDeduped: v.number(),
    published: v.number(),
    failures: v.number(),
    skipped: v.optional(v.boolean()),
    skipReason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);
    return await runIngestion(ctx, {
      force: args.force ?? false,
      runType: "manual",
      vendorSlug: args.vendorSlug,
      sourceUrl: args.sourceUrl,
      reason: args.vendorSlug
        ? `Manual refresh for vendor ${args.vendorSlug}.`
        : args.sourceUrl
          ? `Manual refresh for source ${args.sourceUrl}.`
          : "Manual refresh for due sources.",
    });
  },
});

export const runScheduledIngestion: ReturnType<typeof internalAction> = internalAction({
  args: {},
  returns: v.object({
    sourcesProcessed: v.number(),
    itemsFetched: v.number(),
    itemsCreated: v.number(),
    itemsDeduped: v.number(),
    published: v.number(),
    failures: v.number(),
    skipped: v.optional(v.boolean()),
    skipReason: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    return await runIngestion(ctx, {
      force: false,
      runType: "scheduled",
      reason: "Scheduled due-source refresh.",
    });
  },
});

export const runDeepDiff: ReturnType<typeof internalAction> = internalAction({
  args: {},
  returns: v.object({
    sourcesProcessed: v.number(),
    itemsFetched: v.number(),
    itemsCreated: v.number(),
    itemsDeduped: v.number(),
    published: v.number(),
    failures: v.number(),
    skipped: v.optional(v.boolean()),
    skipReason: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    return await runIngestion(ctx, {
      force: true,
      runType: "deep_diff",
      reason: "Daily deep-diff refresh.",
    });
  },
});

export const runRefreshWatchdog: ReturnType<typeof internalAction> = internalAction({
  args: {},
  returns: v.object({
    recovered: v.boolean(),
    reason: v.string(),
    sourcesProcessed: v.optional(v.number()),
    itemsFetched: v.optional(v.number()),
    itemsCreated: v.optional(v.number()),
    itemsDeduped: v.optional(v.number()),
    published: v.optional(v.number()),
    failures: v.optional(v.number()),
    skipped: v.optional(v.boolean()),
    skipReason: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const state = await ctx.runQuery(internal.ingestState.getRefreshWatchdogState, {
      staleAfterMs: WATCHDOG_STALE_AFTER_MS,
      runningGraceMs: WATCHDOG_RUNNING_GRACE_MS,
    });

    if (!state.shouldRecover) {
      return {
        recovered: false,
        reason: state.reason,
      };
    }

    await ctx.runMutation(internal.ingestState.expireStaleRefreshRuns, {
      runningGraceMs: WATCHDOG_RUNNING_GRACE_MS,
    });

    const result = await runIngestion(ctx, {
      force: false,
      runType: "watchdog",
      reason: state.reason,
    });
    const skipped = "skipped" in result && result.skipped === true;
    const skipReason = "skipReason" in result ? result.skipReason : undefined;

    return {
      recovered: !skipped,
      reason: skipReason ?? state.reason,
      ...result,
    };
  },
});

export const requestVendorRefresh: ReturnType<typeof action> = action({
  args: {
    vendorSlug: v.string(),
  },
  returns: v.object({
    queued: v.boolean(),
    reason: v.string(),
  }),
  handler: async (ctx, args) => {
    const request = await ctx.runMutation(internal.ingestState.enqueueVendorRefreshRequest, {
      vendorSlug: args.vendorSlug,
    });

    if (request.queued && request.refreshRequestId) {
      await ctx.scheduler.runAfter(0, internal.ingest.runQueuedVendorRefresh, {
        refreshRequestId: request.refreshRequestId,
      });
    }

    return {
      queued: request.queued,
      reason: request.reason,
    };
  },
});

export const runQueuedVendorRefresh: ReturnType<typeof internalAction> = internalAction({
  args: {
    refreshRequestId: v.id("refreshRequests"),
  },
  returns: v.object({
    sourcesProcessed: v.number(),
    itemsFetched: v.number(),
    itemsCreated: v.number(),
    itemsDeduped: v.number(),
    published: v.number(),
    failures: v.number(),
    skipped: v.optional(v.boolean()),
    skipReason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const request = await ctx.runMutation(internal.ingestState.markRefreshRequestRunning, {
      refreshRequestId: args.refreshRequestId,
    });

    try {
      const result = await runIngestion(ctx, {
        force: false,
        runType: "manual",
        vendorSlug: request.vendorSlug,
        sourceUrl: request.sourceUrl,
        reason: request.vendorSlug
          ? `Request-aware refresh for vendor ${request.vendorSlug}.`
          : "Request-aware refresh.",
      });

      const skipped = "skipped" in result && result.skipped === true;
      const skipReason = "skipReason" in result ? result.skipReason : undefined;

      await ctx.runMutation(internal.ingestState.completeRefreshRequest, {
        refreshRequestId: args.refreshRequestId,
        status: skipped ? "skipped" : "completed",
        reason: skipReason,
      });

      return result;
    } catch (error) {
      await ctx.runMutation(internal.ingestState.failRefreshRequest, {
        refreshRequestId: args.refreshRequestId,
        errorMessage: error instanceof Error ? error.message : "Unknown refresh request error",
      });

      throw error;
    }
  },
});
