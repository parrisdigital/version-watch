import { scoreEvent } from "@/lib/classification/score";
import type { ImportanceBand, MockEvent, VendorRecord } from "@/lib/mock-data";

export const DEFAULT_PUBLIC_BASE_URL = "https://version-watch.vercel.app";
export const DEFAULT_UPDATE_LIMIT = 25;
export const MAX_UPDATE_LIMIT = 100;
export const MAX_FUTURE_SKEW_MS = 60 * 60 * 1000;
export const PUBLIC_AGENT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60, s-maxage=300",
};

const severityBands = new Set<ImportanceBand>(["critical", "high", "medium", "low"]);

export type PublicUpdate = {
  id: string;
  vendor: string;
  vendor_slug: string;
  title: string;
  published_at: string;
  severity: ImportanceBand;
  signal_score: number;
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

export type UpdateFilters = {
  since?: string;
  sinceTimestamp?: number;
  vendor?: string;
  severity?: ImportanceBand;
  audience?: string;
  tag?: string;
  limit: number;
};

type ParseResult =
  | { ok: true; filters: UpdateFilters }
  | { ok: false; error: string };

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
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

export function parseUpdateFilters(searchParams: URLSearchParams): ParseResult {
  const sinceRaw = searchParams.get("since")?.trim();
  let since: string | undefined;
  let sinceTimestamp: number | undefined;

  if (sinceRaw) {
    const parsed = Date.parse(sinceRaw);
    if (!Number.isFinite(parsed)) {
      return { ok: false, error: "Invalid since timestamp. Use an ISO 8601 timestamp." };
    }

    since = new Date(parsed).toISOString();
    sinceTimestamp = parsed;
  }

  const severity = normalize(searchParams.get("severity"));
  if (severity && !severityBands.has(severity as ImportanceBand)) {
    return { ok: false, error: "Invalid severity. Use critical, high, medium, or low." };
  }

  const limitRaw = searchParams.get("limit")?.trim();
  let limit = DEFAULT_UPDATE_LIMIT;

  if (limitRaw) {
    const parsed = Number(limitRaw);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      return { ok: false, error: "Invalid limit. Use a positive integer." };
    }

    limit = parsed;
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
      limit: Math.min(limit, MAX_UPDATE_LIMIT),
    },
  };
}

export function filterEventsForPublicUpdates<T extends MockEvent>(
  events: T[],
  filters: UpdateFilters,
  now = Date.now(),
) {
  return events
    .filter((event) => {
      if (Date.parse(event.publishedAt) - now > MAX_FUTURE_SKEW_MS) {
        return false;
      }

      if (filters.sinceTimestamp && Date.parse(event.publishedAt) < filters.sinceTimestamp) {
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
        ![...event.categories, ...event.affectedStack].some((item) => normalize(item) === filters.tag)
      ) {
        return false;
      }

      return true;
    })
    .slice(0, filters.limit);
}

function hasCategory(event: MockEvent, category: string) {
  return event.categories.includes(category);
}

function stackLabel(event: MockEvent) {
  const primary = event.affectedStack.slice(0, 2).join(" and ");
  return primary || "application";
}

function isGenericWhyItMatters(value: string) {
  return /updated .+ semantics/i.test(value) || /review the official entry/i.test(value);
}

