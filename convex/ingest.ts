"use node";

import Parser from "rss-parser";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import {
  discoverFeedUrl,
  normalizeParsedEntry,
  parseHtmlEntries,
  parsePostHogPageData,
  type ParsedSourceEntry,
} from "../src/lib/ingestion/source-ingestion";

function cleanText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

const DEFAULT_INGESTION_USER_AGENT =
  process.env.INGESTION_USER_AGENT ?? "VersionWatchBot/1.0 (+https://version-watch.vercel.app)";
const BROWSER_FALLBACK_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const BROWSER_RETRY_STATUSES = new Set([403, 406, 429]);

function buildFetchHeaders(userAgent: string) {
  return {
    "User-Agent": userAgent,
    Accept: "text/markdown,text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
  };
}

async function fetchTextOnce(url: string, userAgent: string) {
  return await fetch(url, {
    headers: {
      ...buildFetchHeaders(userAgent),
    },
    redirect: "follow",
  });
}

async function fetchText(url: string) {
  let response = await fetchTextOnce(url, DEFAULT_INGESTION_USER_AGENT);

  if (!response.ok && BROWSER_RETRY_STATUSES.has(response.status)) {
    await response.body?.cancel();
    response = await fetchTextOnce(url, BROWSER_FALLBACK_USER_AGENT);
  }

  return {
    ok: response.ok,
    url: response.url,
    status: response.status,
    body: await response.text(),
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
]);

function parseFeedEntries(feedXml: string, fallbackUrl: string) {
  const parser = new Parser();

  return parser.parseString(feedXml).then((feed) => {
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

async function ingestSource(ctx: any, source: any, runType: "scheduled" | "manual" | "deep_diff") {
  const startedAt = Date.now();

  try {
    const sourceResponse = await fetchText(source.url);
    if (!sourceResponse.ok) {
      throw new Error(`Fetch failed with status ${sourceResponse.status} for ${source.url}`);
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
            parsedEntries = await parseFeedEntries(feedResponse.body, source.url);
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

    if (parsedEntries.length === 0) {
      parsedEntries = parseHtmlEntries({
        parserKey: source.parserKey,
        sourceUrl: sourceResponse.url,
        html: sourceResponse.body,
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
          sourceUrl: entry.url,
          summary: normalized.summary,
          whatChanged: normalized.whatChanged,
          whyItMatters: normalized.whyItMatters,
          whoShouldCare: normalized.whoShouldCare,
          affectedStack: normalized.affectedStack,
          categories: normalized.categories,
          publishedAt: entry.publishedAt,
          importanceScore: normalized.importanceScore,
          importanceBand: normalized.importanceBand,
          parseConfidence: normalized.parseConfidence,
          githubUrl: normalized.githubUrl ?? entry.githubUrl,
        };
      })
      .filter((item) => item.title && item.publishedAt);

    return await ctx.runMutation(internal.ingestState.persistSourceEntries, {
      sourceId: source.sourceId,
      vendorId: source.vendorId,
      startedAt,
      runType,
      items,
    });
  } catch (error) {
    return await ctx.runMutation(internal.ingestState.persistSourceFailure, {
      sourceId: source.sourceId,
      vendorId: source.vendorId,
      startedAt,
      runType,
      errorMessage: error instanceof Error ? error.message : "Unknown ingestion error",
    });
  }
}

function requireAdminSecret(suppliedSecret: string | undefined) {
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    throw new Error("Unauthorized");
  }
}

async function runIngestion(ctx: any, force: boolean, runType: "scheduled" | "manual" | "deep_diff") {
  await ctx.runMutation(internal.seed.syncRegistry, {});

  const sources = await ctx.runQuery(internal.ingestState.listDueSources, {
    force,
  });

  let itemsFetched = 0;
  let itemsCreated = 0;
  let itemsDeduped = 0;
  let published = 0;
  let failures = 0;

  for (const source of sources) {
    const result = await ingestSource(ctx, source, runType);
    itemsFetched += result.itemsFetched;
    itemsCreated += result.itemsCreated;
    itemsDeduped += result.itemsDeduped;
    published += result.published;
    if (result.failed) {
      failures += 1;
    }
  }

  return {
    sourcesProcessed: sources.length,
    itemsFetched,
    itemsCreated,
    itemsDeduped,
    published,
    failures,
  };
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
  },
  returns: v.object({
    sourcesProcessed: v.number(),
    itemsFetched: v.number(),
    itemsCreated: v.number(),
    itemsDeduped: v.number(),
    published: v.number(),
    failures: v.number(),
  }),
  handler: async (ctx, args) => {
    requireAdminSecret(args.adminSecret);
    return await runIngestion(ctx, args.force ?? true, "manual");
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
  }),
  handler: async (ctx) => {
    return await runIngestion(ctx, false, "scheduled");
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
  }),
  handler: async (ctx) => {
    return await runIngestion(ctx, true, "deep_diff");
  },
});
