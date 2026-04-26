import {
  deriveSignalMetadata,
  IMPACT_CONFIDENCES,
  RELEASE_CLASSES,
  SCORE_VERSION,
  type ImpactConfidence,
  type ReleaseClass,
} from "@/lib/classification/signal";
import type { ImportanceBand, MockEvent, SourceType, VendorRecord } from "@/lib/mock-data";

export const DEFAULT_PUBLIC_BASE_URL = "https://versionwatch.dev";
export const PUBLIC_API_SCHEMA_VERSION = "2026-04-26";
export const DEFAULT_UPDATE_LIMIT = 25;
export const MAX_UPDATE_LIMIT = 100;
export const MAX_FUTURE_SKEW_MS = 60 * 60 * 1000;
export const PUBLIC_AGENT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60, s-maxage=300",
};

export const PUBLIC_SEVERITIES = ["critical", "high", "medium", "low"] as const satisfies readonly ImportanceBand[];
const severityBands = new Set<ImportanceBand>(PUBLIC_SEVERITIES);

export type PublicUpdate = {
  id: string;
  vendor: string;
  vendor_slug: string;
  title: string;
  published_at: string;
  severity: ImportanceBand;
  signal_score: number;
  release_class: ReleaseClass;
  impact_confidence: ImpactConfidence;
  signal_reasons: string[];
  score_version: string;
  audience: string[];
  tags: string[];
  summary: string;
  why_it_matters: string;
  recommended_action: string;
  source_url: string;
  github_url: string | null;
  version_watch_url: string;
};

export type PublicVendor = {
  slug: string;
  name: string;
  description: string;
  sources: Array<{
    name: string;
    url: string;
    type: string;
  }>;
};

export type PublicApiErrorCode = "invalid_filter" | "invalid_cursor" | "not_found";

export type PublicApiError = {
  error: {
    code: PublicApiErrorCode;
    message: string;
  };
};

export type UpdateCursor = {
  publishedAt: string;
  id: string;
};

export type UpdateFilters = {
  since?: string;
  sinceTimestamp?: number;
  vendor?: string;
  severity?: ImportanceBand;
  audience?: string;
  tag?: string;
  cursor?: string;
  cursorPosition?: UpdateCursor;
  limit: number;
};

export type PublicTaxonomy = {
  severities: ImportanceBand[];
  release_classes: ReleaseClass[];
  impact_confidences: ImpactConfidence[];
  audiences: string[];
  tags: string[];
  source_types: SourceType[];
  vendors: Array<{
    slug: string;
    name: string;
  }>;
};

type ParseResult =
  | { ok: true; filters: UpdateFilters }
  | { ok: false; error: PublicApiError };

export function publicApiError(code: PublicApiErrorCode, message: string): PublicApiError {
  return {
    error: {
      code,
      message,
    },
  };
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sortedUnique(values: string[]) {
  return unique(values.map((value) => normalize(value))).sort((a, b) => a.localeCompare(b));
}

function normalizeBaseUrl(value: string | undefined | null) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return url.origin;
  } catch {
    return null;
  }
}

export function getPublicBaseUrl(requestUrl?: string) {
  return (
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeBaseUrl(process.env.SITE_URL) ??
    normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeBaseUrl(process.env.VERCEL_URL) ??
    normalizeBaseUrl(requestUrl ? new URL(requestUrl).origin : undefined) ??
    DEFAULT_PUBLIC_BASE_URL
  );
}

export function encodeUpdateCursor(cursor: UpdateCursor) {
  return Buffer.from(JSON.stringify({ v: 2, ...cursor }), "utf8").toString("base64url");
}

export function decodeUpdateCursor(cursor: string) {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      parsed.v === 2 &&
      typeof parsed.publishedAt === "string" &&
      Number.isFinite(Date.parse(parsed.publishedAt)) &&
      typeof parsed.id === "string" &&
      parsed.id.length > 0
    ) {
      return {
        publishedAt: new Date(Date.parse(parsed.publishedAt)).toISOString(),
        id: parsed.id,
      } satisfies UpdateCursor;
    }
  } catch {
    return null;
  }

  return null;
}

