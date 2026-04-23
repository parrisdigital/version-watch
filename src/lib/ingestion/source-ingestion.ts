import { load } from "cheerio";

import { getImportanceBand, scoreEvent } from "@/lib/classification/score";
import type { MockEvent, SourceType } from "@/lib/mock-data";

export type ParseConfidence = "high" | "medium" | "low";

export type ParsedSourceEntry = {
  title: string;
  url: string;
  excerpt: string;
  publishedAt: number;
  githubUrl?: string;
  parseConfidence?: ParseConfidence;
};

export type NormalizedParsedEntry = {
  slug: string;
  title: string;
  summary: string;
  whatChanged: string;
  whyItMatters: string;
  whoShouldCare: string[];
  affectedStack: string[];
  categories: string[];
  importanceScore: number;
  importanceBand: MockEvent["importanceBand"];
  parseConfidence: ParseConfidence;
  githubUrl?: string;
};

type HtmlParseInput = {
  parserKey: string;
  sourceUrl: string;
  html: string;
};

type NormalizeInput = {
  vendorSlug: string;
  vendorName: string;
  sourceName: string;
  sourceType: SourceType;
  entry: ParsedSourceEntry;
};

type MonthYearContext = {
  month?: number;
  year: number;
};

const MONTH_INDEX: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sept: 8,
  sep: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const NOISE_TITLES = new Set([
  "changelog",
  "share this article",
  "copy page",
  "highlights",
  "pricing",
  "get started",
  "contributors",
  "contributor",
  "compatibility note",
  "upgrade",
  "impact",
  "changes",
  "what’s new",
  "what's new",
  "what’s changing",
  "what's changing",
  "questions?",
  "timeline",
  "learn more",
]);

const VENDOR_STACKS: Record<string, string[]> = {
  openai: ["llms", "agents", "developer-workflow"],
  anthropic: ["llms", "agents"],
  gemini: ["llms", "search", "agents"],
  vercel: ["hosting", "deployments", "frontend-infra"],
  stripe: ["payments", "subscriptions"],
  github: ["developer-workflow", "ci-cd"],
  cloudflare: ["edge-compute", "hosting", "networking"],
  cursor: ["developer-workflow", "llms"],
  supabase: ["database", "backend", "auth"],
  firebase: ["backend", "mobile-platform"],
  "apple-developer": ["mobile-platform"],
  "android-developers": ["mobile-platform"],
  firecrawl: ["agents", "scraping", "search"],
  exa: ["search", "llms", "agents"],
  clerk: ["auth", "developer-workflow"],
  resend: ["email", "backend"],
  linear: ["developer-workflow", "product"],
  docker: ["containers", "developer-workflow", "infra"],
  "hermes-agent": ["agents", "developer-workflow", "automation"],
  "t3-code": ["developer-workflow", "llms", "desktop-app"],
  opencode: ["developer-workflow", "llms", "agents"],
  openusage: ["developer-workflow", "observability", "tooling"],
  "dp-code": ["developer-workflow", "llms", "desktop-app"],
  shadcn: ["frontend-ui", "design-system", "developer-workflow"],
  hono: ["framework", "backend", "edge-compute"],
  bun: ["runtime", "tooling", "backend"],
  vite: ["frontend-infra", "developer-workflow", "tooling"],
  openclaw: ["agents", "developer-workflow", "automation"],
  biome: ["tooling", "developer-workflow", "frontend-infra"],
  pnpm: ["tooling", "developer-workflow", "frontend-infra"],
  fastify: ["framework", "backend", "developer-workflow"],
  uv: ["tooling", "developer-workflow", "backend"],
  convex: ["backend", "database", "developer-workflow"],
  workos: ["auth", "developer-workflow", "security"],
  posthog: ["analytics", "observability", "experimentation"],
  netlify: ["hosting", "frontend-infra", "developer-workflow"],
  render: ["hosting", "backend", "developer-workflow"],
  railway: ["hosting", "database", "developer-workflow"],
  prisma: ["database", "orm", "developer-workflow"],
  neon: ["database", "backend", "serverless"],
  planetscale: ["database", "backend", "developer-workflow"],
  expo: ["mobile-platform", "developer-workflow", "frontend-infra"],
  sentry: ["observability", "developer-workflow", "backend"],
  "better-auth": ["auth", "security", "developer-workflow"],
  langchain: ["llms", "agents", "developer-workflow"],
};

function cleanText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function truncateSentence(value: string, maxLength = 220) {
  const text = cleanText(value);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function toAbsoluteUrl(href: string | null | undefined, sourceUrl: string) {
  if (!href) {
    return sourceUrl;
  }

  try {
    return new URL(href, sourceUrl).toString();
  } catch {
    return sourceUrl;
  }
}

function isDateLike(text: string) {
  const value = cleanText(text).toLowerCase();

  return (
    /^\d{4}-\d{2}-\d{2}(?:\.[a-z0-9-]+)?$/i.test(value) ||
    /^\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日$/i.test(value) ||
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]* \d{1,2}(?:, \d{4})?$/i.test(value) ||
    /^(january|february|march|april|may|june|july|august|september|october|november|december),? \d{4}$/i.test(value) ||
    /^date:\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]* \d{1,2}, \d{4}$/i.test(value)
  );
}

function parseMonthYearContext(text: string) {
  const value = cleanText(text).toLowerCase().replace(/^date:\s*/, "");
  const match = value.match(
    /^(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec),?\s+(\d{4})$/,
  );

  if (!match) {
    return null;
  }

  return {
    month: MONTH_INDEX[match[1]!] ?? undefined,
    year: Number(match[2]),
  } satisfies MonthYearContext;
}

