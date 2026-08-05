import { load } from "cheerio";

import { deriveSignalMetadata } from "@/lib/classification/signal";
import type { ImpactConfidence, ReleaseClass } from "@/lib/classification/signal";
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
  rawTitle: string;
  summary: string;
  whatChanged: string;
  whyItMatters: string;
  whoShouldCare: string[];
  affectedStack: string[];
  categories: string[];
  topicTags: string[];
  releaseClass: ReleaseClass;
  impactConfidence: ImpactConfidence;
  signalReasons: string[];
  scoreVersion: string;
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

const SHORT_MEANINGFUL_TITLES = new Set(["grok build"]);

const VENDOR_STACKS: Record<string, string[]> = {
  openai: ["llms", "agents", "developer-workflow"],
  anthropic: ["llms", "agents"],
  gemini: ["llms", "search", "agents"],
  xai: ["llms", "agents", "api"],
  "grok-build": ["developer-workflow", "agents", "llms", "terminal"],
  "meta-ai": ["llms", "agents", "sdk"],
  groq: ["llms", "agents", "api"],
  openrouter: ["llms", "api", "models"],
  "mistral-ai": ["llms", "api", "models"],
  perplexity: ["llms", "search", "api"],
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
  cline: ["developer-workflow", "agents", "llms"],
  "augment-code": ["developer-workflow", "agents", "llms"],
  clerk: ["auth", "developer-workflow"],
  resend: ["email", "backend"],
  linear: ["developer-workflow", "product"],
  warp: ["terminal", "developer-workflow", "agents"],
  vscode: ["editor", "developer-workflow", "tooling"],
  zed: ["editor", "developer-workflow", "llms"],
  dia: ["browser", "developer-workflow", "llms"],
  brave: ["browser", "privacy", "llms"],
  windsurf: ["developer-workflow", "agents", "llms", "desktop-app"],
  "google-antigravity": ["developer-workflow", "agents", "llms"],
  "factory-droid": ["developer-workflow", "agents", "llms", "automation"],
  kiro: ["editor", "developer-workflow", "agents", "llms"],
  amp: ["developer-workflow", "agents", "llms", "editor"],
  "replit-agent": ["developer-workflow", "agents", "llms", "hosting"],
  v0: ["developer-workflow", "agents", "frontend-ui", "hosting"],
  "github-copilot": ["developer-workflow", "agents", "llms", "editor"],
  coderabbit: ["developer-workflow", "agents", "code-review", "pull-requests"],
  qodo: ["developer-workflow", "agents", "code-review", "testing"],
  "continue": ["developer-workflow", "agents", "llms", "editor"],
  openhands: ["developer-workflow", "agents", "automation"],
  goose: ["developer-workflow", "agents", "llms", "mcp"],
  aider: ["developer-workflow", "agents", "llms", "terminal"],
  "roo-code": ["developer-workflow", "agents", "llms", "editor"],
  lovable: ["developer-workflow", "agents", "frontend-ui", "hosting"],
  bolt: ["developer-workflow", "agents", "frontend-ui", "hosting"],
  tabnine: ["developer-workflow", "agents", "llms", "editor"],
  "sourcegraph-cody": ["developer-workflow", "agents", "code-search", "editor"],
  "gemini-code-assist": ["developer-workflow", "agents", "llms", "editor"],
  "amazon-q-developer": ["developer-workflow", "agents", "aws", "editor"],
  "jetbrains-junie": ["developer-workflow", "agents", "llms", "editor"],
  docker: ["containers", "developer-workflow", "infra"],
  "claude-code": ["developer-workflow", "agents", "llms", "terminal"],
  "kilo-code": ["developer-workflow", "agents", "llms", "editor"],
  "hermes-agent": ["agents", "developer-workflow", "automation"],
  "t3-code": ["developer-workflow", "llms", "desktop-app"],
  opencode: ["developer-workflow", "llms", "agents"],
  openusage: ["developer-workflow", "observability", "tooling"],
  "dp-code": ["developer-workflow", "llms", "desktop-app"],
  shadcn: ["frontend-ui", "design-system", "developer-workflow"],
  "shadcn-studio": ["frontend-ui", "design-system", "developer-workflow"],
  shadcnblocks: ["frontend-ui", "design-system", "developer-workflow"],
  shadcnspace: ["frontend-ui", "design-system", "developer-workflow"],
  figma: ["design-system", "developer-workflow", "api"],
  "base-ui": ["frontend-ui", "design-system", "react"],
  heroui: ["frontend-ui", "design-system", "react"],
  hono: ["framework", "backend", "edge-compute"],
  bun: ["runtime", "tooling", "backend"],
  vite: ["frontend-infra", "developer-workflow", "tooling"],
  openclaw: ["agents", "developer-workflow", "automation"],
  biome: ["tooling", "developer-workflow", "frontend-infra"],
  pnpm: ["tooling", "developer-workflow", "frontend-infra"],
  fastify: ["framework", "backend", "developer-workflow"],
  uv: ["tooling", "developer-workflow", "backend"],
  "model-context-protocol": ["agents", "protocol", "developer-workflow"],
  tanstack: ["frontend-infra", "developer-workflow", "react"],
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

  if (match) {
    return {
      month: MONTH_INDEX[match[1]!] ?? undefined,
      year: Number(match[2]),
    } satisfies MonthYearContext;
  }

  const monthOnlyMatch = value.match(
    /^(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)$/,
  );
  if (!monthOnlyMatch) {
    return null;
  }

  const month = MONTH_INDEX[monthOnlyMatch[1]!] ?? 0;
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const year = month <= currentMonth ? now.getUTCFullYear() : now.getUTCFullYear() - 1;

  return {
    month,
    year,
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
  const normalized = value.toLowerCase();

  if (!value || (value.length < 12 && !SHORT_MEANINGFUL_TITLES.has(normalized))) {
    return false;
  }

  if (NOISE_TITLES.has(normalized)) {
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

    const text = getExcerptNodeText($, sibling);
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

function getExcerptNodeText($: ReturnType<typeof load>, element: any) {
  const listItems = $(element)
    .find("li")
    .toArray()
    .map((item) => cleanText($(item).text()))
    .filter((text) => text && !isDateLike(text));

  if (listItems.length > 1) {
    return listItems.join("; ");
  }

  return cleanText($(element).text());
}

function collectWrappedHeadingExcerpt($: ReturnType<typeof load>, headingElement: any) {
  const heading = $(headingElement);
  const wrapper = heading.parent().is("span") ? heading.parent() : heading;
  const excerptParts: string[] = [];

  for (const sibling of wrapper.nextAll().toArray()) {
    const tagName = sibling.tagName?.toLowerCase?.() ?? "";
    if (/^h[1-6]$/.test(tagName) || $(sibling).find("h1, h2, h3, h4, h5, h6").length > 0) {
      break;
    }

    const text = getExcerptNodeText($, sibling);
    if (!text || isDateLike(text)) {
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

function collectContainerExcerpt($: ReturnType<typeof load>, element: any, title: string) {
  const container = $(element).closest("article, li, section, div").first();
  const parts: string[] = [];

  for (const candidate of container.find("p, li").toArray()) {
    const text = cleanText($(candidate).text());
    if (!text || text === title || isDateLike(text) || text.length < 24) {
      continue;
    }

    parts.push(text);
    if (parts.join(" ").length >= 260) {
      break;
    }
  }

  return truncateSentence(parts.join(" "));
}

function getEntryElementUrl($: ReturnType<typeof load>, element: any, sourceUrl: string) {
  const link =
    $(element).find("a[href]").first().attr("href") ??
    $(element).closest("a[href]").attr("href") ??
    $(element).closest("article, li, section, div").find("a[href]").first().attr("href");

  if (link) {
    return toAbsoluteUrl(link, sourceUrl);
  }

  const id = $(element).attr("id") ?? $(element).find("[id]").first().attr("id");
  if (id) {
    return `${sourceUrl.split("#")[0]}#${encodeURIComponent(id)}`;
  }

  return sourceUrl;
}

function normalizeChangeVerbTitle(title: string) {
  const spaced = cleanText(title).replace(
    /^(Added|Changed|Fixed|Removed|Deprecated|Updated|Improved|New)(?=[A-Z0-9])/,
    "$1 ",
  );

  return spaced
    .replace(/^(Added|Changed|Fixed|Removed|Deprecated|Updated|Improved)\s+(?=[A-Z0-9])/i, "")
    .trim();
}

function parseDateLedHeadingEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const entries: ParsedSourceEntry[] = [];
  let context: MonthYearContext | null = null;
  let activeDate: number | null = null;

  for (const element of root.find("h1, h2, h3, h4, div, span, time").toArray()) {
    const tagName = element.tagName?.toLowerCase?.() ?? "";
    const text = cleanText($(element).text());
    if (!text) {
      continue;
    }

    const monthYear = parseMonthYearContext(text);
    if (monthYear && (/^h[1-3]$/.test(tagName) || text.length <= 32)) {
      context = monthYear;
      activeDate = null;
      continue;
    }

    if (!/^h[1-6]$/.test(tagName) && text.length <= 40) {
      const publishedAt = parseDateText(text, context) ?? parseDateFromText(text, context);
      if (publishedAt) {
        activeDate = publishedAt;
        continue;
      }
    }

    if (!activeDate || !/^h[2-4]$/.test(tagName)) {
      continue;
    }

    const title = normalizeChangeVerbTitle(text);
    if (!isMeaningfulTitle(title)) {
      continue;
    }

    const excerpt =
      collectExcerpt($, element) ||
      collectWrappedHeadingExcerpt($, element) ||
      collectContainerExcerpt($, element, title) ||
      title;
    entries.push({
      title,
      url: getEntryElementUrl($, element, sourceUrl),
      excerpt,
      publishedAt: activeDate,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

const SHADCNSPACE_META_PATTERN =
  /\bVersion\s+([0-9]+(?:\.[0-9]+)+)\s*(?:(\d{1,2})\s+)?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(20\d{2})\b/i;

function normalizeShadcnspaceVersionDate(versionValue: string, dayValue: string | undefined, monthIndex: number, year: number) {
  let version = versionValue;
  let day = dayValue ? Number(dayValue) : undefined;
  const maxDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  if (day === undefined) {
    const parts = version.split(".");
    const lastPart = parts.at(-1) ?? "";
    const possibleDay = Number(lastPart.slice(-2));
    const correctedLastPart = lastPart.slice(0, -2);

    if (lastPart.length >= 3 && correctedLastPart && possibleDay >= 1 && possibleDay <= maxDay) {
      version = [...parts.slice(0, -1), correctedLastPart].join(".");
      day = possibleDay;
    }
  }

  day ??= 1;
  if (day < 1 || day > maxDay) {
    return null;
  }

  return { version, publishedAt: Date.UTC(year, monthIndex, day) };
}

function parseShadcnspaceEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const entries: ParsedSourceEntry[] = [];

  for (const heading of root.find("h2").toArray()) {
    const title = cleanText($(heading).text());
    if (!isMeaningfulTitle(title)) {
      continue;
    }

    const contentContainer = $(heading).closest("div").first();
    const timelineItem = contentContainer.parent();
    const metaText = cleanText(timelineItem.children().first().text());
    const metaMatch = metaText.match(SHADCNSPACE_META_PATTERN);

    if (!metaMatch) {
      continue;
    }

    const monthIndex = MONTH_INDEX[metaMatch[3]!.toLowerCase()];
    const year = Number(metaMatch[4]);
    if (monthIndex === undefined || Number.isNaN(year)) {
      continue;
    }

    const normalizedMeta = normalizeShadcnspaceVersionDate(metaMatch[1]!, metaMatch[2], monthIndex, year);
    if (!normalizedMeta) {
      continue;
    }

    const { version, publishedAt } = normalizedMeta;
    const versionSlug = version.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    const summary = cleanText($(heading).nextAll("p, div").first().text());
    const excerpt = truncateSentence(summary || collectContainerExcerpt($, heading, title) || title);

    entries.push({
      title: `shadcnspace ${version}: ${title}`,
      url: `${sourceUrl.split("#")[0]}#version-${encodeURIComponent(versionSlug)}`,
      excerpt,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseMonthDayWithInferredYear(text: string, now = new Date()) {
  const value = cleanText(text);
  const match = value.match(
    /^(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})$/i,
  );

  if (!match) {
    return null;
  }

  const currentYear = now.getUTCFullYear();
  const month = MONTH_INDEX[match[1]!.toLowerCase()] ?? 0;
  const day = Number(match[2]);
  const futureGraceMs = 30 * 24 * 60 * 60 * 1000;
  const currentYearDate = Date.UTC(currentYear, month, day);

  if (currentYearDate > now.getTime() + futureGraceMs) {
    return Date.UTC(currentYear - 1, month, day);
  }

  return currentYearDate;
}

function parseSynaraEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const entries: ParsedSourceEntry[] = [];

  for (const heading of root.find("h2").toArray()) {
    const title = cleanText($(heading).text());
    if (!/^Synara\s+\d+\.\d+\.\d+/i.test(title)) {
      continue;
    }

    const container = $(heading).closest("article, li, section, div").first();
    const containerText = cleanText(container.text());
    const dateMatch = containerText.match(
      /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+\d{1,2}\b/i,
    );
    const publishedAt = dateMatch ? parseMonthDayWithInferredYear(dateMatch[0]) : null;
    if (!publishedAt) {
      continue;
    }

    const id = container.attr("id") ?? $(heading).attr("id");
    const fallbackExcerpt = truncateSentence(
      containerText
        .replace(dateMatch?.[0] ?? "", "")
        .replace(/—\s*link to\s+Synara\s+[\d.]+/i, "")
        .replace(title, "")
        .trim(),
    );

    entries.push({
      title,
      url: id ? `${sourceUrl.split("#")[0]}#${encodeURIComponent(id)}` : sourceUrl,
      excerpt: collectContainerExcerpt($, heading, title) || fallbackExcerpt || title,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseShadcnblocksEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const astroEntries = parseShadcnblocksAstroEntries($, sourceUrl);
  if (astroEntries.length > 0) {
    return astroEntries.slice(0, 12);
  }

  const root = $("main").length > 0 ? $("main").first() : $("body");
  const entries: ParsedSourceEntry[] = [];

  for (const link of root.find('a[href^="/changelog/"]').toArray()) {
    const href = $(link).attr("href");
    const title = cleanText($(link).text());
    if (!href || /\/changelog\/page\//i.test(href) || !isMeaningfulTitle(title)) {
      continue;
    }

    const container = $(link).closest("article, li, section, div").first();
    const containerText = cleanText(container.text());
    const dateMatch = containerText.match(
      /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+\d{1,2},\s+\d{4}\b/i,
    );
    const dateText = dateMatch?.[0];
    const publishedAt = dateText ? parseDateText(dateText, null) : null;
    if (!publishedAt || !dateText) {
      continue;
    }

    const paragraphExcerpt = truncateSentence(cleanText(container.find("p").first().text()));
    const fallbackExcerpt = truncateSentence(
      containerText
        .replace(/^released/i, "")
        .replace(title, "")
        .replace(dateText, "")
        .trim(),
    );

    entries.push({
      title,
      url: toAbsoluteUrl(href, sourceUrl),
      excerpt: paragraphExcerpt || fallbackExcerpt || title,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries).sort((left, right) => right.publishedAt - left.publishedAt);
}

function decodeAstroSerializedValue(value: unknown): any {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        decodeAstroSerializedValue(nestedValue),
      ]),
    );
  }

  if (!Array.isArray(value) || value.length < 2 || typeof value[0] !== "number") {
    return value;
  }

  const [type, payload] = value as [number, unknown];

  if (type === 1 && Array.isArray(payload)) {
    return payload.map(decodeAstroSerializedValue);
  }

  if (type === 0) {
    return decodeAstroSerializedValue(payload);
  }

  return payload;
}

function parseShadcnblocksAstroEntries($: ReturnType<typeof load>, sourceUrl: string) {
  const props = $('astro-island[component-export="Changelog"]').first().attr("props");
  if (!props) {
    return [];
  }

  let decodedProps: any;

  try {
    decodedProps = decodeAstroSerializedValue(JSON.parse(props));
  } catch {
    return [];
  }

  const entries: ParsedSourceEntry[] = [];
  const rawEntries = Array.isArray(decodedProps?.entries) ? decodedProps.entries : [];

  for (const entry of rawEntries) {
    const id = cleanText(entry?.id);
    const title = cleanText(entry?.data?.title);
    const dateText = cleanText(entry?.data?.date);
    const bodyText = cleanText(entry?.body);
    const renderedText = cleanText(load(entry?.rendered?.html ?? "").text());
    const parsedDate = dateText ? Date.parse(dateText) : NaN;

    if (!id || !isMeaningfulTitle(title) || Number.isNaN(parsedDate)) {
      continue;
    }

    entries.push({
      title,
      url: toAbsoluteUrl(`/changelog/${id}`, sourceUrl),
      excerpt: truncateSentence(renderedText || bodyText || title),
      publishedAt: Date.UTC(
        new Date(parsedDate).getUTCFullYear(),
        new Date(parsedDate).getUTCMonth(),
        new Date(parsedDate).getUTCDate(),
      ),
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries).sort((left, right) => right.publishedAt - left.publishedAt);
}

function parseWarpEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const entries: ParsedSourceEntry[] = [];

  for (const heading of root.find("h2, h3, h4").toArray()) {
    const rawTitle = cleanText($(heading).text()).replace(/^hashtag/i, "");
    const match = rawTitle.match(/\b(20\d{2})\.(\d{2})\.(\d{2})\b(?:\s*\((v[^)]+)\))?/i);
    if (!match) {
      continue;
    }

    const publishedAt = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const releaseDate = `${match[1]}.${match[2]}.${match[3]}`;
    const version = match[4];
    const title = `Warp ${releaseDate}${version ? ` (${version})` : ""}`;
    const id = $(heading).attr("id") ?? rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    entries.push({
      title,
      url: `${sourceUrl.split("#")[0]}#${encodeURIComponent(id)}`,
      excerpt: collectExcerpt($, heading) || title,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseZedStableEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const text = cleanText(root.text());
  const matches = Array.from(text.matchAll(/(0\.\d+\.\d+)([A-Z][a-z]{2} \d{1,2}, 20\d{2})/g));
  const entries: ParsedSourceEntry[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]!;
    const next = matches[index + 1];
    const publishedAt = parseDateText(match[2]!, null);
    if (!publishedAt || match.index === undefined) {
      continue;
    }

    const bodyStart = match.index + match[0].length;
    const bodyEnd = next?.index ?? text.length;
    const excerpt = truncateSentence(
      text
        .slice(bodyStart, bodyEnd)
        .replace(/\b(?:macOS|Windows|Linux)Loading…?/g, " ")
        .replace(/\bLoading…?/g, " ")
        .replace(/\s+/g, " "),
    );

    entries.push({
      title: `Zed ${match[1]}`,
      url: `${sourceUrl.split("#")[0]}#${encodeURIComponent(match[1]!)}`,
      excerpt: excerpt || `Zed ${match[1]} stable release notes.`,
      publishedAt,
      parseConfidence: "medium",
    });
  }

  return dedupeEntries(entries);
}

function decodeJavaScriptStringLiteral(value: string) {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
}

function parseAntigravityEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const entries: ParsedSourceEntry[] = [];

  for (const row of $("[data-section-row]").toArray()) {
    const versionRoot = $(row).find(".version").first();
    const versionLink = versionRoot.find("a.version-link[href]").first();
    const version = cleanText(versionLink.text()).match(/\b\d+\.\d+\.\d+\b/)?.[0];
    const publishedAt = parseDateFromText(cleanText(versionRoot.text()).replace(version ?? "", " "));

    if (!version || !publishedAt) {
      continue;
    }

    const description = cleanText($(row).find(".description h3").first().text());
    const changes = cleanText($(row).find(".changes").first().text());
    const itemText = $(row)
      .find(".expandable-items li")
      .toArray()
      .map((item) => cleanText($(item).text()))
      .filter(Boolean)
      .join(" ");
    const excerpt = truncateSentence([changes, itemText, description].filter(Boolean).join(" "));

    entries.push({
      title: `Google Antigravity ${version}`,
      url: toAbsoluteUrl(versionLink.attr("href"), sourceUrl),
      excerpt: excerpt || `${description || "Google Antigravity"} release notes.`,
      publishedAt,
      parseConfidence: "high",
    });
  }

  if (entries.length > 0) {
    return dedupeEntries(entries);
  }

  const sectionPattern =
    /\{version:"((?:\\.|[^"\\])*)",description:"((?:\\.|[^"\\])*)",accordion:\{changes:"((?:\\.|[^"\\])*)"/g;

  for (const match of html.matchAll(sectionPattern)) {
    const versionText = decodeJavaScriptStringLiteral(match[1] ?? "");
    const description = decodeJavaScriptStringLiteral(match[2] ?? "");
    const changesHtml = decodeJavaScriptStringLiteral(match[3] ?? "");
    const versionMatch = versionText.match(/(\d+\.\d+\.\d+)\s*<br>\s*([A-Z][a-z]{2}\s+\d{1,2},\s+20\d{2})/i);

    if (!versionMatch) {
      continue;
    }

    const publishedAt = parseDateText(versionMatch[2]!, null);
    if (!publishedAt) {
      continue;
    }

    const version = versionMatch[1]!;
    const excerpt = truncateSentence(cleanText(load(changesHtml).text()) || description);

    entries.push({
      title: `Google Antigravity ${version}`,
      url: `${sourceUrl.split("#")[0]}#${encodeURIComponent(version)}`,
      excerpt: excerpt || `${description || "Google Antigravity"} release notes.`,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseDiaEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const entries: ParsedSourceEntry[] = [];

  for (const time of $("time[datetime]").toArray()) {
    const publishedAt = parseDateText($(time).attr("datetime") ?? cleanText($(time).text()), null);
    if (!publishedAt) {
      continue;
    }

    const article = $(time).closest("article").first();
    const container = article.length > 0 ? article : $(time).closest("li, section, div").first();
    const titleLink = container.find("h1 a[href], h2 a[href], h3 a[href], h4 a[href], a[href]").first();
    const title = cleanText(titleLink.text() || container.find("h1, h2, h3, h4").first().text());
    if (!isMeaningfulTitle(title)) {
      continue;
    }

    const excerpt =
      truncateSentence(
        container
          .find("p")
          .toArray()
          .map((element) => cleanText($(element).text()))
          .filter((value) => value && value !== title)
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

function parseBraveEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $("main").length > 0 ? $("main").first() : $("body");
  const entries: ParsedSourceEntry[] = [];

  for (const heading of root.find("h1, h2, h3, h4").toArray()) {
    const rawTitle = cleanText($(heading).text());
    const match = rawTitle.match(/Release Notes\s+v?([0-9.]+)\s*\(([^)]+)\)/i);
    if (!match) {
      continue;
    }

    const publishedAt = parseDateFromText(match[2]!);
    if (!publishedAt) {
      continue;
    }

    const id = $(heading).attr("id");
    entries.push({
      title: `Brave ${match[1]} release notes`,
      url: id ? `${sourceUrl.split("#")[0]}#${encodeURIComponent(id)}` : sourceUrl,
      excerpt: collectExcerpt($, heading) || rawTitle,
      publishedAt,
      parseConfidence: "high",
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

function isWarpParserKey(parserKey: string) {
  return parserKey === "warp:docs_page" || parserKey === "warp:changelog_page";
}

function parseMarkdownEntries(sourceUrl: string, markdown: string, parserKey: string) {
  const lines = markdown.split(/\r?\n/);

  if (parserKey === "replit-agent:changelog_page") {
    return parseReplitUpdateEntries(sourceUrl, lines);
  }

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
    return parseExaMarkdownEntries(sourceUrl, markdown);
  }

  if (parserKey === "langchain:changelog_page") {
    return parseLangChainMarkdownEntries(sourceUrl, markdown);
  }

  if (parserKey === "openai:docs_page") {
    return parseOpenAIMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "grok-build:changelog_page") {
    return parseGrokBuildMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "firecrawl:changelog_page") {
    return parseFirecrawlMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "clerk:changelog_page") {
    return parseClerkMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "railway:changelog_page") {
    return parseRailwayMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "windsurf:changelog_page") {
    return parseDevinDesktopMarkdownEntries(sourceUrl, markdown);
  }

  if (parserKey === "xai:docs_page") {
    return parseMonthGroupedMarkdownEntries(
      sliceDelimitedMarkdownSection(lines, "===/developers/release-notes==="),
      "https://docs.x.ai/developers/release-notes",
    );
  }

  if (isWarpParserKey(parserKey)) {
    return parseWarpMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "neon:changelog_page") {
    return parseNeonMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "tabnine:docs_page") {
    return parseTabnineMarkdownEntries(sourceUrl, lines);
  }

  if (parserKey === "amazon-q-developer:docs_page") {
    return parseAmazonQDeveloperMarkdownEntries(sourceUrl, lines);
  }

  return parseGenericMarkdownEntries(sourceUrl, lines, parserKey);
}

function parseReplitUpdateEntries(sourceUrl: string, lines: string[]) {
  const entries: ParsedSourceEntry[] = [];
  const pageDate = lines
    .map((line) => stripMarkdown(line.replace(/^#\s+/, "")))
    .map((line) => parseDateFromText(line))
    .find((publishedAt): publishedAt is number => Boolean(publishedAt));

  if (!pageDate) {
    return entries;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = lines[index]?.trim().match(/^###\s+(.+)$/);
    if (!headingMatch) {
      continue;
    }

    const title = stripMarkdown(headingMatch[1]!);
    if (!isMeaningfulTitle(title)) {
      continue;
    }

    entries.push({
      title,
      url: `${sourceUrl.split("#")[0]}#${slugifyHeading(title)}`,
      excerpt: collectMarkdownExcerpt(lines, index + 1) || title,
      publishedAt: pageDate,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseMdxAttributes(value: string) {
  const attributes = new Map<string, string>();
  const attributePattern = /([A-Za-z][A-Za-z0-9_-]*)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(value)) !== null) {
    attributes.set(match[1]!, match[2]!);
  }

  return attributes;
}

function stripMdxBlocks(value: string) {
  return value
    .replace(/<Accordion\b[\s\S]*?<\/Accordion>/gi, " ")
    .replace(/<Release\b[\s\S]*?\/>/gi, " ")
    .replace(/<img\b[\s\S]*?\/>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function parseDevinDesktopMarkdownEntries(sourceUrl: string, markdown: string) {
  const entries: ParsedSourceEntry[] = [];
  const htmlSourceUrl = sourceUrl.replace(/\.md$/i, "");
  const updatePattern = /<Update\b([^>]*)>([\s\S]*?)<\/Update>/g;
  let match: RegExpExecArray | null;

  while ((match = updatePattern.exec(markdown)) !== null) {
    const attributes = parseMdxAttributes(match[1]!);
    const label = cleanText(attributes.get("label"));
    const description = cleanText(attributes.get("description"));
    const publishedAt = parseDateFromText(description);
    if (!label || !publishedAt) {
      continue;
    }

    const body = stripMdxBlocks(match[2]!);
    const lines = body.split(/\r?\n/);
    const excerpt = collectMarkdownExcerpt(lines, 0) || `Devin Desktop ${label}`;

    entries.push({
      title: `Devin Desktop ${label}`,
      url: `${htmlSourceUrl}#${slugifyHeading(label)}`,
      excerpt,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
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

function getMdxUpdateBlocks(markdown: string) {
  return Array.from(markdown.matchAll(/<Update\b([\s\S]*?)<\/Update>/g), (match) => match[1] ?? "");
}

function getMdxUpdateBody(block: string) {
  const lines = block.split(/\r?\n/);
  const firstLine = lines[0]?.trim() ?? "";
  const openingEnd = firstLine.endsWith(">")
    ? 0
    : lines.findIndex((line) => line.trim() === ">");
  return lines.slice(Math.max(0, openingEnd + 1));
}

function parseMdxUpdateDate(label: string, rssTitle: string) {
  const explicitDate = parseDateFromText(rssTitle) ?? parseDateFromText(label);
  if (explicitDate) {
    return explicitDate;
  }

  const context = parseMonthYearContext(label);
  if (!context || context.month === undefined) {
    return null;
  }

  return Date.UTC(context.year, context.month + 1, 0);
}

function parseExaMarkdownEntries(sourceUrl: string, markdown: string) {
  const entries: ParsedSourceEntry[] = [];

  for (const block of getMdxUpdateBlocks(markdown)) {
    const label = block.match(/\blabel="([^"]+)"/)?.[1] ?? "";
    const rssTitle = block.match(/\btitle:\s*"([^"]+)"/)?.[1] ?? label;
    const rssDescription = block.match(/\bdescription:\s*"([^"]+)"/)?.[1] ?? "";
    const publishedAt = parseMdxUpdateDate(label, rssTitle);

    if (!publishedAt || !rssTitle) {
      continue;
    }

    const body = getMdxUpdateBody(block);
    const firstHeading = body.find((line) => /^##\s+/.test(line.trim()));
    const headingTitle = stripMarkdown(firstHeading?.replace(/^\s*##\s+/, "") ?? "");
    const title = /^\w+\s+20\d{2}$/.test(rssTitle)
      ? `Exa ${rssTitle} update`
      : rssTitle;

    entries.push({
      title,
      url: `${sourceUrl.replace(/\.md$/i, "").split("#")[0]}#${slugifyHeading(headingTitle || rssTitle)}`,
      excerpt: truncateSentence(rssDescription) || collectMarkdownExcerpt(body, 0) || title,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseLangChainMarkdownEntries(sourceUrl: string, markdown: string) {
  const entries: ParsedSourceEntry[] = [];

  for (const block of getMdxUpdateBlocks(markdown)) {
    const label = block.match(/\blabel="([^"]+)"/)?.[1] ?? "";
    const rssTitle = block.match(/\btitle:\s*"([^"]+)"/)?.[1] ?? "";
    const publishedAt = parseMdxUpdateDate(label, rssTitle);
    if (!publishedAt || !isMeaningfulTitle(rssTitle)) {
      continue;
    }

    const body = getMdxUpdateBody(block);
    entries.push({
      title: rssTitle,
      url: `${sourceUrl.split("#")[0]}#${slugifyHeading(rssTitle)}`,
      excerpt: collectMarkdownExcerpt(body, 0) || rssTitle,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function isMarkdownEntryMetadata(value: string) {
  return /^(?:feature|update|fix|fixed|improvement|deprecation|announcement|general availability|preview)(?:\s*[·|].*)?$/i.test(
    value,
  );
}

function parseOpenAIMarkdownEntries(sourceUrl: string, lines: string[]) {
  const entries: ParsedSourceEntry[] = [];
  let context: MonthYearContext | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    const monthHeading = line.match(/^##\s+(.+)$/);
    if (monthHeading) {
      context = parseMonthYearContext(monthHeading[1]!);
      continue;
    }

    const dateHeading = line.match(/^###\s+(.+)$/);
    if (!dateHeading || !context) {
      continue;
    }

    const publishedAt = parseDateText(stripMarkdown(dateHeading[1]!), context);
    if (!publishedAt) {
      continue;
    }

    const sectionLines: string[] = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const candidate = lines[cursor]?.trim() ?? "";
      if (/^#{2,3}\s+/.test(candidate)) {
        break;
      }

      const text = stripMarkdown(candidate.replace(/^[-*]\s+/, ""));
      if (text && !isMarkdownEntryMetadata(text)) {
        sectionLines.push(text);
      }
    }

    const title = sectionLines.find(isMeaningfulTitle);
    if (!title) {
      continue;
    }

    entries.push({
      title: truncateSentence(title, 160) || title,
      url: `${sourceUrl.split("#")[0]}#${new Date(publishedAt).toISOString().slice(0, 10)}`,
      excerpt: truncateSentence(sectionLines.join(" ")) || title,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseGrokBuildMarkdownEntries(sourceUrl: string, lines: string[]) {
  const sourceHost = new URL(sourceUrl).hostname;
  if (
    sourceHost === "r.jina.ai" &&
    !lines.some((line) => /^URL Source:\s*https:\/\/x\.ai\/build\/changelog\/?\s*$/i.test(line.trim()))
  ) {
    return [];
  }

  const entries: ParsedSourceEntry[] = [];
  let activeDate: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (/^(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},\s+20\d{2}\b/i.test(line)) {
      activeDate = parseDateFromText(line);
      continue;
    }

    const heading = line.match(/^##\s+Grok Build\s+(\d+\.\d+\.\d+)$/i);
    if (!heading || !activeDate) {
      continue;
    }

    const version = heading[1]!;
    entries.push({
      title: `Grok Build ${version}`,
      url: `https://x.ai/build/changelog#${encodeURIComponent(version)}`,
      excerpt: collectMarkdownExcerpt(lines, index + 1) || `Grok Build ${version} release notes.`,
      publishedAt: activeDate,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
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

function parseClerkMarkdownEntries(sourceUrl: string, lines: string[]) {
  const entries: ParsedSourceEntry[] = [];
  let activeTitle: string | null = null;
  let activeUrl = sourceUrl.replace(/\.md$/i, "");
  let activeDate: number | null = null;
  let activeStartIndex = -1;

  const flush = () => {
    if (!activeTitle || !activeDate) {
      return;
    }

    entries.push({
      title: activeTitle,
      url: cleanMarkdownUrl(activeUrl, sourceUrl),
      excerpt: collectClerkMarkdownExcerpt(lines, activeStartIndex + 1) || activeTitle,
      publishedAt: activeDate,
      parseConfidence: "high",
    });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index]?.trim() ?? "";
    const headingMatch = trimmed.match(/^#\s+(.+)$/);

    if (headingMatch) {
      const title = stripMarkdown(headingMatch[1]!);
      if (/^clerk changelog$/i.test(title)) {
        continue;
      }

      flush();
      activeTitle = isMeaningfulTitle(title) ? title : null;
      activeUrl = sourceUrl.replace(/\.md$/i, "");
      activeDate = null;
      activeStartIndex = index;
      continue;
    }

    if (!activeTitle) {
      continue;
    }

    const urlMatch = trimmed.match(/^URL:\s*(\S+)$/i);
    if (urlMatch) {
      activeUrl = urlMatch[1]!;
      continue;
    }

    const dateMatch = trimmed.match(/^Date:\s*(\d{4}-\d{2}-\d{2})$/i);
    if (dateMatch) {
      activeDate = parseDateText(dateMatch[1]!, null);
    }
  }

  flush();
  return dedupeEntries(entries);
}

function collectClerkMarkdownExcerpt(lines: string[], startIndex: number) {
  const parts: string[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (!line) {
      continue;
    }

    if (/^#\s+/.test(line) || /^---+$/.test(line)) {
      break;
    }

    if (/^(URL|Date|Category):/i.test(line)) {
      continue;
    }

    const descriptionMatch = line.match(/^Description:\s*(.*)$/i);
    const text = stripMarkdown(descriptionMatch ? descriptionMatch[1]! : line.replace(/^[-*]\s+/, ""));
    if (text.length >= 24 && !isDateLike(text)) {
      parts.push(text);
    }

    if (parts.join(" ").length >= 260) {
      break;
    }
  }

  return truncateSentence(parts.join(" "));
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

function slugifyHeading(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sliceDelimitedMarkdownSection(lines: string[], marker: string) {
  const startIndex = lines.findIndex((line) => line.trim() === marker);
  if (startIndex < 0) {
    return lines;
  }

  const nextSectionIndex = lines.findIndex((line, index) => {
    return index > startIndex && /^===[^=]+===$/.test(line.trim());
  });

  return lines.slice(startIndex + 1, nextSectionIndex > startIndex ? nextSectionIndex : undefined);
}

function parseMonthGroupedMarkdownEntries(lines: string[], detailBaseUrl: string) {
  const entries: ParsedSourceEntry[] = [];
  let activeDate: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    const monthHeading = line.match(/^#\s+(.+)$/);
    if (monthHeading) {
      const context = parseMonthYearContext(monthHeading[1]!);
      activeDate = context ? Date.UTC(context.year, context.month ?? 0, 1) : null;
      continue;
    }

    const entryHeading = line.match(/^#{2,4}\s+(.+)$/);
    if (!entryHeading || !activeDate) {
      continue;
    }

    const title = stripMarkdown(entryHeading[1]!);
    if (!isMeaningfulTitle(title)) {
      continue;
    }

    entries.push({
      title,
      url: `${detailBaseUrl}#${slugifyHeading(title)}`,
      excerpt: collectMarkdownExcerpt(lines, index + 1) || title,
      publishedAt: activeDate,
      parseConfidence: "medium",
    });
  }

  return dedupeEntries(entries);
}

function parseWarpMarkdownEntries(_sourceUrl: string, lines: string[]) {
  const entries: ParsedSourceEntry[] = [];
  let inChangelog = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (/^#\s+Changelog$/i.test(line)) {
      inChangelog = true;
      continue;
    }

    if (inChangelog && /^#\s+/.test(line)) {
      break;
    }

    if (!inChangelog) {
      continue;
    }

    const heading = line.match(/^#{2,4}\s+(.+)$/);
    if (!heading) {
      continue;
    }

    const rawTitle = stripMarkdown(heading[1]!);
    const match = rawTitle.match(/\b(20\d{2})\.(\d{2})\.(\d{2})\b(?:\s*\((v[^)]+)\))?/i);
    if (!match) {
      continue;
    }

    const publishedAt = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const releaseDate = `${match[1]}.${match[2]}.${match[3]}`;
    const version = match[4];
    const title = `Warp ${releaseDate}${version ? ` (${version})` : ""}`;
    const anchor = `id-${releaseDate}${version ? `-${version}` : ""}`
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-|-$/g, "");

    entries.push({
      title,
      url: `https://docs.warp.dev/changelog#${encodeURIComponent(anchor)}`,
      excerpt: collectMarkdownExcerpt(lines, index + 1) || title,
      publishedAt,
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

function parseTabnineMarkdownEntries(sourceUrl: string, lines: string[]) {
  const entries: ParsedSourceEntry[] = [];
  const detailBaseUrl = sourceUrl.replace(/\.md$/i, "");

  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = lines[index]?.trim().match(/^#{2,4}\s+(v\d+\.\d+(?:\.\d+)?(?:[-+.][a-z0-9]+)*)/i);
    if (!headingMatch) {
      continue;
    }

    const version = headingMatch[1]!;
    const dateLine = lines.slice(index + 1, index + 6).map(stripMarkdown).find((line) => parseDateFromText(line));
    const publishedAt = dateLine ? parseDateFromText(dateLine) : null;
    if (!publishedAt) {
      continue;
    }

    entries.push({
      title: `Tabnine ${version}`,
      url: `${detailBaseUrl}#${version.toLowerCase()}`,
      excerpt: collectMarkdownExcerpt(lines, index + 1) || `Tabnine ${version}`,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function splitMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return [];
  }

  return trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isMarkdownTableSeparator(cells: string[]) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")));
}

function firstMarkdownLinkHref(value: string) {
  return value.match(/\[[^\]]+\]\(([^)]+)\)/)?.[1];
}

function parseAmazonQDeveloperMarkdownEntries(sourceUrl: string, lines: string[]) {
  const entries: ParsedSourceEntry[] = [];

  for (const line of lines) {
    const cells = splitMarkdownTableRow(line);
    if (cells.length < 3 || isMarkdownTableSeparator(cells)) {
      continue;
    }

    const [rawTitle, rawExcerpt, rawDate] = cells;
    const title = stripMarkdown(rawTitle);
    const excerpt = truncateSentence(stripMarkdown(rawExcerpt));
    const publishedAt = parseDateFromText(stripMarkdown(rawDate));

    if (/^change$/i.test(title) || !isMeaningfulTitle(title) || !excerpt || !publishedAt) {
      continue;
    }

    entries.push({
      title,
      url: toAbsoluteUrl(firstMarkdownLinkHref(rawTitle), sourceUrl),
      excerpt,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function cleanMistralChangelogText(value: string) {
  return cleanText(value)
    .replace(/\b(MODEL RELEASED|API UPDATED|OTHER)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMistralChangelogEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const entries: ParsedSourceEntry[] = [];

  for (const element of $('[data-changelog-entry="true"]').toArray()) {
    const id = $(element).attr("id") ?? "";
    const dateMatch = id.match(/^date-(20\d{2})-(\d{2})-(\d{2})$/);
    if (!dateMatch) {
      continue;
    }

    const publishedAt = Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
    const titleText = cleanMistralChangelogText(
      $(element).find(".changelog-content li, .changelog-content p").first().text(),
    );
    if (!isMeaningfulTitle(titleText)) {
      continue;
    }

    const excerpt =
      cleanMistralChangelogText($(element).find(".changelog-content").first().text()) ||
      titleText;

    entries.push({
      title: truncateSentence(titleText, 160),
      url: `${sourceUrl.split("#")[0]}#${encodeURIComponent(id)}`,
      excerpt: truncateSentence(excerpt),
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseFigmaRestApiChangelogEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const root = $(".theme-doc-markdown").length > 0 ? $(".theme-doc-markdown").first() : $("article").first();
  const entries: ParsedSourceEntry[] = [];

  for (const heading of root.find("h2").toArray()) {
    const dateText = cleanText($(heading).text());
    const publishedAt = parseDateFromText(dateText);
    if (!publishedAt) {
      continue;
    }

    const parts: string[] = [];
    for (const sibling of $(heading).nextUntil("h2").toArray()) {
      const candidates = ["p", "li"].includes(sibling.tagName?.toLowerCase?.() ?? "")
        ? [sibling]
        : $(sibling).find("p, li").toArray();

      for (const element of candidates) {
        const text = cleanText($(element).text());
        if (!text || text.length < 24 || isDateLike(text)) {
          continue;
        }

        parts.push(text);
        if (parts.join(" ").length >= 280) {
          break;
        }
      }

      if (parts.join(" ").length >= 280) {
        break;
      }
    }

    const title = parts[0] ?? dateText;
    if (!isMeaningfulTitle(title)) {
      continue;
    }

    const id = $(heading).attr("id");
    entries.push({
      title: truncateSentence(title, 160),
      url: id ? `${sourceUrl.split("#")[0]}#${encodeURIComponent(id)}` : sourceUrl,
      excerpt: truncateSentence(parts.join(" ") || title),
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries);
}

function parseConvexShipEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const entries: ParsedSourceEntry[] = [];

  for (const link of $('a[href^="/changelog/"], a[href*="ship.convex.dev/changelog/"]').toArray()) {
    const href = $(link).attr("href");
    if (!href || /\/requests\//i.test(href)) {
      continue;
    }

    const text = cleanText($(link).text());
    const dateMatch = text.match(
      /(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+\d{1,2},\s+\d{4}/i,
    );
    const publishedAt = dateMatch ? parseDateFromText(dateMatch[0]!) : parseDateFromText(text);
    if (!publishedAt) {
      continue;
    }

    const heading = $(link).find("h1, h2, h3, h4").first();
    let title = cleanText(heading.text()).replace(/^#\s*\d+\s*/, "").trim();
    if (!title) {
      title = text.replace(/\b(?:Release|Improvement)\b/i, "").replace(/\b[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\b/, "").trim();
    }

    if (!isMeaningfulTitle(title)) {
      continue;
    }

    const excerpt = cleanText($(link).find("p").first().text()) || title;
    entries.push({
      title,
      url: toAbsoluteUrl(href, sourceUrl),
      excerpt: truncateSentence(excerpt),
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries).sort((a, b) => b.publishedAt - a.publishedAt);
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

function parseAmazonQDeveloperDocHistoryEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const entries: ParsedSourceEntry[] = [];

  for (const row of $("table tr").toArray()) {
    const cells = $(row).find("td, th").toArray();
    if (cells.length < 3) {
      continue;
    }

    const title = cleanText($(cells[0]).text());
    const excerpt = cleanText($(cells[1]).text());
    const publishedAt = parseDateFromText($(cells[2]).text());

    if (!isMeaningfulTitle(title) || !excerpt || !publishedAt) {
      continue;
    }

    entries.push({
      title,
      url: sourceUrl,
      excerpt,
      publishedAt,
      parseConfidence: "high",
    });
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

function parseSupabaseEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const entries: ParsedSourceEntry[] = [];

  for (const link of $('a[href^="https://github.com/orgs/supabase/discussions/"]').toArray()) {
    const title = cleanText($(link).find("h3").first().text()) || cleanText($(link).text());
    const dateText = cleanText($(link).parent().find("p").first().text());
    const publishedAt = parseDateFromText(dateText);

    if (!isMeaningfulTitle(title) || !publishedAt) {
      continue;
    }

    const container = $(link).closest("div").parent().parent().parent();
    const articleText = truncateSentence(cleanText(container.find("article").first().text()));

    entries.push({
      title,
      url: toAbsoluteUrl($(link).attr("href"), sourceUrl),
      excerpt: articleText || title,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries).sort((left, right) => right.publishedAt - left.publishedAt);
}

function parseVercelEntries(sourceUrl: string, html: string) {
  const $ = load(html);
  const entries: ParsedSourceEntry[] = [];

  for (const link of $('a[href^="/changelog/"]').toArray()) {
    const title = cleanText($(link).text());
    const card = $(link).closest("article, li, section, div");
    const time = card.find("time").first();
    const publishedAt = parseDateFromText(time.attr("datetime") ?? cleanText(time.text()));

    if (!isMeaningfulTitle(title) || !publishedAt) {
      continue;
    }

    const description =
      truncateSentence(cleanText(card.find('[id="changelog-description"]').first().text())) ||
      truncateSentence(cleanText(card.find("p").first().text())) ||
      title;

    entries.push({
      title,
      url: toAbsoluteUrl($(link).attr("href"), sourceUrl),
      excerpt: description,
      publishedAt,
      parseConfidence: "high",
    });
  }

  return dedupeEntries(entries).sort((left, right) => right.publishedAt - left.publishedAt);
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
        title: truncateSentence(title, 160) || title,
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

export function discoverAntigravityBundleUrl(html: string, sourceUrl: string) {
  const $ = load(html);
  const script = $('script[type="module"][src*="main-"], script[src*="main-"]').first().attr("src");
  return script ? toAbsoluteUrl(script, sourceUrl) : null;
}

export function discoverWarpChangelogYearUrl(html: string, sourceUrl: string, now = new Date()) {
  const $ = load(html);
  const currentYear = now.getUTCFullYear();
  const candidates = new Map<number, string>();

  for (const anchor of $('a[href*="/changelog/"]').toArray()) {
    const href = $(anchor).attr("href");
    if (!href) {
      continue;
    }

    const url = toAbsoluteUrl(href, sourceUrl);
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      continue;
    }

    const match = parsed.pathname.match(/\/changelog\/(20\d{2})(?:\/|\.md)?$/i);
    if (!match) {
      continue;
    }

    const year = Number(match[1]);
    if (Number.isFinite(year)) {
      candidates.set(year, url);
    }
  }

  const candidateYears = Array.from(candidates.keys()).filter((year) => year <= currentYear);
  const preferredYear = candidates.has(currentYear) ? currentYear : Math.max(...candidateYears);

  return Number.isFinite(preferredYear) ? (candidates.get(preferredYear) ?? null) : null;
}

export function parseHtmlEntries({ parserKey, sourceUrl, html }: HtmlParseInput) {
  if (isLikelyMarkdownDocument(html) || /\.(?:md|txt)$/i.test(new URL(sourceUrl).pathname)) {
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

  if (parserKey === "amazon-q-developer:docs_page") {
    const entries = parseAmazonQDeveloperDocHistoryEntries(sourceUrl, html);
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

  if (parserKey === "convex:changelog_page") {
    const entries = parseConvexShipEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "mistral-ai:docs_page") {
    const entries = parseMistralChangelogEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "figma:docs_page") {
    const entries = parseFigmaRestApiChangelogEntries(sourceUrl, html);
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

  if (parserKey === "supabase:changelog_page") {
    const entries = parseSupabaseEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "vercel:changelog_page") {
    const entries = parseVercelEntries(sourceUrl, html);
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

  if (parserKey === "shadcnspace:changelog_page") {
    const entries = parseShadcnspaceEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "dp-code:changelog_page") {
    const entries = parseSynaraEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "shadcnblocks:changelog_page") {
    const entries = parseShadcnblocksEntries(sourceUrl, html);
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

  if (
    parserKey === "xai:docs_page" ||
    parserKey === "grok-build:changelog_page" ||
    parserKey === "groq:docs_page" ||
    parserKey === "augment-code:changelog_page"
  ) {
    const entries = parseDateLedHeadingEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (isWarpParserKey(parserKey)) {
    const entries = parseWarpEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "zed:changelog_page") {
    const entries = parseZedStableEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "google-antigravity:changelog_page") {
    const entries = parseAntigravityEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "dia:changelog_page") {
    const entries = parseDiaEntries(sourceUrl, html);
    if (entries.length > 0) {
      return entries.slice(0, 12);
    }
  }

  if (parserKey === "brave:changelog_page") {
    const entries = parseBraveEntries(sourceUrl, html);
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

function slugify(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeVendorSpecificTitle(vendorSlug: string, title: string, excerpt: string) {
  if (vendorSlug === "factory-droid" && /^cli updates$/i.test(title)) {
    const version = excerpt.match(/\bv\d+\.\d+(?:\.\d+)?(?:[-+.\w]*)?\b/i)?.[0];
    if (version) {
      return `Factory Droid ${version}`;
    }
  }

  return title;
}

export function normalizeParsedEntry({
  vendorSlug,
  vendorName,
  sourceName,
  sourceType,
  entry,
}: NormalizeInput): NormalizedParsedEntry {
  const title = normalizeVendorSpecificTitle(vendorSlug, entry.title, entry.excerpt);
  const categories = classifyCategories(title, sourceType);
  const combinedText = `${title} ${entry.excerpt}`.trim();
  const affectedStack = classifyAffectedStack(vendorSlug, combinedText);
  const whoShouldCare = classifyAudience(categories, affectedStack);
  const summary = truncateSentence(entry.excerpt || title, 240) || title;

  const signal = deriveSignalMetadata({
    id: `${vendorSlug}:${entry.url}`,
    slug: slugify(`${vendorSlug}-${title}`),
    vendorSlug,
    vendorName,
    title,
    summary,
    whatChanged: summary,
    whyItMatters: "",
    whoShouldCare,
    affectedStack,
    categories,
    publishedAt: new Date(entry.publishedAt).toISOString(),
    sourceUrl: entry.url,
    sourceType,
    githubUrl: entry.githubUrl,
  });

  return {
    slug: slugify(`${vendorSlug}-${new Date(entry.publishedAt).toISOString().slice(0, 10)}-${title}`),
    title: signal.displayTitle,
    rawTitle: title,
    summary,
    whatChanged: summary,
    whyItMatters: signal.whyItMatters,
    whoShouldCare,
    affectedStack,
    categories,
    topicTags: signal.topicTags,
    releaseClass: signal.releaseClass,
    impactConfidence: signal.impactConfidence,
    signalReasons: signal.signalReasons,
    scoreVersion: signal.scoreVersion,
    importanceScore: signal.signalScore,
    importanceBand: signal.importanceBand,
    parseConfidence: entry.parseConfidence ?? (entry.url !== "" ? "high" : "medium"),
    githubUrl: entry.githubUrl,
  };
}