export function parseUpdateFilters(searchParams: URLSearchParams): ParseResult {
  const sinceRaw = searchParams.get("since")?.trim();
  let since: string | undefined;
  let sinceTimestamp: number | undefined;

  if (sinceRaw) {
    const parsed = Date.parse(sinceRaw);
    if (!Number.isFinite(parsed)) {
      return {
        ok: false,
        error: publicApiError("invalid_filter", "Invalid since timestamp. Use an ISO 8601 timestamp."),
      };
    }

    since = new Date(parsed).toISOString();
    sinceTimestamp = parsed;
  }

  const severity = normalize(searchParams.get("severity"));
  if (severity && !severityBands.has(severity as ImportanceBand)) {
    return {
      ok: false,
      error: publicApiError("invalid_filter", "Invalid severity. Use critical, high, medium, or low."),
    };
  }

  const limitRaw = searchParams.get("limit")?.trim();
  let limit = DEFAULT_UPDATE_LIMIT;

  if (limitRaw) {
    const parsed = Number(limitRaw);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      return { ok: false, error: publicApiError("invalid_filter", "Invalid limit. Use a positive integer.") };
    }

    limit = parsed;
  }

  const cursor = searchParams.get("cursor")?.trim();
  let cursorPosition: UpdateCursor | undefined;

  if (cursor) {
    const decoded = decodeUpdateCursor(cursor);
    if (decoded === null) {
      return { ok: false, error: publicApiError("invalid_cursor", "Invalid cursor. Use a cursor returned by next_cursor.") };
    }
    cursorPosition = decoded;
  }

  return {
    ok: true,
    filters: {
      since,
      sinceTimestamp,
      vendor: normalize(searchParams.get("vendor")) || undefined,
      severity: severity ? (severity as ImportanceBand) : undefined,
      audience: normalize(searchParams.get("audience")) || undefined,
      tag: normalize(searchParams.get("tag")) || undefined,
      cursor: cursor || undefined,
      cursorPosition,
      limit: Math.min(limit, MAX_UPDATE_LIMIT),
    },
  };
}

export function filterEventsForPublicUpdateMatches<T extends MockEvent>(
  events: T[],
  filters: UpdateFilters,
  now = Date.now(),
) {
  return events
    .filter((event) => {
      if (Date.parse(event.publishedAt) - now > MAX_FUTURE_SKEW_MS) {
        return false;
      }

      if (filters.sinceTimestamp !== undefined && Date.parse(event.publishedAt) < filters.sinceTimestamp) {
        return false;
      }

      if (filters.vendor && normalize(event.vendorSlug) !== filters.vendor) {
        return false;
      }

      if (filters.severity && event.importanceBand !== filters.severity) {
        return false;
      }

      if (filters.audience && !event.whoShouldCare.some((item) => normalize(item) === filters.audience)) {
        return false;
      }

      if (
        filters.tag &&
        ![...event.categories, ...(event.topicTags ?? getEventSignalMetadata(event).topicTags), ...event.affectedStack].some(
          (item) => normalize(item) === filters.tag,
        )
      ) {
        return false;
      }

      return true;
    });
}

function compareEventsForPublicPagination(a: MockEvent, b: MockEvent) {
  const publishedDiff = Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  if (publishedDiff !== 0) return publishedDiff;
  return a.slug.localeCompare(b.slug);
}

function isEventAfterCursor(event: MockEvent, cursor: UpdateCursor) {
  const publishedDiff = Date.parse(cursor.publishedAt) - Date.parse(event.publishedAt);
  if (publishedDiff !== 0) return publishedDiff > 0;
  return event.slug.localeCompare(cursor.id) > 0;
}

function cursorForEvent(event: MockEvent): UpdateCursor {
  return {
    publishedAt: new Date(Date.parse(event.publishedAt)).toISOString(),
    id: event.slug,
  };
}

export function paginateEventsForPublicUpdates<T extends MockEvent>(
  events: T[],
  filters: UpdateFilters,
  now = Date.now(),
) {
  const matches = filterEventsForPublicUpdateMatches(events, filters, now)
    .slice()
    .sort(compareEventsForPublicPagination);
  const eligible = filters.cursorPosition
    ? matches.filter((event) => isEventAfterCursor(event, filters.cursorPosition!))
    : matches;
  const page = eligible.slice(0, filters.limit);
  const lastEvent = page[page.length - 1];

  return {
    events: page,
    total_count: matches.length,
    next_cursor: lastEvent && eligible.length > page.length ? encodeUpdateCursor(cursorForEvent(lastEvent)) : null,
  };
}

export function filterEventsForPublicUpdates<T extends MockEvent>(
  events: T[],
  filters: UpdateFilters,
  now = Date.now(),
) {
  return paginateEventsForPublicUpdates(events, filters, now).events;
}

function hasCategory(event: MockEvent, category: string) {
  return event.categories.includes(category);
}