function parseDateText(text: string, context: MonthYearContext | null) {
  const value = cleanText(text).replace(/^date:\s*/i, "");

  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}(?:[tT].*)?(?:\.[a-z0-9-]+)?$/i.test(value)) {
    const isoDate = value.slice(0, 10);
    const parsed = Date.parse(`${isoDate}T00:00:00.000Z`);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const eastAsiaMatch = value.match(/^(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日$/i);
  if (eastAsiaMatch) {
    return Date.UTC(Number(eastAsiaMatch[1]), Number(eastAsiaMatch[2]) - 1, Number(eastAsiaMatch[3]));
  }

  const explicitMonthDate = value.match(
    /^(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+\d{1,2},?\s+\d{4}$/i,
  );
  const withExplicitYear = explicitMonthDate ? Date.parse(value) : NaN;
  if (!Number.isNaN(withExplicitYear)) {
    return Date.UTC(
      new Date(withExplicitYear).getUTCFullYear(),
      new Date(withExplicitYear).getUTCMonth(),
      new Date(withExplicitYear).getUTCDate(),
    );
  }

  const shortMatch = value.match(
    /^(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})$/i,
  );

  if (shortMatch && context?.year) {
    return Date.UTC(context.year, MONTH_INDEX[shortMatch[1]!.toLowerCase()] ?? 0, Number(shortMatch[2]));
  }

  return null;
}

function parseDateFromText(text: string, context: MonthYearContext | null = null) {
  const value = cleanText(text);
  const isoMatch = value.match(/\b\d{4}-\d{2}-\d{2}\b/i);
  if (isoMatch) {
    return parseDateText(isoMatch[0], context);
  }

  const monthMatch = value.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+\d{1,2},\s+\d{4}\b/i,
  );
  if (monthMatch) {
    return parseDateText(monthMatch[0], context);
  }

  const shortMonthMatch = value.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+\d{1,2}\b/i,
  );
  if (shortMonthMatch) {
    return parseDateText(shortMonthMatch[0], context);
  }

  return parseDateText(value, context);
}