export function buildActionableWhyItMatters(event: MockEvent) {
  if (event.whyItMatters && !isGenericWhyItMatters(event.whyItMatters)) {
    return event.whyItMatters;
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

  return {
    id: event.slug,
    vendor: event.vendorName,
    vendor_slug: event.vendorSlug,
    title: event.title,
    published_at: event.publishedAt,
    severity: event.importanceBand,
    signal_score: event.computedScore ?? scoreEvent(event),
    audience: event.whoShouldCare,
    tags: unique([...event.categories, ...event.affectedStack]),
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

function list(values: string[]) {
  return values.length ? values.join(", ") : "none";
}

function markdownLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function renderUpdatesMarkdown(updates: PublicUpdate[], generatedAt: string, baseUrl = DEFAULT_PUBLIC_BASE_URL) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl) ?? DEFAULT_PUBLIC_BASE_URL;
  const lines = [
    "# Version Watch Feed",
    "",
    "Official platform changes ranked for humans and readable by agents.",
    "",
    `Generated: ${generatedAt}`,
    `JSON feed: ${new URL("/api/v1/feed.json", normalizedBaseUrl).toString()}`,
    `Updates API: ${new URL("/api/v1/updates", normalizedBaseUrl).toString()}`,
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

Base URL: ${normalizedBaseUrl}

## Recommended Endpoints

- Latest updates: ${new URL("/api/v1/updates", normalizedBaseUrl).toString()}
- High-signal updates: ${new URL("/api/v1/updates?severity=high&limit=25", normalizedBaseUrl).toString()}
- Critical updates: ${new URL("/api/v1/updates?severity=critical&limit=25", normalizedBaseUrl).toString()}
- Vendor list: ${new URL("/api/v1/vendors", normalizedBaseUrl).toString()}
- Markdown feed: ${new URL("/feed.md", normalizedBaseUrl).toString()}
- JSON feed: ${new URL("/api/v1/feed.json", normalizedBaseUrl).toString()}
- API documentation: ${new URL("/agent-access", normalizedBaseUrl).toString()}
- LLM resource map: ${new URL("/llms.txt", normalizedBaseUrl).toString()}

## Filters

Use query parameters on /api/v1/updates, /api/v1/feed.json, /api/v1/feed.md, and /feed.md.

- since: ISO 8601 timestamp, for example 2026-04-24T00:00:00Z
- vendor: vendor slug, for example openai, stripe, vercel, github, cloudflare, convex
- severity: critical, high, medium, or low
- audience: frontend, backend, infra, ai, product, security, compliance, or related audience labels
- tag: matches categories or affected stack tags such as api, auth, billing, sdk, agents, hosting, deployments
- limit: defaults to 25 and clamps at 100

## Response Fields

Each public update includes:

- id
- vendor
- vendor_slug
- title
- published_at
- severity
- signal_score
- audience
- tags
- summary
- why_it_matters
- recommended_action
- source_url
- github_url
- version_watch_url

The recommended_action field is the most useful field for agents. Treat it as an action hint, then cite source_url or version_watch_url for attribution.

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
2. Call /api/v1/vendors if you need valid vendor slugs.
3. Query /api/v1/updates with vendor, severity, audience, tag, since, and limit filters.
4. De-duplicate updates by id before notifying a user or posting to a channel.
5. Summarize only updates that match the user or project context.
6. Include recommended_action when giving advice.
7. Cite source_url for the official vendor source and version_watch_url for the Version Watch record.

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
`;
}

export function renderLlmsTxt(baseUrl = DEFAULT_PUBLIC_BASE_URL) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl) ?? DEFAULT_PUBLIC_BASE_URL;

  return `# Version Watch

> Official platform changes ranked for humans and readable by agents.

Version Watch turns official developer platform changelogs, release notes, docs updates, and GitHub releases into structured change intelligence.

## Agent Resources

- API docs: ${new URL("/agent-access", normalizedBaseUrl).toString()}
- Agent guide: ${new URL("/agents.md", normalizedBaseUrl).toString()}
- Updates API: ${new URL("/api/v1/updates", normalizedBaseUrl).toString()}
- Vendors API: ${new URL("/api/v1/vendors", normalizedBaseUrl).toString()}
- JSON feed: ${new URL("/api/v1/feed.json", normalizedBaseUrl).toString()}
- Markdown feed: ${new URL("/feed.md", normalizedBaseUrl).toString()}

## Query Examples

- High-severity updates: ${new URL("/api/v1/updates?severity=high", normalizedBaseUrl).toString()}
- Backend audience updates: ${new URL("/api/v1/updates?audience=backend", normalizedBaseUrl).toString()}
- Auth-tagged updates: ${new URL("/api/v1/updates?tag=auth", normalizedBaseUrl).toString()}
- Vendor-specific updates: ${new URL("/api/v1/updates?vendor=openai&limit=10", normalizedBaseUrl).toString()}

## What Agents Can Do

- Monitor platform changes for a project stack
- Detect breaking, security, API, SDK, auth, billing, hosting, model, and infra updates
- Summarize relevant changes for developers
- Route high-signal updates into Discord, Slack, Teams, issue trackers, CI/CD, dashboards, and knowledge bases
- Use recommended_action as the next-step hint and source_url as the official citation

## Integration Rule

Fetch updates with the narrowest useful filters, de-duplicate by id, and cite source_url or version_watch_url when reporting results.
`;
}