function getEventSignalMetadata(event: MockEvent & { computedScore?: number }) {
  const derived = deriveSignalMetadata(event);

  if (event.scoreVersion === SCORE_VERSION && event.releaseClass && event.impactConfidence) {
    return {
      ...derived,
      releaseClass: event.releaseClass,
      impactConfidence: event.impactConfidence,
      signalReasons: event.signalReasons?.length ? event.signalReasons : derived.signalReasons,
      topicTags: event.topicTags?.length ? event.topicTags : derived.topicTags,
      signalScore: event.computedScore ?? derived.signalScore,
      importanceBand: event.importanceBand ?? derived.importanceBand,
      displayTitle: event.title || derived.displayTitle,
      whyItMatters: event.whyItMatters && !isGenericWhyItMatters(event.whyItMatters)
        ? event.whyItMatters
        : derived.whyItMatters,
    };
  }

  return derived;
}

function stackLabel(event: MockEvent) {
  const primary = event.affectedStack.slice(0, 2).join(" and ");
  return primary || "application";
}

function isGenericWhyItMatters(value: string) {
  return /updated .+ semantics/i.test(value) || /review the official entry/i.test(value);
}

export function buildActionableWhyItMatters(event: MockEvent) {
  const signal = getEventSignalMetadata(event);

  if (
    event.scoreVersion !== SCORE_VERSION ||
    signal.releaseClass === "cli_patch" ||
    signal.releaseClass === "beta_release" ||
    signal.releaseClass === "routine_release" ||
    signal.releaseClass === "docs_update"
  ) {
    return signal.whyItMatters;
  }

  if (event.whyItMatters && !isGenericWhyItMatters(event.whyItMatters)) {
    return event.whyItMatters;
  }

  if (signal.whyItMatters) {
    return signal.whyItMatters;
  }

  const stack = stackLabel(event);

  if (hasCategory(event, "security")) {
    return `${event.vendorName} shipped a security-sensitive change for ${stack}. Teams using this surface should verify affected auth, secret, or dependency paths before the next release.`;
  }

  if (hasCategory(event, "breaking") || hasCategory(event, "deprecation")) {
    return `${event.vendorName} may change behavior for ${stack}. Teams using this platform area should plan migration work before upgrading or deploying dependent services.`;
  }

  if (hasCategory(event, "pricing")) {
    return `${event.vendorName} changed pricing or billing-relevant behavior for ${stack}. Product and engineering teams should review usage exposure before costs surprise customers or internal budgets.`;
  }

  if (hasCategory(event, "policy")) {
    return `${event.vendorName} updated policy or compliance expectations for ${stack}. Teams should check whether release, review, or governance workflows need adjustment.`;
  }

  if (hasCategory(event, "model")) {
    return `${event.vendorName} changed model behavior or availability for ${stack}. AI teams should expect possible differences in quality, latency, cost, or tool behavior.`;
  }

  if (hasCategory(event, "api")) {
    return `${event.vendorName} changed API-facing behavior for ${stack}. Teams with integrations should confirm request, response, and permission assumptions still hold.`;
  }

  if (hasCategory(event, "sdk")) {
    return `${event.vendorName} shipped SDK or client-library changes for ${stack}. Teams should review compatibility before changing pinned versions.`;
  }

  if (hasCategory(event, "infra")) {
    return `${event.vendorName} changed infrastructure behavior for ${stack}. Deployment and runtime owners should validate staging behavior before the next production rollout.`;
  }

  if (hasCategory(event, "docs")) {
    return `${event.vendorName} updated official documentation for ${stack}. This is worth reviewing when that area is already in active development.`;
  }

  return `${event.vendorName} published an official update for ${stack}. Review it if this vendor is part of your production or development workflow.`;
}