function stripMarkdown(value: string) {
  return cleanText(value)
    .replace(/<!--.*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[`*_>#|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyMarkdownDocument(value: string) {
  const text = value.trim();
  return !/<(?:html|body|main|article)\b/i.test(text) && /^\s*#{1,4}\s+/m.test(text);
}

function cleanMarkdownUrl(href: string, sourceUrl: string) {
  const absolute = toAbsoluteUrl(href, sourceUrl);
  return absolute.replace(/\.md(#.*)?$/i, "$1");
}

function collectMarkdownExcerpt(lines: string[], startIndex: number) {
  const parts: string[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (!line) {
      continue;
    }

    if (/^#{1,4}\s+/.test(line) && parts.length > 0) {
      break;
    }

    if (/^(download|view downloads?|windows\b|mac\b|linux\b)/i.test(stripMarkdown(line))) {
      continue;
    }

    const text = stripMarkdown(line.replace(/^[-*]\s+/, ""));
    if (text.length >= 24 && !isDateLike(text)) {
      parts.push(text);
    }

    if (parts.join(" ").length >= 260) {
      break;
    }
  }

  return truncateSentence(parts.join(" "));
}

function isMeaningfulTitle(text: string) {
  const value = cleanText(text);

  if (!value || value.length < 12) {
    return false;
  }

  if (NOISE_TITLES.has(value.toLowerCase())) {
    return false;
  }

  if (/stay organized with collections|save and categorize content/i.test(value)) {
    return false;
  }

  if (/^learn what['’]s changing/i.test(value)) {
    return false;
  }

  if (isDateLike(value)) {
    return false;
  }

  if (/^(feature|update|preview|general availability|breaking changes)$/i.test(value)) {
    return false;
  }

  if (/^(v\d+\/|[a-z0-9_.-]+\.[a-z0-9_.-]+$)/i.test(value)) {
    return false;
  }

  return true;
}

function collectExcerpt($: ReturnType<typeof load>, headingElement: any) {
  const excerptParts: string[] = [];

  for (const sibling of $(headingElement).nextAll().toArray()) {
    const tagName = sibling.tagName?.toLowerCase?.() ?? "";

    if (/^h[1-6]$/.test(tagName)) {
      break;
    }

    const text = cleanText($(sibling).text());
    if (!text || isDateLike(text)) {
      continue;
    }

    if (/^(category|published|contributors|contributor)$/i.test(text)) {
      continue;
    }

    if (text.length >= 24) {
      excerptParts.push(text);
    }

    if (excerptParts.join(" ").length >= 260) {
      break;
    }
  }

  return truncateSentence(excerptParts.join(" "));
}

function findDateBeforeElement($: ReturnType<typeof load>, element: any) {
  let context: MonthYearContext | null = null;

  for (const previous of $(element).prevAll().toArray().slice(0, 8)) {
    const text = cleanText($(previous).text());
    if (!text) {
      continue;
    }

    const monthYear = parseMonthYearContext(text);
    if (monthYear) {
      context = monthYear;
      continue;
    }

    const parsed = parseDateText(text, context);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function findGithubLink($: ReturnType<typeof load>, element: any, sourceUrl: string) {
  const link = $(element)
    .nextAll()
    .find('a[href*="github.com"]')
    .first()
    .attr("href");

  if (link) {
    return toAbsoluteUrl(link, sourceUrl);
  }

  return undefined;
}

function dedupeEntries(entries: ParsedSourceEntry[]) {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const key = `${entry.url}::${entry.title}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function parseDatedHeadingEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const entries: ParsedSourceEntry[] = [];

  for (const heading of root.find("h1, h2, h3, h4").toArray()) {
    const title = cleanText($(heading).text());
    if (!isMeaningfulTitle(title)) {
      continue;
    }

    const publishedAt = findDateBeforeElement($, heading);
    if (!publishedAt) {
      continue;
    }

    const excerpt = collectExcerpt($, heading) || title;
    const url = toAbsoluteUrl($(heading).find("a").first().attr("href"), sourceUrl);
    const githubUrl = findGithubLink($, heading, sourceUrl);

    entries.push({
      title,
      url,
      excerpt,
      publishedAt,
      githubUrl,
      parseConfidence: url !== sourceUrl ? "high" : "medium",
    });
  }

  return dedupeEntries(entries);
}

function parseCursorEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const entries: ParsedSourceEntry[] = [];

  for (const article of $("main article").toArray()) {
    const time = $(article).find("time[datetime]").first();
    const publishedAt = parseDateText(time.attr("datetime") ?? cleanText(time.text()), null);
    if (!publishedAt) {
      continue;
    }

    const titleLink = $(article).find('h1 a[href^="/changelog/"], h2 a[href^="/changelog/"]').first();
    const title = cleanText(titleLink.text() || $(article).find("h1, h2").first().text());
    if (!isMeaningfulCursorTitle(title)) {
      continue;
    }

    const excerpt =
      truncateSentence(
        $(article)
          .find(".prose p")
          .toArray()
          .map((element) => cleanText($(element).text()))
          .filter(Boolean)
          .slice(0, 2)
          .join(" "),
      ) || title;

    entries.push({
      title,
      url: toAbsoluteUrl(titleLink.attr("href"), sourceUrl),
      excerpt,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function isMeaningfulCursorTitle(title: string) {
  const value = cleanText(title);
  return value.length >= 4 && !NOISE_TITLES.has(value.toLowerCase()) && !isDateLike(value);
}

function parseMarkdownEntries(sourceUrl: string, markdown: string, parserKey: string) {
  const lines = markdown.split(/\r?\n/);

  if (parserKey.startsWith("stripe:")) {
    return parseStripeMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "anthropic:docs_page") {
    return parseAnthropicPlatformMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "docker:docs_page") {
    return parseDockerMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "exa:docs_page") {
    return parseExaMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "firecrawl:changelog_page") {
    return parseFirecrawlMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "railway:changelog_page") {
    return parseRailwayMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "neon:changelog_page") {
    return parseNeonMarkdownEntries(sourceUrl, lines);
  }

  return parseGenericMarkdownEntries(sourceUrl, lines, parserKey);
}

function parseStripeMarkdownEntries(sourceUrl: string, lines: string[]) {
  const entries: ParsedSourceEntry[] = [];
  let publishedAt: number | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const versionMatch = trimmed.match(/^##\s+(\d{4}-\d{2}-\d{2})(?:\.[a-z0-9-]+)?/i);
    if (versionMatch) {
      publishedAt = parseDateText(versionMatch[1]!, null);
      continue;
    }

    const rowMatch = trimmed.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (!rowMatch || !publishedAt) {
      continue;
    }

    const title = stripMarkdown(rowMatch[1]!);
    if (!isMeaningfulTitle(title)) {
      continue;
    }

    const products = stripMarkdown(rowMatch[3]!);
    const breaking = stripMarkdown(rowMatch[4]!);
    const category = stripMarkdown(rowMatch[5]!);
    entries.push({
      title,
      url: cleanMarkdownUrl(rowMatch[2]!, sourceUrl),
      excerpt: truncateSentence(`${title}. Affects ${products}. ${breaking}. ${category}.`),
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseAnthropicPlatformMarkdownEntries(sourceUrl: string, lines: string[]) {
  const entries: ParsedSourceEntry[] = [];
  let publishedAt: number | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^###\s+(.+)$/);
    if (headingMatch) {
      publishedAt = parseDateFromText(headingMatch[1]!);
      continue;
    }

    if (!publishedAt || !/^[-*]\s+/.test(trimmed)) {
      continue;
    }

    const excerpt = stripMarkdown(trimmed.replace(/^[-*]\s+/, ""));
    if (!isMeaningfulTitle(excerpt)) {
      continue;
    }

    const linkMatch = trimmed.match(/\[[^\]]+\]\(([^)]+)\)/);
    const title = buildAnthropicPlatformTitle(trimmed, excerpt);
    entries.push({
      title,
      url: linkMatch ? toAbsoluteUrl(linkMatch[1], sourceUrl) : sourceUrl,
      excerpt,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function cleanAnthropicLinkTitle(value: string) {
  const cleaned = stripMarkdown(value)
    .replace(/^what'?s new in\s+/i, "")
    .replace(/^migrating to\s+/i, "")
    .replace(/\s+overview$/i, "")
    .trim();

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function buildAnthropicPlatformTitle(markdownLine: string, excerpt: string) {
  const linkTextMatch = markdownLine.match(/\[([^\]]+)\]\([^)]+\)/);
  const linkedTitle = linkTextMatch ? cleanAnthropicLinkTitle(linkTextMatch[1]!) : "";

  const retiredMatch =
    excerpt.match(/retired the ([^.]+?) model\s*\(/i) ?? excerpt.match(/retired the ([^.]+?) model\b/i);
  if (retiredMatch) {
    return truncateSentence(`${retiredMatch[1]} retired from the Claude API`, 140);
  }

  const deprecationMatch = excerpt.match(/deprecation of the (.+?) model .* and the (.+?) model/i);
  if (deprecationMatch) {
    return truncateSentence(`${deprecationMatch[1]} and ${deprecationMatch[2]} deprecation announced`, 140);
  }

  if (linkedTitle) {
    if (/bedrock customers/i.test(excerpt)) {
      return "Claude in Amazon Bedrock self-serve availability";
    }

    if (/public beta/i.test(excerpt)) {
      return truncateSentence(`${linkedTitle} public beta`, 140);
    }

    if (/generally available|no beta header required/i.test(excerpt)) {
      return truncateSentence(`${linkedTitle} generally available`, 140);
    }

    if (/launched|launch/i.test(excerpt)) {
      return truncateSentence(`${linkedTitle} launched`, 140);
    }
  }

  const firstSentence = excerpt.split(/(?<=[.!?])\s+/)[0] ?? excerpt;
  const normalized = firstSentence
    .replace(/^we(?:'ve| have)\s+/i, "Anthropic ")
    .replace(/^we announced\s+/i, "Anthropic announced ")
    .replace(/^we're\s+/i, "Anthropic is ");

  return truncateSentence(normalized, 140);
}

function parseDockerMarkdownEntries(sourceUrl: string, lines: string[]) {
  const entries: ParsedSourceEntry[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    const versionMatch = line.match(/^##\s+(\d+\.\d+\.\d+)/i);
    if (!versionMatch) {
      continue;
    }

    const dateText = [line, ...lines.slice(index + 1, index + 4)].join(" ");
    const match = dateText.match(/(\d{4}-\d{2}-\d{2})/i);
    if (!match) {
      continue;
    }

    const publishedAt = parseDateText(match[1]!, null);
    if (!publishedAt) {
      continue;
    }

    const version = versionMatch[1]!;
    entries.push({
      title: `Docker Desktop ${version}`,
      url: `${sourceUrl.replace(/\/$/, "")}/#${version.replace(/\./g, "")}`,
      excerpt: collectMarkdownExcerpt(lines, index + 1) || `Docker Desktop ${version} release notes.`,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseExaMarkdownEntries(sourceUrl: string, lines: string[]) {
  const title = stripMarkdown(lines.find((line) => line.trim().startsWith("# "))?.trim().replace(/^#\s+/, "") ?? "");
  if (!isMeaningfulTitle(title)) {
    return [] satisfies ParsedSourceEntry[];
  }

  const pageText = lines.map(stripMarkdown).join(" ");
  const publishedAt = parseExaPublishedAt(pageText);

  if (!publishedAt) {
    return [] satisfies ParsedSourceEntry[];
  }

  return [
    {
      title,
      url: sourceUrl.replace(/\.md$/i, ""),
      excerpt: collectMarkdownExcerpt(lines, lines.findIndex((line) => /^##\s+/i.test(line.trim())) + 1) || title,
      publishedAt,
      parseConfidence: "high",
    },
  ] satisfies ParsedSourceEntry[];
}

function parseFirecrawlMarkdownEntries(sourceUrl: string, lines: string[]) {
  const entries: ParsedSourceEntry[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = lines[index]?.trim().match(/^##\s+(.+)$/);
    if (!headingMatch) {
      continue;
    }

    const title = stripMarkdown(headingMatch[1]!);
    if (!isMeaningfulTitle(title)) {
      continue;
    }

    const dateText = lines.slice(index + 1, index + 5).join(" ");
    const publishedAt = parseDateFromText(dateText);
    if (!publishedAt) {
      continue;
    }

    entries.push({
      title,
      url: sourceUrl,
      excerpt: collectMarkdownExcerpt(lines, index + 1) || title,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseRailwayMarkdownEntries(sourceUrl: string, lines: string[]) {
  const entries: ParsedSourceEntry[] = [];
  let activeTitle: string | null = null;
  let activeDate: number | null = null;
  let activeUrl = sourceUrl;

  const flush = () => {
    if (!activeTitle || !activeDate) {
      return;
    }

    entries.push({
      title: activeTitle,
      url: activeUrl,
      excerpt: activeTitle,
      publishedAt: activeDate,
      parseConfidence: "high",
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^##\s+(.+)$/);
    if (headingMatch) {
      const title = stripMarkdown(headingMatch[1]!);
      if (!isMeaningfulTitle(title)) {
        continue;
      }

      flush();
      activeTitle = title;
      activeDate = null;
      activeUrl = sourceUrl;
      continue;
    }

    const dateMatch = trimmed.match(/^-\s+Date:\s*(\d{4}-\d{2}-\d{2})$/i);
    if (dateMatch) {
      activeDate = parseDateText(dateMatch[1]!, null);
      continue;
    }

    const linkMatch = trimmed.match(/^-\s+Link:\s*(https?:\/\/\S+)$/i);
    if (linkMatch) {
      activeUrl = cleanMarkdownUrl(linkMatch[1]!, sourceUrl);
    }
  }

  flush();
  return dedupeEntries(entries);
}

function parseNeonMarkdownEntries(sourceUrl: string, lines: string[]) {
  const entries: ParsedSourceEntry[] = [];
  let activeDate: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    const dateMatch = line.match(/^###\s+(\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) {
      activeDate = parseDateText(dateMatch[1]!, null);
      continue;
    }

    const headingMatch = line.match(/^##\s+(.+)$/);
    if (!headingMatch || !activeDate) {
      continue;
    }

    const title = stripMarkdown(headingMatch[1]!);
    if (!isMeaningfulTitle(title) || /^entries$/i.test(title)) {
      continue;
    }

    entries.push({
      title,
      url: sourceUrl,
      excerpt: collectMarkdownExcerpt(lines, index + 1) || title,
      publishedAt: activeDate,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseGenericMarkdownEntries(sourceUrl: string, lines: string[], parserKey: string) {
  const entries: ParsedSourceEntry[] = [];
  const pageTitle = stripMarkdown(lines.find((line) => /^#\s+/.test(line.trim()))?.trim().replace(/^#\s+/, "") ?? "");

  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = lines[index]?.trim().match(/^#{2,4}\s+(.+)$/);
    if (!headingMatch) {
      continue;
    }

    const rawTitle = stripMarkdown(headingMatch[1]!);
    const publishedAt = parseDateFromText(rawTitle);
    if (!publishedAt) {
      continue;
    }

    let title = rawTitle
      .replace(/\s*[-–]\s*(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+\d{1,2},\s+\d{4}$/i, "")
      .replace(/\s*[-–]\s*\d{4}-\d{2}-\d{2}$/i, "")
      .trim();

    if (/^update$/i.test(title) && parserKey.startsWith("firebase:")) {
      title = `${pageTitle} ${rawTitle}`;
    }

    if (!isMeaningfulTitle(title)) {
      continue;
    }

    entries.push({
      title,
      url: sourceUrl,
      excerpt: collectMarkdownExcerpt(lines, index + 1) || title,
      publishedAt,
      parseConfidence: "medium",
    });
  }

  return dedupeEntries(entries);
}

function parseAnthropicProductEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const entries: ParsedSourceEntry[] = [];
  let activeDate: number | null = null;
  let pendingTitle: string | null = null;

  for (const element of root.find("h2, h3, p").toArray()) {
    const tagName = element.tagName?.toLowerCase?.() ?? "";
    const text = cleanText($(element).text());
    if (!text) {
      continue;
    }

    if (tagName === "h3") {
      activeDate = parseDateFromText(text);
      pendingTitle = null;
      continue;
    }

    if (!activeDate || tagName !== "p") {
      continue;
    }

    if (!pendingTitle) {
      if (isMeaningfulTitle(text)) {
        pendingTitle = text;
      }
      continue;
    }

    entries.push({
      title: pendingTitle,
      url: toAbsoluteUrl($(element).find("a").first().attr("href"), sourceUrl),
      excerpt: truncateSentence(text) || pendingTitle,
      publishedAt: activeDate,
      parseConfidence: "high",
    });
    activeDate = null;
    pendingTitle = null;
  }

  return dedupeEntries(entries);
}

function parseExaEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const title = cleanText(root.find("h1").first().text()) || cleanText($("title").first().text());

  if (!isMeaningfulTitle(title)) {
    return [] satisfies ParsedSourceEntry[];
  }

  const pageText = cleanText(root.text());
  const publishedAt = parseExaPublishedAt(pageText);

  if (!publishedAt) {
    return [] satisfies ParsedSourceEntry[];
  }

  return [
    {
      title,
      url: sourceUrl,
      excerpt: collectExcerpt($, root.find("h1").first().get(0)) || title,
      publishedAt,
      parseConfidence: "high",
    },
  ] satisfies ParsedSourceEntry[];
}

function parseExaPublishedAt(pageText: string) {
  const year = Number(pageText.match(/\b(20\d{2})\b/)?.[1] ?? new Date().getUTCFullYear());
  const explicitDate = pageText.match(
    /\bdate:\s*(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+\d{1,2},\s+20\d{2}\b/i,
  );
  const noticeDate = pageText.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+\d{1,2}\s+[—-]\s+this notice/i,
  );

  if (explicitDate) {
    return parseDateFromText(explicitDate[0]!, { year });
  }

  if (noticeDate) {
    return parseDateText(noticeDate[0]!.split(/[—-]/)[0]!.trim(), { year });
  }

  return parseDateFromText(pageText, { year });
}

export function parsePostHogPageData(sourceUrl: string, pageData: string) {
  try {
    const parsed = JSON.parse(pageData);
    const nodes = parsed?.result?.data?.allRoadmap?.nodes;
    if (!Array.isArray(nodes)) {
      return [] satisfies ParsedSourceEntry[];
    }

    const entries = nodes
      .map((node: any) => {
        const title = cleanText(node?.title);
        const publishedAt = parseDateText(cleanText(node?.date), null);
        if (!isMeaningfulTitle(title) || !publishedAt) {
          return null;
        }

        const description = stripMarkdown(node?.description ?? "");
        const ctaUrl = cleanText(node?.cta?.url);
        const primaryUrl =
          ctaUrl && /(^https?:\/\/)?([^.]+\.)*posthog\.com\//i.test(ctaUrl) ? ctaUrl : sourceUrl;
        const githubUrl = Array.isArray(node?.githubUrls)
          ? node.githubUrls.find((value: unknown) => typeof value === "string" && value.includes("github.com"))
          : undefined;

        return {
          title,
          url: primaryUrl,
          excerpt: truncateSentence(description || title),
          publishedAt,
          githubUrl,
          parseConfidence: "high" as const,
        };
      })
      .filter(Boolean) as ParsedSourceEntry[];

    return dedupeEntries(entries)
      .sort((left, right) => right.publishedAt - left.publishedAt)
      .slice(0, 12);
  } catch {
    return [] satisfies ParsedSourceEntry[];
  }
}

function parseRailwayEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const entries: ParsedSourceEntry[] = [];

  for (const link of $('a[href^="/changelog/"]').toArray()) {
    const href = $(link).attr("href");
    if (!href || !/^\/changelog\/\d{4}-\d{2}-\d{2}/.test(href)) {
      continue;
    }

    const title =
      cleanText($(link).find("p.font-semibold").first().text()) ||
      cleanText($(link).find("p").first().text());
    if (!isMeaningfulTitle(title)) {
      continue;
    }

    const year = Number(href.match(/^\/changelog\/(\d{4})-/)?.[1] ?? 0);
    const dateText = cleanText($(link).find("p.text-sm").first().text());
    const publishedAt =
      parseDateText(dateText, year ? { year } : null) ??
      parseDateText(href.match(/^\/changelog\/(\d{4}-\d{2}-\d{2})/)?.[1] ?? "", null);

    if (!publishedAt) {
      continue;
    }

    entries.push({
      title,
      url: toAbsoluteUrl(href, sourceUrl),
      excerpt: title,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parsePrismaEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const entries: ParsedSourceEntry[] = [];

  for (const link of $('a[href^="/changelog/"]').toArray()) {
    const href = $(link).attr("href");
    const title = cleanText($(link).find("h2").first().text());
    const publishedAt =
      parseDateText(href?.match(/\/changelog\/(\d{4}-\d{2}-\d{2})/)?.[1] ?? "", null) ??
      parseDateFromText(cleanText($(link).find(".eyebrow").first().text()));
    if (!href || !isMeaningfulTitle(title) || !publishedAt) {
      continue;
    }

    entries.push({
      title,
      url: toAbsoluteUrl(href, sourceUrl),
      excerpt: truncateSentence(cleanText($(link).find("p").first().text()) || title),
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseExpoEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const entries: ParsedSourceEntry[] = [];

  for (const article of $("article").toArray()) {
    const time = $(article).find("time[datetime]").first();
    const heading = $(article).find("h2").first();
    const titleLink = heading.closest('a[href^="/changelog/"]');
    const title = cleanText(heading.text());
    const publishedAt = parseDateText(time.attr("datetime") ?? cleanText(time.text()), null);
    if (!titleLink.length || !isMeaningfulTitle(title) || !publishedAt) {
      continue;
    }

    entries.push({
      title,
      url: toAbsoluteUrl(titleLink.attr("href"), sourceUrl),
      excerpt: truncateSentence(cleanText($(article).find("p").first().text()) || title),
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseSentryEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const entries: ParsedSourceEntry[] = [];

  for (const link of $('a[href^="/changelog/"]').toArray()) {
    const title = cleanText($(link).find("h3").first().text());
    const publishedAt = parseDateFromText(cleanText($(link).find("time").first().text()));
    if (!isMeaningfulTitle(title) || !publishedAt) {
      continue;
    }

    const excerpt =
      truncateSentence(cleanText($(link).find(".prose p").first().text())) ||
      truncateSentence(cleanText($(link).text()).replace(title, "").replace(cleanText($(link).find("time").first().text()), "")) ||
      title;

    entries.push({
      title,
      url: toAbsoluteUrl($(link).attr("href"), sourceUrl),
      excerpt,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseBetterAuthEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const entries: ParsedSourceEntry[] = [];

  for (const header of $("div.flex.items-baseline.mb-4").toArray()) {
    const releaseLink = $(header).find('a[href*="/releases/tag/"]').first();
    const version = cleanText(releaseLink.text());
    const publishedAt = parseDateFromText(cleanText($(header).find("time").first().text()));
    if (!version || !publishedAt) {
      continue;
    }

    const content = $(header).next("div");
    const excerpt =
      truncateSentence(cleanText(content.find("li").first().text())) ||
      truncateSentence(cleanText(content.find("p").first().text())) ||
      `Better Auth ${version}`;

    entries.push({
      title: `Better Auth ${version}`,
      url: toAbsoluteUrl(releaseLink.attr("href"), sourceUrl),
      excerpt,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseAndroidReleaseEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const androidVersion = sourceUrl.match(/\/versions\/(\d+)\//)?.[1] ?? "";
  const pageTitle = androidVersion ? `Android ${androidVersion}` : "Android";
  const entries: ParsedSourceEntry[] = [];

  for (const heading of root.find("h2, h3").toArray()) {
    const title = cleanText($(heading).text());
    if (!/^beta\s+\d+|developer preview\s+\d+/i.test(title)) {
      continue;
    }

    const sectionText = cleanText($(heading).nextUntil("h2, h3").text());
    const releaseDate = sectionText.match(/Release date\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i)?.[1];
    const publishedAt = parseDateFromText(releaseDate ?? sectionText);
    if (!publishedAt) {
      continue;
    }

    entries.push({
      title: `${pageTitle.replace(/\s+/g, " ").trim()} ${title}`.replace(/^Android\s+/, "Android "),
      url: `${sourceUrl.replace(/\?.*$/, "")}#${$(heading).attr("id") ?? title.toLowerCase().replace(/\s+/g, "-")}`,
      excerpt: truncateSentence(sectionText) || title,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseFirebaseEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const pageTitle = cleanText(root.find("h1").first().text()).replace(/Stay organized.*/i, "").trim();
  const entries: ParsedSourceEntry[] = [];

  for (const heading of root.find("h2").toArray()) {
    const rawTitle = cleanText($(heading).text());
    const publishedAt = parseDateFromText(rawTitle);
    if (!publishedAt) {
      continue;
    }

    let title = rawTitle.replace(/\s*[-–]\s*(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+\d{1,2},\s+\d{4}$/i, "").trim();
    if (/^update$/i.test(title)) {
      const firstFeature = cleanText($(heading).nextUntil("h2").filter("h3").first().text());
      title = firstFeature ? `${pageTitle}: ${firstFeature}` : `${pageTitle}: ${rawTitle}`;
    } else {
      title = `${pageTitle}: ${title}`;
    }

    if (!isMeaningfulTitle(title)) {
      continue;
    }

    entries.push({
      title,
      url: `${sourceUrl.replace(/\?.*$/, "")}#${$(heading).attr("id") ?? ""}`,
      excerpt: collectExcerpt($, heading) || title,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseTimelineEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const entries: ParsedSourceEntry[] = [];

  for (const time of root.find("time").toArray()) {
    const publishedAt = parseDateFromText($(time).attr("datetime") ?? $(time).text());
    if (!publishedAt) {
      continue;
    }

    const container = $(time).closest("li, article, section").length
      ? $(time).closest("li, article, section")
      : $(time).parent().parent();
    const heading = container.find("h1, h2, h3").first();
    const title = cleanText(heading.text());

    if (!isMeaningfulTitle(title)) {
      continue;
    }

    entries.push({
      title,
      url: toAbsoluteUrl(heading.find("a").first().attr("href"), sourceUrl),
      excerpt: collectExcerpt($, heading.get(0)) || truncateSentence(cleanText(container.text()).replace(title, "")) || title,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseLinkedEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const entries: ParsedSourceEntry[] = [];

  for (const link of root.find('a[href*="/changelog/"]').toArray()) {
    const href = $(link).attr("href");
    const title = cleanText($(link).text());

    if (!href || !isMeaningfulTitle(title)) {
      continue;
    }

    const parent = $(link).closest("li, article, section, div");
    const excerpt = truncateSentence(cleanText(parent.text()).replace(title, "").trim()) || title;
    const publishedAt =
      findDateBeforeElement($, parent.get(0) ?? link) ??
      findDateBeforeElement($, link);

    if (!publishedAt) {
      continue;
    }

    entries.push({
      title,
      url: toAbsoluteUrl(href, sourceUrl),
      excerpt,
      publishedAt,
      parseConfidence: "medium",
    });
  }

  return dedupeEntries(entries);
}

function stripAppendedProductSuffix(value: string) {
  return cleanText(value)
    .replace(
      /\s*(?:Checkout|Paymentlinks|Connect|Elements|Payments|Crypto|Issuing|Radar|Billing|Invoicing|Climate|Payouts|Financialconnections|Tax|Treasury)(?:\+\s*\d+\s*more)?$/i,
      "",
    )
    .trim();
}

function parseStripeLinkedEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const entries: ParsedSourceEntry[] = [];

  for (const link of root.find('a[href*="/changelog/"]').toArray()) {
    const href = $(link).attr("href");
    const publishedAt = parseDateText(
      href?.match(/\/changelog\/[^/]+\/(\d{4}-\d{2}-\d{2})\//)?.[1] ?? "",
      null,
    );

    if (!href || !publishedAt) {
      continue;
    }

    const title = stripAppendedProductSuffix(cleanText($(link).text()));
    if (!isMeaningfulTitle(title)) {
      continue;
    }

    const parent = $(link).closest("li, article, section, tr, div");
    const excerpt =
      truncateSentence(stripAppendedProductSuffix(cleanText(parent.text()).replace(title, "").trim())) ||
      title;

    entries.push({
      title,
      url: cleanMarkdownUrl(href, sourceUrl),
      excerpt,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries).sort((left, right) => right.publishedAt - left.publishedAt);
}

function parseSingleDocumentEntry(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const heading = root.find("h1, h2").filter((_index, element) => {
    return isMeaningfulTitle(cleanText($(element).text()));
  }).first();

  if (!heading.length) {
    return [] satisfies ParsedSourceEntry[];
  }

  let context: MonthYearContext | null = null;
  let publishedAt: number | null = null;

  for (const element of root.find("p, li, h3, h4, time").toArray()) {
    const text = cleanText($(element).text());
    if (!text) {
      continue;
    }

    const monthYear = parseMonthYearContext(text);
    if (monthYear) {
      context = monthYear;
    }

    if (!publishedAt) {
      publishedAt = parseDateText(text, context);
    }

    if (publishedAt) {
      break;
    }
  }

  const excerpt =
    truncateSentence(cleanText(heading.nextAll("p").first().text())) ||
    truncateSentence(cleanText(root.find("p").first().text())) ||
    cleanText(heading.text());

  return [
    {
      title: cleanText(heading.text()),
      url: sourceUrl,
      excerpt,
      publishedAt: publishedAt ?? Date.now(),
      parseConfidence: publishedAt ? "medium" : "low",
    },
  ] satisfies ParsedSourceEntry[];
}

function parseOpenAIChangelogCards(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const entries: ParsedSourceEntry[] = [];

  for (const heading of root.find("h2, h3").toArray()) {
    const context = parseMonthYearContext(cleanText($(heading).text()));
    if (!context) {
      continue;
    }

    const section = $(heading).parent();
    for (const card of section.children("div").toArray()) {
      const cardRoot = $(card);
      const dateText = cleanText(cardRoot.find('[data-variant="outline"]').first().text());
      const publishedAt = parseDateText(dateText, context);

      if (!publishedAt) {
        continue;
      }

      const paragraphs = cardRoot
        .find("p")
        .toArray()
        .map((paragraph) => cleanText($(paragraph).text()))
        .filter((text) => text && isMeaningfulTitle(text));
      const title = paragraphs[0];

      if (!title) {
        continue;
      }

      const excerpt =
        truncateSentence(
          cardRoot
            .find("p, li")
            .toArray()
            .map((element) => cleanText($(element).text()))
            .filter(Boolean)
            .join(" "),
        ) || title;

      entries.push({
        title: truncateSentence(title) || title,
        url: sourceUrl,
        excerpt,
        publishedAt,
        parseConfidence: "high",
      });
    }
  }

  return dedupeEntries(entries).sort((left, right) => right.publishedAt - left.publishedAt);
}

function parseOpenAITimeline(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const lines = root
    .find("h1, h2, h3, h4, p, li")
    .toArray()
    .map((element) => cleanText($(element).text()))
    .filter(Boolean);

  const entries: ParsedSourceEntry[] = [];
  let context: MonthYearContext | null = null;
  let activeDate: number | null = null;

  for (const line of lines) {
    const monthYear = parseMonthYearContext(line);
    if (monthYear) {
      context = monthYear;
      continue;
    }

    const parsedDate = parseDateText(line, context);
    if (parsedDate) {
      activeDate = parsedDate;
      continue;
    }

    if (!activeDate) {
      continue;
    }

    if (!isMeaningfulTitle(line)) {
      continue;
    }

    entries.push({
      title: line,
      url: sourceUrl,
      excerpt: truncateSentence(line),
      publishedAt: activeDate,
      parseConfidence: "medium",
    });

    activeDate = null;
  }

  return dedupeEntries(entries);
}

export function discoverFeedUrl(html: string, sourceUrl: string) {
  const $ = load(html);
  const selectors = [
    'link[type*="rss"]',
    'link[type*="atom"]',
    'a[href*="rss"]',
    'a[href*="atom"]',
    'a:contains("RSS")',
  ];

  for (const selector of selectors) {
    const href = $(selector).first().attr("href");
    if (href) {
      return toAbsoluteUrl(href, sourceUrl);
    }
  }

  return null;
}

export function parseHtmlEntries({ parserKey, sourceUrl, html }: HtmlParseInput) {
  if (isLikelyMarkdownDocument(html)) {
    const markdownEntries = parseMarkdownEntries(sourceUrl, html, parserKey);
    if (markdownEntries.length > 0) {
      return markdownEntries.slice(0, 12);
    }
  }

  if (parserKey === "anthropic:changelog_page") {
    const entries = parseAnthropicProductEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "android-developers:docs_page") {
    const entries = parseAndroidReleaseEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "firebase:docs_page") {
    const entries = parseFirebaseEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "cursor:changelog_page") {
    const entries = parseCursorEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "exa:docs_page") {
    const entries = parseExaEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "railway:changelog_page") {
    const entries = parseRailwayEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "prisma:changelog_page") {
    const entries = parsePrismaEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "expo:changelog_page") {
    const entries = parseExpoEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "sentry:changelog_page") {
    const entries = parseSentryEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "better-auth:changelog_page") {
    const entries = parseBetterAuthEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "firecrawl:changelog_page" || parserKey === "resend:changelog_page") {
    const entries = parseTimelineEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey.startsWith("stripe:")) {
    const entries = parseStripeLinkedEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "openai:docs_page") {
    const cardEntries = parseOpenAIChangelogCards(sourceUrl, html);
    if (cardEntries.length > 0) {
      return cardEntries.slice(0, 12);
    }

    const entries = parseOpenAITimeline(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "gemini:docs_page") {
    const entries = parseOpenAITimeline(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  const headingEntries = parseDatedHeadingEntries(sourceUrl, html);
  if (headingEntries.length > 0) {
    return headingEntries.slice(0, 12);
  }

  return parseSingleDocumentEntry(sourceUrl, html).slice(0, 12);
}

function classifyCategories(text: string, sourceType: SourceType) {
  const value = text.toLowerCase();
  const categories = new Set<string>();

  if (/breaking|deprecat|retir|remove|sunset|migration|behavior|computation|default/i.test(value)) {
    categories.add("breaking");
  }
  if (/security|vulnerability|cve|fraud|attack|breach/i.test(value)) {
    categories.add("security");
  }
  if (/price|pricing|billing|invoice|credit|cost|usage-based/i.test(value)) {
    categories.add("pricing");
  }
  if (/model|gpt|claude|gemini|reasoning|llm|codex/i.test(value)) {
    categories.add("model");
  }
  if (/sdk|library|typescript|python|java|swift|android|node/i.test(value)) {
    categories.add("sdk");
  }
  if (/api|endpoint|parameter|request|response|schema|tool/i.test(value)) {
    categories.add("api");
  }
  if (/deploy|runtime|worker|infra|hosting|preview|build|runner|edge|container/i.test(value)) {
    categories.add("infra");
  }
  if (categories.size === 0) {
    categories.add(sourceType === "docs_page" ? "docs" : "api");
  }

  if (sourceType !== "blog" && sourceType !== "rss") {
    categories.add("api");
  }

  return [...categories].slice(0, 3);
}

function classifyAffectedStack(vendorSlug: string, text: string) {
  const stacks = new Set<string>(VENDOR_STACKS[vendorSlug] ?? []);
  const value = text.toLowerCase();

  if (/payment|invoice|subscription|checkout|billing/i.test(value)) {
    stacks.add("payments");
    stacks.add("subscriptions");
  }
  if (/auth|organization|oauth|api key|directory sync|login/i.test(value)) {
    stacks.add("auth");
  }
  if (/search|crawl|scrape|monitor/i.test(value)) {
    stacks.add("search");
    stacks.add("scraping");
  }
  if (/deploy|preview|runtime|worker|edge|hosting|container/i.test(value)) {
    stacks.add("hosting");
    stacks.add("deployments");
  }
  if (/model|gpt|claude|gemini|reasoning|agent|tool/i.test(value)) {
    stacks.add("llms");
    stacks.add("agents");
  }
  if (/ios|android|xcode|swift|mobile/i.test(value)) {
    stacks.add("mobile-platform");
  }
  if (/ci|github actions|runner|build/i.test(value)) {
    stacks.add("ci-cd");
  }

  return [...stacks].slice(0, 4);
}

function classifyAudience(categories: string[], affectedStack: string[]) {
  const audience = new Set<string>();
  const stackText = affectedStack.join(" ");

  if (/frontend|hosting|deployments/.test(stackText)) {
    audience.add("frontend");
  }
  if (/payments|subscriptions|auth|database|backend|developer-workflow|ci-cd/.test(stackText)) {
    audience.add("backend");
  }
  if (/mobile-platform/.test(stackText)) {
    audience.add("mobile");
  }
  if (/hosting|deployments|edge-compute|containers|networking/.test(stackText)) {
    audience.add("infra");
  }
  if (/llms|agents|search|scraping/.test(stackText)) {
    audience.add("ai");
  }
  if (categories.includes("pricing") || categories.includes("breaking")) {
    audience.add("product");
  }

  if (audience.size === 0) {
    audience.add("backend");
  }

  return [...audience];
}

function buildWhyItMatters(
  vendorName: string,
  sourceName: string,
  affectedStack: string[],
  categories: string[],
) {
  const teams = affectedStack.slice(0, 2).join(" and ") || "application";
  const urgency = categories.includes("breaking") || categories.includes("security")
    ? "before the next deploy"
    : "during the next release review";

  return `${vendorName} updated ${sourceName.toLowerCase()} semantics for ${teams}. Review the official entry ${urgency}.`;
}

function slugify(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeParsedEntry({
  vendorSlug,
  vendorName,
  sourceName,
  sourceType,
  entry,
}: NormalizeInput): NormalizedParsedEntry {
  const categories = classifyCategories(entry.title, sourceType);
  const combinedText = `${entry.title} ${entry.excerpt}`.trim();
  const affectedStack = classifyAffectedStack(vendorSlug, combinedText);
  const whoShouldCare = classifyAudience(categories, affectedStack);
  const summary = truncateSentence(entry.excerpt || entry.title, 240) || entry.title;

  const score = scoreEvent({
    id: `${vendorSlug}:${entry.url}`,
    slug: slugify(`${vendorSlug}-${entry.title}`),
    vendorSlug,
    vendorName,
    title: entry.title,
    summary,
    whatChanged: summary,
    whyItMatters: "",
    whoShouldCare,
    affectedStack,
    categories,
    publishedAt: new Date(entry.publishedAt).toISOString(),
    sourceUrl: entry.url,
    sourceType,
    importanceBand: "low",
    githubUrl: entry.githubUrl,
  });

  return {
    slug: slugify(`${vendorSlug}-${new Date(entry.publishedAt).toISOString().slice(0, 10)}-${entry.title}`),
    title: entry.title,
    summary,
    whatChanged: summary,
    whyItMatters: buildWhyItMatters(vendorName, sourceName, affectedStack, categories),
    whoShouldCare,
    affectedStack,
    categories,
    importanceScore: score,
    importanceBand: getImportanceBand(score),
    parseConfidence: entry.parseConfidence ?? (entry.url !== "" ? "high" : "medium"),
    githubUrl: entry.githubUrl,
  };
}