export function buildRecommendedAction(event: MockEvent) {
  const stack = stackLabel(event);
  const signal = getEventSignalMetadata(event);

  if (signal.releaseClass === "cli_patch") {
    return `Upgrade the CLI only if it affects active ${stack} workflows, then run local or CI smoke tests around agent and developer tooling paths.`;
  }

  if (signal.releaseClass === "beta_release") {
    return `Track this in prerelease testing only; avoid production rollout unless your team explicitly depends on this beta ${stack} surface.`;
  }

  if (signal.releaseClass === "routine_release") {
    return `Log the update for awareness and review it only if ${stack} work is already active.`;
  }

  if (signal.releaseClass === "docs_update") {
    return `Skim the source and update internal docs or implementation notes if ${stack} is active in your project.`;
  }

  if (hasCategory(event, "security")) {
    return `Prioritize source review, patch affected ${stack} paths, and rotate or audit credentials if the source indicates exposure.`;
  }

  if (hasCategory(event, "breaking") || hasCategory(event, "deprecation")) {
    return `Identify usage of the affected ${stack} surface, schedule migration work, and test before the next deploy or upgrade.`;
  }

  if (hasCategory(event, "pricing")) {
    return `Review billing impact for ${stack}, update customer or internal cost assumptions, and adjust usage limits if needed.`;
  }

  if (hasCategory(event, "policy")) {
    return `Compare the source against release, compliance, and review checklists before shipping work that depends on ${stack}.`;
  }

  if (hasCategory(event, "model")) {
    return `Run model evals or smoke tests for ${stack} workflows before routing production traffic to the changed behavior.`;
  }

  if (hasCategory(event, "api")) {
    return `Check integration code and contract tests for ${stack}; update request, response, or permission handling if the source changed it.`;
  }

  if (hasCategory(event, "sdk")) {
    return `Review the release notes, pin or upgrade the relevant SDK deliberately, and run CI against affected ${stack} paths.`;
  }

  if (hasCategory(event, "infra")) {
    return `Validate deployment, runtime, or configuration assumptions for ${stack} in staging before the next production rollout.`;
  }

  if (hasCategory(event, "docs")) {
    return `Skim the source and update internal docs or implementation notes if ${stack} is active in your project.`;
  }

  if (event.importanceBand === "critical" || event.importanceBand === "high") {
    return `Review the official source before the next release because this is ranked ${event.importanceBand} signal.`;
  }

  return "Review the official source when this vendor or stack area is relevant to active work.";
}

export function serializePublicUpdate(event: MockEvent & { computedScore?: number }, baseUrl = DEFAULT_PUBLIC_BASE_URL): PublicUpdate {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl) ?? DEFAULT_PUBLIC_BASE_URL;
  const signal = getEventSignalMetadata(event);

  return {
    id: event.slug,
    vendor: event.vendorName,
    vendor_slug: event.vendorSlug,
    title: signal.displayTitle,
    published_at: event.publishedAt,
    severity: signal.importanceBand,
    signal_score: signal.signalScore,
    release_class: signal.releaseClass,
    impact_confidence: signal.impactConfidence,
    signal_reasons: signal.signalReasons,
    score_version: signal.scoreVersion,
    audience: event.whoShouldCare,
    tags: unique([...event.categories, ...(event.topicTags ?? signal.topicTags), ...event.affectedStack]),
    summary: event.summary,
    why_it_matters: buildActionableWhyItMatters(event),
    recommended_action: buildRecommendedAction(event),
    source_url: event.sourceUrl,
    github_url: event.githubUrl ?? null,
    version_watch_url: new URL(`/events/${event.slug}`, normalizedBaseUrl).toString(),
  };
}

export function serializePublicUpdates(events: Array<MockEvent & { computedScore?: number }>, baseUrl = DEFAULT_PUBLIC_BASE_URL) {
  return events.map((event) => serializePublicUpdate(event, baseUrl));
}

export function serializePublicVendor(vendor: VendorRecord): PublicVendor {
  return {
    slug: vendor.slug,
    name: vendor.name,
    description: vendor.description,
    sources: vendor.sources.map((source) => ({
      name: source.name,
      url: source.url,
      type: source.type,
    })),
  };
}

export function buildPublicTaxonomy(events: MockEvent[], vendors: VendorRecord[]): PublicTaxonomy {
  return {
    severities: [...PUBLIC_SEVERITIES],
    release_classes: [...RELEASE_CLASSES],
    impact_confidences: [...IMPACT_CONFIDENCES],
    audiences: sortedUnique(events.flatMap((event) => event.whoShouldCare)),
    tags: sortedUnique(
      events.flatMap((event) => {
        const signal = getEventSignalMetadata(event);
        return [...event.categories, ...(event.topicTags ?? signal.topicTags), ...event.affectedStack];
      }),
    ),
    source_types: Array.from(new Set(vendors.flatMap((vendor) => vendor.sources.map((source) => source.type)))).sort(),
    vendors: vendors
      .map((vendor) => ({
        slug: vendor.slug,
        name: vendor.name,
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
  };
}

function list(values: string[]) {
  return values.length ? values.join(", ") : "none";
}

function markdownLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function renderUpdatesMarkdown(
  updates: PublicUpdate[],
  generatedAt: string,
  baseUrl = DEFAULT_PUBLIC_BASE_URL,
  nextCursor: string | null = null,
) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl) ?? DEFAULT_PUBLIC_BASE_URL;
  const nextPageUrl = nextCursor
    ? new URL(`/feed.md?cursor=${encodeURIComponent(nextCursor)}`, normalizedBaseUrl).toString()
    : null;
  const lines = [
    "# Version Watch Feed",
    "",
    "Official platform changes ranked for humans and readable by agents.",
    "",
    `Generated: ${generatedAt}`,
    `API status: ${new URL("/api/v1/status", normalizedBaseUrl).toString()}`,
    `JSON feed: ${new URL("/api/v1/feed.json", normalizedBaseUrl).toString()}`,
    `Updates API: ${new URL("/api/v1/updates", normalizedBaseUrl).toString()}`,
    ...(nextPageUrl ? [`Next page: ${nextPageUrl}`] : []),
    "Freshness rule: check API status before release gates, incident reviews, or high-confidence summaries.",
    "Cite the official Source URL when reporting an update.",
    "",
  ];

  for (const update of updates) {
    lines.push(
      `## ${update.vendor}: ${update.title}`,
      "",
      `- Version Watch: ${update.version_watch_url}`,
      `- Published: ${update.published_at}`,
      `- Severity: ${update.severity}`,
      `- Signal score: ${update.signal_score}`,
      `- Release class: ${update.release_class}`,
      `- Impact confidence: ${update.impact_confidence}`,
      `- Signal reasons: ${list(update.signal_reasons)}`,
      `- Audience: ${list(update.audience)}`,
      `- Tags: ${list(update.tags)}`,
      `- Summary: ${markdownLine(update.summary)}`,
      `- Why it matters: ${markdownLine(update.why_it_matters)}`,
      `- Recommended action: ${markdownLine(update.recommended_action)}`,
      `- Source: ${update.source_url}`,
      "",
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function renderAgentsMarkdown(baseUrl = DEFAULT_PUBLIC_BASE_URL) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl) ?? DEFAULT_PUBLIC_BASE_URL;

  return `# Version Watch Agent Access

Version Watch tracks official developer platform changelogs, release notes, docs updates, RSS feeds, and GitHub releases. Use it as a public change intelligence layer for developer tools and agents.

Version Watch is a Convex-backed snapshot API. It does not scrape vendor sites on each public API request. When freshness matters, check the status endpoint before reporting results as complete.

Base URL: ${normalizedBaseUrl}

## Recommended Endpoints

- Latest updates: ${new URL("/api/v1/updates", normalizedBaseUrl).toString()}
- Clustered updates: ${new URL("/api/v1/clusters", normalizedBaseUrl).toString()}
- High-signal updates: ${new URL("/api/v1/updates?severity=high&limit=25", normalizedBaseUrl).toString()}
- Critical updates: ${new URL("/api/v1/updates?severity=critical&limit=25", normalizedBaseUrl).toString()}
- Vendor list: ${new URL("/api/v1/vendors", normalizedBaseUrl).toString()}
- API status: ${new URL("/api/v1/status", normalizedBaseUrl).toString()}
- Vendor freshness: ${new URL("/api/v1/status/vendors", normalizedBaseUrl).toString()}
- Taxonomy: ${new URL("/api/v1/taxonomy", normalizedBaseUrl).toString()}
- OpenAPI contract: ${new URL("/api/v1/openapi.json", normalizedBaseUrl).toString()}
- Markdown feed: ${new URL("/feed.md", normalizedBaseUrl).toString()}
- JSON feed: ${new URL("/api/v1/feed.json", normalizedBaseUrl).toString()}
- API documentation: ${new URL("/agent-access", normalizedBaseUrl).toString()}
- LLM resource map: ${new URL("/llms.txt", normalizedBaseUrl).toString()}
- Version Watch skill: ${new URL("/skills/version-watch/SKILL.md", normalizedBaseUrl).toString()}

## Filters

Use query parameters on /api/v1/updates, /api/v1/clusters, /api/v1/feed.json, /api/v1/feed.md, and /feed.md.

- since: ISO 8601 timestamp, for example 2026-04-24T00:00:00Z
- vendor: vendor slug, for example openai, stripe, vercel, github, cloudflare, convex
- severity: critical, high, medium, or low
- audience: frontend, backend, infra, ai, product, security, compliance, or related audience labels
- tag: matches categories, topic tags, or affected stack tags such as api, auth, sdk, frontier-model, cli-release, agents, hosting, deployments
- limit: defaults to 25 and clamps at 100
- cursor: opaque pagination cursor returned as next_cursor

## Response Fields

Each public update includes:

- id
- vendor
- vendor_slug
- title
- published_at
- severity
- signal_score
- release_class
- impact_confidence
- signal_reasons
- score_version
- audience
- tags
- summary
- why_it_matters
- recommended_action
- source_url
- github_url
- version_watch_url

List responses also include schema_version, generated_at, status_url, count, total_count, filters, and next_cursor.

The release_class field explains what kind of change this is, while severity is the operational urgency. The recommended_action field is the most useful field for agents. Treat it as an action hint, then cite source_url or version_watch_url for attribution.

Errors use a stable shape: error.code and error.message. Current public codes are invalid_filter, invalid_cursor, and not_found.

## Freshness Contract

- healthy: the public Convex snapshot refreshed inside the expected window and active sources are clean.
- degraded: the snapshot is recent, but one or more active sources failed, are stale, backed off, or the latest refresh was partial.
- stale: no acceptable refresh completed within the freshness window.

Version Watch uses adaptive source freshness. A 15-minute Convex scheduler fetches only due sources. Critical vendors refresh faster, long-tail sources refresh slower, and failing sources back off before retrying.

Paused and unsupported sources are visible as coverage states but do not count as global freshness debt. Degraded sources are still monitored and should be treated as incomplete coverage until they recover.

For vendor-specific workflows, call /api/v1/status/vendors/{slug} before acting on a single platform.

Agents should mention degraded or stale status when producing release gates, incident reports, migration plans, or other high-confidence operational summaries.

## Pagination

- Treat next_cursor as opaque.
- Pass it back as the cursor query parameter to fetch the next page.
- Do not decode it or build offset assumptions around it.
- Store delivered update ids and de-duplicate by id before posting alerts or creating tasks.

## Use Cases

Agents should use Version Watch to:

- Detect breaking platform changes before upgrades or deployments
- Monitor APIs, SDKs, auth systems, billing systems, hosting providers, and AI platforms used by a project
- Summarize relevant updates for engineering teams
- Alert maintainers when a vendor ships a high-impact change
- Enrich dependency, release, and migration reviews with current vendor context
- Create tasks in Linear, Jira, GitHub Issues, or similar project systems when review is needed
- Post filtered digests into Discord, Slack, Microsoft Teams, Telegram, or internal portals
- Feed internal dashboards, knowledge bases, data warehouses, and weekly engineering reports

## Agent Workflow

1. Determine the project stack or vendor list.
2. Call /api/v1/status when freshness or operational confidence matters.
3. Call /api/v1/vendors if you need valid vendor slugs.
4. Call /api/v1/taxonomy if you need valid severities, audiences, tags, source types, and vendor slugs.
5. Query /api/v1/updates with vendor, severity, audience, tag, since, limit, and cursor filters.
6. Continue pagination while next_cursor is present and more results are needed.
7. De-duplicate updates by id before notifying a user or posting to a channel.
8. Summarize only updates that match the user or project context.
9. Include recommended_action when giving advice.
10. Cite source_url for the official vendor source and version_watch_url for the Version Watch record.

## Integration Guidance

- Discord or Slack: poll filtered updates from a scheduled worker, then post vendor, title, summary, recommended_action, and version_watch_url.
- CI/CD: query high or critical updates before release and flag matching vendor, API, SDK, auth, hosting, infra, or billing changes.
- Agents and IDEs: fetch context before suggesting dependency upgrades, migration plans, or code changes.
- Issue trackers: create review tasks for critical or high updates that match a team's vendors or tags.
- Data platforms: store update id, vendor_slug, severity, published_at, tags, recommended_action, source_url, and version_watch_url.

## Guardrails

- Do not claim to have read the official source unless you actually open source_url.
- Do not notify repeatedly for the same id.
- Prefer filtered queries over broad feeds for notifications.
- For recurring polling, use a 15 to 60 minute interval unless the user asks for a different cadence.
- If /api/v1/status is degraded or stale, include that caveat in summaries and avoid claiming complete coverage.
`;
}

export function renderLlmsTxt(baseUrl = DEFAULT_PUBLIC_BASE_URL) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl) ?? DEFAULT_PUBLIC_BASE_URL;

  return `# Version Watch

> Official platform changes ranked for humans and readable by agents.

Version Watch turns official developer platform changelogs, release notes, docs updates, and GitHub releases into structured change intelligence.

The public API reads from Convex-backed snapshots. It is not a live scrape-on-request system. Agents should check /api/v1/status when freshness matters.

## Agent Resources

- API docs: ${new URL("/agent-access", normalizedBaseUrl).toString()}
- Agent guide: ${new URL("/agents.md", normalizedBaseUrl).toString()}
- Version Watch skill: ${new URL("/skills/version-watch/SKILL.md", normalizedBaseUrl).toString()}
- Updates API: ${new URL("/api/v1/updates", normalizedBaseUrl).toString()}
- Clustered updates API: ${new URL("/api/v1/clusters", normalizedBaseUrl).toString()}
- Vendors API: ${new URL("/api/v1/vendors", normalizedBaseUrl).toString()}
- Status API: ${new URL("/api/v1/status", normalizedBaseUrl).toString()}
- Vendor freshness API: ${new URL("/api/v1/status/vendors", normalizedBaseUrl).toString()}
- Taxonomy API: ${new URL("/api/v1/taxonomy", normalizedBaseUrl).toString()}
- OpenAPI contract: ${new URL("/api/v1/openapi.json", normalizedBaseUrl).toString()}
- JSON feed: ${new URL("/api/v1/feed.json", normalizedBaseUrl).toString()}
- Markdown feed: ${new URL("/feed.md", normalizedBaseUrl).toString()}

## Query Examples

- High-severity updates: ${new URL("/api/v1/updates?severity=high", normalizedBaseUrl).toString()}
- Backend audience updates: ${new URL("/api/v1/updates?audience=backend", normalizedBaseUrl).toString()}
- Auth-tagged updates: ${new URL("/api/v1/updates?tag=auth", normalizedBaseUrl).toString()}
- Vendor-specific updates: ${new URL("/api/v1/updates?vendor=openai&limit=10", normalizedBaseUrl).toString()}
- Clustered latest updates: ${new URL("/api/v1/clusters?limit=10", normalizedBaseUrl).toString()}
- Vendor freshness: ${new URL("/api/v1/status/vendors/openai", normalizedBaseUrl).toString()}

## What Agents Can Do

- Monitor platform changes for a project stack
- Detect breaking, security, API, SDK, auth, billing, hosting, model, and infra updates
- Distinguish release_class from severity so routine CLI patches do not look as urgent as model launches or breaking changes
- Summarize relevant changes for developers
- Route high-signal updates into Discord, Slack, Teams, issue trackers, CI/CD, dashboards, and knowledge bases
- Use recommended_action as the next-step hint and source_url as the official citation

## Integration Rule

Fetch updates with the narrowest useful filters, check status_url for high-confidence work, follow next_cursor as an opaque value, de-duplicate by id, and cite source_url or version_watch_url when reporting results.
`;
}

export function renderVersionWatchSkillMarkdown(baseUrl = DEFAULT_PUBLIC_BASE_URL) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl) ?? DEFAULT_PUBLIC_BASE_URL;

  return `---
name: version-watch
description: Use Version Watch to retrieve current developer-platform changelog intelligence, filter it to a project stack, cite official sources, and produce actionable release-risk summaries.
---

# Version Watch Skill

Version Watch is a public change intelligence API for official developer-platform changelogs, release notes, docs updates, RSS feeds, and GitHub releases.

The API reads from Convex-backed snapshots. It is not live scrape-on-request. Always check freshness status when a user is making a release, incident, compliance, or upgrade decision.

Version Watch uses adaptive freshness: a 15-minute Convex scheduler fetches due sources based on freshness tier, source health, and backoff. A vendor-filtered API request can enqueue a background refresh when that vendor is due without blocking the response.

Use this skill when a user asks about recent platform changes, release risk, dependency upgrades, API or SDK changes, vendor monitoring, or agent-readable changelog context.

## Public Resources

- API docs: ${new URL("/agent-access", normalizedBaseUrl).toString()}
- OpenAPI contract: ${new URL("/api/v1/openapi.json", normalizedBaseUrl).toString()}
- Taxonomy: ${new URL("/api/v1/taxonomy", normalizedBaseUrl).toString()}
- Status: ${new URL("/api/v1/status", normalizedBaseUrl).toString()}
- Vendor freshness: ${new URL("/api/v1/status/vendors", normalizedBaseUrl).toString()}
- Vendors: ${new URL("/api/v1/vendors", normalizedBaseUrl).toString()}
- Updates: ${new URL("/api/v1/updates", normalizedBaseUrl).toString()}
- Clusters: ${new URL("/api/v1/clusters", normalizedBaseUrl).toString()}
- Markdown feed: ${new URL("/feed.md", normalizedBaseUrl).toString()}
- Agent guide: ${new URL("/agents.md", normalizedBaseUrl).toString()}
- LLM map: ${new URL("/llms.txt", normalizedBaseUrl).toString()}

## Operating Procedure

1. Identify the user's project stack, vendors, or platform areas.
2. If freshness matters, call /api/v1/status and tell the user if the feed is degraded or stale.
3. If vendor slugs or valid tags are uncertain, call /api/v1/vendors and /api/v1/taxonomy.
4. Query /api/v1/updates with the narrowest useful filters. Use /api/v1/clusters for digest-style views.
5. Use severity, audience, tag, since, and vendor filters before broad queries.
6. Follow next_cursor only when more matching results are needed.
7. De-duplicate by update id before reporting or notifying.
8. Use release_class, impact_confidence, signal_reasons, summary, why_it_matters, and recommended_action to explain the impact.
9. Cite source_url for the official vendor source. Cite version_watch_url for the Version Watch record.
10. Do not claim to have read the official source unless you opened source_url.

## Freshness Handling

- healthy: use results normally, while still citing official sources.
- degraded: explain that the snapshot is recent but one or more active sources may be incomplete.
- stale: warn that the snapshot missed the freshness window and avoid presenting results as complete.
- paused or unsupported sources do not make the global API stale, but they mean that vendor is not actively monitored until a reliable machine-readable surface exists.
- /api/v1/status/vendors/{slug} gives per-vendor tier, next due time, backoff, source counts, and queued refresh state.

## Pagination and Errors

- Follow next_cursor by passing it as cursor on the next request.
- Treat cursor values as opaque; do not decode them or assume offset pagination.
- Store delivered update ids so repeated polling does not notify twice.
- Handle error.code values invalid_filter, invalid_cursor, and not_found. Show error.message to the user or log it.

## Query Patterns

- Latest high-signal changes: ${new URL("/api/v1/updates?severity=high&limit=10", normalizedBaseUrl).toString()}
- Critical changes: ${new URL("/api/v1/updates?severity=critical&limit=10", normalizedBaseUrl).toString()}
- Vendor-specific changes: ${new URL("/api/v1/updates?vendor=openai&limit=10", normalizedBaseUrl).toString()}
- Stack-tag changes: ${new URL("/api/v1/updates?tag=auth&limit=10", normalizedBaseUrl).toString()}
- Recent backend changes: ${new URL("/api/v1/updates?audience=backend&since=2026-04-24T00:00:00Z&limit=10", normalizedBaseUrl).toString()}

## Common Agent Tasks

### Release Risk Check

Use this before a planned deploy or release.

    GET ${new URL("/api/v1/updates?severity=high&tag=api&limit=10", normalizedBaseUrl).toString()}

Report only updates that match the project stack. Include recommended_action and cite source_url.
If /api/v1/status is degraded or stale, include that caveat in the risk report.

### Dependency Upgrade Review

Use this before upgrading SDKs, CLIs, frameworks, or hosted platform dependencies.

    GET ${new URL("/api/v1/updates?tag=sdk&limit=20", normalizedBaseUrl).toString()}
    GET ${new URL("/api/v1/updates?tag=breaking&limit=20", normalizedBaseUrl).toString()}

Compare vendor_slug, tags, and audience to the dependency being upgraded. Flag breaking, deprecation, API, and SDK updates first.

### Vendor Watch Digest

Use this to summarize changes for a known stack.

    GET ${new URL("/api/v1/updates?vendor=openai&limit=5", normalizedBaseUrl).toString()}
    GET ${new URL("/api/v1/updates?vendor=vercel&limit=5", normalizedBaseUrl).toString()}
    GET ${new URL("/api/v1/updates?vendor=github&limit=5", normalizedBaseUrl).toString()}

Group by vendor, de-duplicate by id, and sort by published_at descending.
Use next_cursor when the digest needs more than one page.

### CI Preflight

Use this in release checks when the project has known vendors.

    GET ${new URL("/api/v1/updates?severity=critical&limit=25", normalizedBaseUrl).toString()}
    GET ${new URL("/api/v1/updates?severity=high&tag=infra&limit=25", normalizedBaseUrl).toString()}
    GET ${new URL("/api/v1/updates?severity=high&tag=auth&limit=25", normalizedBaseUrl).toString()}

Return a warning when a matching update affects auth, API, SDK, infra, billing, security, or deployment behavior.
Fail softly when status is degraded or stale: report the matching updates but tell the user coverage may be incomplete.

### Team Notification Formatting

Use this structure for Discord, Slack, Teams, email, or issue trackers.

    Vendor: {vendor}
    Title: {title}
    Severity: {severity}
    Release class: {release_class}
    Impact confidence: {impact_confidence}
    Summary: {summary}
    Recommended action: {recommended_action}
    Source: {source_url}
    Version Watch: {version_watch_url}

Send one message per update or one grouped digest. Store delivered ids to avoid repeats.

## Output Format

When summarizing updates for a user, include:

- Vendor and title
- Published date
- Severity and signal score
- Release class and impact confidence
- Summary
- Why it matters
- Recommended action
- Official source URL
- Version Watch URL

## Guardrails

- Prefer precise filters over broad feeds.
- Do not notify repeatedly for the same update id.
- Do not invent migration details that are not present in the update or official source.
- When confidence matters, tell the user to review source_url before changing production systems.
`;
}
