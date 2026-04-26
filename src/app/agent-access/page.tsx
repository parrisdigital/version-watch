import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Bot,
  Braces,
  CircleCheck,
  Code2,
  FileJson,
  FileText,
  Globe2,
  MessageSquare,
  ShieldCheck,
  Terminal,
} from "lucide-react";

import { CodeBlock } from "@/components/docs/code-block";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VendorMark } from "@/components/vendor-mark";
import { getPublicBaseUrl } from "@/lib/agent-feed";
import { getVendors } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agent Access API | Version Watch",
  description:
    "Developer documentation for the public Version Watch API, Markdown feeds, filters, and agent-readable changelog intelligence.",
};

const DOC_NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#endpoints", label: "Endpoints" },
  { href: "#filters", label: "Filters" },
  { href: "#response", label: "Response shape" },
  { href: "#skill", label: "Agent skill" },
  { href: "#build", label: "Build with API" },
  { href: "#integrations", label: "Integrations" },
  { href: "#coverage", label: "Platform coverage" },
  { href: "#roadmap", label: "What is next" },
] as const;

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/updates",
    title: "List updates",
    description: "Latest platform changes with severity, release class, audience, tags, source URLs, and recommended actions.",
  },
  {
    method: "GET",
    path: "/api/v1/clusters",
    title: "List update clusters",
    description: "Digest-friendly grouped updates that collapse related same-vendor release bursts.",
  },
  {
    method: "GET",
    path: "/api/v1/updates/[id]",
    title: "Read one update",
    description: "Fetch a single structured update by its public event slug.",
  },
  {
    method: "GET",
    path: "/api/v1/vendors",
    title: "List vendors",
    description: "Tracked platforms and their official source surfaces.",
  },
  {
    method: "GET",
    path: "/api/v1/status",
    title: "Read API freshness",
    description: "Current ingestion health, latest refresh time, source counts, and degraded or stale status.",
  },
  {
    method: "GET",
    path: "/api/v1/status/vendors",
    title: "Read vendor freshness",
    description: "Per-vendor lifecycle, freshness tier, next due time, backoff, and queued refresh state.",
  },
  {
    method: "GET",
    path: "/api/v1/status/vendors/[slug]",
    title: "Read one vendor freshness",
    description: "Freshness status for one tracked vendor slug.",
  },
  {
    method: "GET",
    path: "/api/v1/taxonomy",
    title: "Read filter taxonomy",
    description: "Valid severities, audiences, tags, source types, and vendor slugs for agent filters.",
  },
  {
    method: "POST",
    path: "/api/v1/relevance",
    title: "Submit relevance signal",
    description:
      "Structured community signal for impacted, needs-review, or no-impact feedback. Use only when a human explicitly provides the signal.",
  },
  {
    method: "GET",
    path: "/api/v1/openapi.json",
    title: "OpenAPI contract",
    description: "Machine-readable API contract for agents, custom tools, SDK generators, and test harnesses.",
  },
  {
    method: "GET",
    path: "/api/v1/feed.json",
    title: "JSON feed",
    description: "A compact feed for agents, scheduled jobs, and integration workers.",
  },
  {
    method: "GET",
    path: "/api/v1/feed.md",
    title: "Markdown feed",
    description: "Markdown update digest for tools that prefer plain text context.",
  },
  {
    method: "GET",
    path: "/feed.md",
    title: "Short Markdown route",
    description: "Human and agent friendly Markdown feed at the site root.",
  },
  {
    method: "GET",
    path: "/agents.md",
    title: "Agent guide",
    description: "Recommended access points and use cases for AI agents.",
  },
  {
    method: "GET",
    path: "/llms.txt",
    title: "LLM resource file",
    description: "Plain text map of public resources for LLM and crawler discovery.",
  },
  {
    method: "GET",
    path: "/skills/version-watch/SKILL.md",
    title: "Agent skill",
    description: "Portable Markdown operating procedure for agents using the Version Watch API.",
  },
] as const;

const FILTERS = [
  {
    name: "since",
    example: "2026-04-24T00:00:00Z",
    behavior: "Returns updates published at or after an ISO 8601 timestamp.",
  },
  {
    name: "vendor",
    example: "vercel",
    behavior: "Matches the vendor slug.",
  },
  {
    name: "severity",
    example: "high",
    behavior: "Maps to importance bands: critical, high, medium, or low.",
  },
  {
    name: "audience",
    example: "backend",
    behavior: "Matches whoShouldCare values such as frontend, backend, infra, AI, or product.",
  },
  {
    name: "tag",
    example: "auth",
    behavior: "Matches categories, topic tags, or affected stack tags.",
  },
  {
    name: "limit",
    example: "25",
    behavior: "Defaults to 25 and clamps at 100.",
  },
  {
    name: "cursor",
    example: "eyJ2IjoyLCJw...",
    behavior:
      "Uses the opaque sort-key next_cursor value to fetch the next page without offset drift.",
  },
] as const;

const STATUS_STATES = [
  {
    name: "healthy",
    behavior: "The Convex-backed snapshot was refreshed within the expected window and active sources are clean.",
  },
  {
    name: "degraded",
    behavior: "The snapshot is recent, but one or more active sources failed, are stale, or refreshed partially.",
  },
  {
    name: "stale",
    behavior: "No acceptable refresh has completed inside the freshness window, so consumers should warn users.",
  },
] as const;

const ERROR_CODES = [
  {
    code: "invalid_filter",
    behavior: "A query parameter is malformed, unsupported, or outside the allowed values.",
  },
  {
    code: "invalid_cursor",
    behavior: "The cursor was not returned by Version Watch or no longer matches the v1 cursor format.",
  },
  {
    code: "not_found",
    behavior: "The requested update id does not exist in the public snapshot.",
  },
] as const;

const CAPABILITIES = [
  {
    icon: Globe2,
    title: "Monitor release notes in one place",
    body: "Pull recent changelog, docs, blog, RSS, and GitHub release changes from one normalized public layer.",
  },
  {
    icon: BadgeCheck,
    title: "Rank what deserves attention",
    body: "Use severity, release class, signal score, audience, and stack tags to route only the updates that matter.",
  },
  {
    icon: Code2,
    title: "Power internal developer tools",
    body: "Create dashboards, release checks, upgrade reports, weekly digests, and vendor-specific watch views.",
  },
  {
    icon: Bot,
    title: "Give agents reliable context",
    body: "Let coding and ops agents fetch source-linked change intelligence before suggesting migrations or upgrades.",
  },
] as const;

const MACHINE_READABLE_SURFACES = [
  {
    label: "JSON API",
    status: "Live",
    body: "Best for apps, bots, dashboards, data pipelines, and scheduled workers.",
  },
  {
    label: "Markdown feeds",
    status: "Live",
    body: "Best for agents, LLM context windows, team digests, and plain text automation.",
  },
  {
    label: "agents.md and llms.txt",
    status: "Live",
    body: "Best for agent discovery and crawler-friendly resource mapping.",
  },
  {
    label: "OpenAPI schema",
    status: "Live",
    body: "Best for OpenAPI-aware agents, custom tools, SDK generators, and contract tests.",
  },
  {
    label: "Freshness status",
    status: "Live",
    body: "Best for checking whether the Convex-backed snapshot and individual vendor coverage are healthy, degraded, or stale before acting.",
  },
  {
    label: "Version Watch skill",
    status: "Live",
    body: "Best for teaching agents when to use the API, how to filter, and how to cite sources.",
  },
  {
    label: "Structured relevance signals",
    status: "Live",
    body: "Best for collecting impacted, needs-review, and no-impact feedback without turning records into an open comment thread.",
  },
  {
    label: "RSS and generic webhooks",
    status: "Next",
    body: "Would support feed readers, automation tools, and push-based team notifications.",
  },
  {
    label: "MCP server",
    status: "Later",
    body: "Useful after the public API proves the core data model and filters are valuable.",
  },
] as const;

const INTEGRATIONS = [
  {
    icon: MessageSquare,
    title: "Chat and community",
    body: "Use your own worker or bot to deliver high-signal updates into Discord, Slack, Microsoft Teams, Telegram, or community channels.",
  },
  {
    icon: Bot,
    title: "Agents and IDEs",
    body: "Give Cursor, Codex-style agents, Claude workflows, custom copilots, and internal agents current platform context.",
  },
  {
    icon: BellRing,
    title: "Automation platforms",
    body: "Use Pipedream, Make, n8n, Vercel Cron, Cloudflare Workers, or scheduled jobs to poll and route updates.",
  },
  {
    icon: Terminal,
    title: "CI/CD and release gates",
    body: "Check relevant vendor updates before deploys so teams can catch breaking, auth, API, SDK, and infra changes.",
  },
  {
    icon: CircleCheck,
    title: "Issue trackers",
    body: "Create Linear, Jira, GitHub Issue, or Asana tasks when a critical vendor update needs review.",
  },
  {
    icon: ShieldCheck,
    title: "Incident and ops tools",
    body: "Route security, infra, and platform-risk updates into PagerDuty, Datadog, Sentry, or runbook workflows.",
  },
  {
    icon: FileText,
    title: "Knowledge bases",
    body: "Generate Notion, Confluence, docs portal, or weekly engineering digest entries with official source links.",
  },
  {
    icon: Braces,
    title: "Data and analytics",
    body: "Load normalized update records into Postgres, BigQuery, Snowflake, Airtable, or internal dashboards.",
  },
] as const;

const RESPONSE_FIELDS = [
  "id",
  "vendor",
  "vendor_slug",
  "title",
  "published_at",
  "severity",
  "signal_score",
  "release_class",
  "impact_confidence",
  "signal_reasons",
  "score_version",
  "audience",
  "tags",
  "summary",
  "why_it_matters",
  "recommended_action",
  "source_detail_url",
  "source_surface_url",
  "source_surface_name",
  "source_surface_type",
  "source_url",
  "github_url",
  "version_watch_url",
] as const;

const WRAPPER_FIELDS = [
  "schema_version",
  "generated_at",
  "status_url",
  "count",
  "total_count",
  "next_cursor",
  "filters",
  "updates",
] as const;

const ERROR_FIELDS = ["error.code", "error.message"] as const;

const FEATURED_VENDOR_SLUGS = [
  "openai",
  "anthropic",
  "gemini",
  "vercel",
  "stripe",
  "github",
  "cloudflare",
  "cursor",
  "supabase",
  "firebase",
  "apple-developer",
  "firecrawl",
  "exa",
  "clerk",
  "convex",
  "railway",
] as const;

function DocsCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardHeader>
        <Icon className="size-5 text-foreground" aria-hidden="true" />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function EndpointRows() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {ENDPOINTS.map((endpoint, index) => (
        <div key={endpoint.path}>
          <div className="grid gap-3 p-4 sm:grid-cols-[9rem_1fr] sm:p-5">
            <div className="flex min-w-0 items-start gap-2">
              <Badge variant="outline" className="font-mono">
                {endpoint.method}
              </Badge>
              <code className="min-w-0 break-all font-mono text-sm text-foreground">
                {endpoint.path}
              </code>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-foreground">{endpoint.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{endpoint.description}</p>
            </div>
          </div>
          {index < ENDPOINTS.length - 1 ? <Separator /> : null}
        </div>
      ))}
    </div>
  );
}

function FilterRows() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {FILTERS.map((filter, index) => (
        <div key={filter.name}>
          <div className="grid gap-3 p-4 sm:grid-cols-[10rem_12rem_1fr] sm:p-5">
            <code className="font-mono text-sm text-foreground">{filter.name}</code>
            <code className="w-fit rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              {filter.example}
            </code>
            <p className="text-sm leading-relaxed text-muted-foreground">{filter.behavior}</p>
          </div>
          {index < FILTERS.length - 1 ? <Separator /> : null}
        </div>
      ))}
    </div>
  );
}

function StatusRows() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {STATUS_STATES.map((state, index) => (
        <div key={state.name}>
          <div className="grid gap-3 p-4 sm:grid-cols-[9rem_1fr] sm:p-5">
            <Badge variant={state.name === "healthy" ? "secondary" : "outline"} className="w-fit font-mono">
              {state.name}
            </Badge>
            <p className="text-sm leading-relaxed text-muted-foreground">{state.behavior}</p>
          </div>
          {index < STATUS_STATES.length - 1 ? <Separator /> : null}
        </div>
      ))}
    </div>
  );
}

function ErrorRows() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {ERROR_CODES.map((error, index) => (
        <div key={error.code}>
          <div className="grid gap-3 p-4 sm:grid-cols-[10rem_1fr] sm:p-5">
            <code className="font-mono text-sm text-foreground">{error.code}</code>
            <p className="text-sm leading-relaxed text-muted-foreground">{error.behavior}</p>
          </div>
          {index < ERROR_CODES.length - 1 ? <Separator /> : null}
        </div>
      ))}
    </div>
  );
}

function SectionIntro({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="vw-kicker">{kicker}</p>
      <h2 className="vw-title text-balance text-3xl md:text-4xl">{title}</h2>
      <p className="vw-copy text-base md:text-lg">{body}</p>
    </div>
  );
}

export default async function AgentAccessPage() {
  const [baseUrl, vendors] = await Promise.all([Promise.resolve(getPublicBaseUrl()), getVendors()]);
  const vendorBySlug = new Map(vendors.map((vendor) => [vendor.slug, vendor]));
  const featuredVendors = FEATURED_VENDOR_SLUGS.flatMap((slug) => {
    const vendor = vendorBySlug.get(slug);
    return vendor ? [vendor] : [];
  });

  const filteredUrl = `${baseUrl}/api/v1/updates?vendor=vercel&severity=high&audience=frontend&tag=deployment&limit=10`;
  const latestUrl = `${baseUrl}/api/v1/updates?limit=5`;
  const statusUrl = `${baseUrl}/api/v1/status`;
  const skillUrl = `${baseUrl}/skills/version-watch/SKILL.md`;

  const jsonExample = `{
  "id": "openclaw-2026-04-25-openclaw-2026-4-24",
  "vendor": "OpenClaw",
  "vendor_slug": "openclaw",
  "title": "openclaw 2026.4.24",
  "published_at": "2026-04-25T19:39:08.000Z",
  "severity": "medium",
  "signal_score": 30,
  "release_class": "beta_release",
  "impact_confidence": "low",
  "signal_reasons": ["release_class:beta_release", "impact_confidence:low"],
  "score_version": "v2",
  "audience": ["backend", "ai"],
  "tags": ["api", "beta-release", "agents", "developer-workflow"],
  "summary": "One-sentence explanation of what changed.",
  "why_it_matters": "Clear operational impact for affected teams.",
  "recommended_action": "Review affected integration paths before upgrading.",
  "source_detail_url": "https://github.com/orgs/supabase/discussions/...",
  "source_surface_url": "https://supabase.com/changelog",
  "source_surface_name": "Supabase Changelog",
  "source_surface_type": "changelog_page",
  "source_url": "https://github.com/orgs/supabase/discussions/...",
  "github_url": "https://...",
  "version_watch_url": "${baseUrl}/events/..."
}`;

  const discordExample = `const updates = await fetch(
  "${baseUrl}/api/v1/updates?severity=high&limit=10"
).then((response) => response.json());

for (const update of updates.updates) {
  await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content:
        "**" + update.vendor + ": " + update.title + "**\\n" +
        update.summary + "\\n" +
        "Action: " + update.recommended_action + "\\n" +
        "Source: " + update.source_detail_url + "\\n" +
        update.version_watch_url,
    }),
  });
}`;

  const slackExample = `const updates = await fetch(
  "${baseUrl}/api/v1/updates?vendor=stripe&severity=high&limit=5"
).then((response) => response.json());

await fetch(process.env.SLACK_WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: updates.updates
      .map((update) =>
        "*" + update.vendor + ": " + update.title + "*\\n" +
        update.recommended_action + "\\n" +
        update.source_detail_url + "\\n" +
        update.version_watch_url
      )
      .join("\\n\\n"),
  }),
});`;

  const syncExample = `let cursor = "";
const seen = new Set(await loadDeliveredUpdateIds());

do {
  const url = new URL("${baseUrl}/api/v1/updates");
  url.searchParams.set("vendor", "openai");
  url.searchParams.set("limit", "100");
  if (cursor) url.searchParams.set("cursor", cursor);

  const page = await fetch(url).then((response) => response.json());

  for (const update of page.updates) {
    if (seen.has(update.id)) continue;

    await saveUpdate({
      id: update.id,
      vendor: update.vendor_slug,
      title: update.title,
      severity: update.severity,
      release_class: update.release_class,
      published_at: update.published_at,
      recommended_action: update.recommended_action,
      source_detail_url: update.source_detail_url,
      source_surface_url: update.source_surface_url,
      version_watch_url: update.version_watch_url,
    });
  }

  cursor = page.next_cursor ?? "";
} while (cursor);`;

  const dashboardExample = `const [status, updates] = await Promise.all([
  fetch("${baseUrl}/api/v1/status").then((response) => response.json()),
  fetch("${baseUrl}/api/v1/clusters?severity=high&limit=20").then((response) => response.json()),
]);

renderDashboard({
  freshness: status.status,
  status_url: updates.status_url,
  clusters: updates.clusters,
});`;

  const relevanceExample = `await fetch("${baseUrl}/api/v1/relevance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event_id: "openai-2026-04-24-gpt-5-5",
    signal: "needs_review",
    area: "ai_agents"
  })
});`;

  return (
    <div className="vw-page flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="px-4 pb-14 pt-28 sm:px-6 md:pt-32 lg:pb-16">
          <div className="vw-shell grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-14">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Developer docs</Badge>
                <Badge variant="secondary">Public API</Badge>
                <Badge variant="muted">No auth required</Badge>
              </div>
              <div className="flex flex-col gap-5">
                <h1 className="vw-display max-w-[13ch] text-balance text-4xl sm:text-5xl md:text-6xl">
                  Agent-readable changelog intelligence.
                </h1>
                <p className="vw-copy max-w-[68ch] text-lg md:text-xl">
                  Version Watch exposes official release notes, changelogs, docs updates, and
                  GitHub releases through JSON and Markdown routes that developers can use in
                  agents, internal tools, Slack, Discord, CI, and automation workflows.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                <Badge variant="outline" className="w-fit font-mono">
                  Base URL
                </Badge>
                <code className="min-w-0 break-all rounded-md border border-border bg-card px-3 py-2 font-mono text-sm text-foreground">
                  {baseUrl}
                </code>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/api/v1/updates">
                    <FileJson className="size-4" aria-hidden="true" />
                    Open JSON API
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/feed.md">
                    <FileText className="size-4" aria-hidden="true" />
                    Open Markdown feed
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/skills/version-watch/SKILL.md">
                    <Bot className="size-4" aria-hidden="true" />
                    Open agent skill
                  </Link>
                </Button>
              </div>
            </div>

            <CodeBlock
              title="GET /api/v1/updates?severity=high&limit=1"
              language="json"
              code={jsonExample}
            />
          </div>
        </section>

        <section className="border-t border-border px-4 py-14 sm:px-6 md:py-16">
          <div className="vw-shell grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
            <aside className="hidden lg:block">
              <nav
                aria-label="Agent access documentation"
                className="sticky top-28 flex flex-col gap-1 rounded-xl border border-border bg-card p-2"
              >
                {DOC_NAV.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="min-w-0 space-y-16">
              <section id="overview" className="scroll-mt-28">
                <SectionIntro
                  kicker="Overview"
                  title="What the API lets developers build"
                  body="The API is a read-only change intelligence layer backed by Convex snapshots. It does not replace vendor sources or scrape them on every request. It gives tools and agents a consistent way to discover what changed, who is affected, how urgent it is, what action should happen next, and whether the feed is currently healthy."
                />
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {CAPABILITIES.map((item) => (
                    <DocsCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
                  ))}
                </div>
                <div className="mt-8 grid gap-6 xl:grid-cols-[0.72fr_1.28fr] xl:items-start">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      Freshness contract
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Version Watch reads from Convex snapshots. It does not scrape vendors on each
                      API request. When freshness matters, check /api/v1/status before treating results
                      as operationally complete.
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      A 15-minute Convex scheduler fetches only sources that are due based on freshness
                      tier, backoff, and source health. Paused and unsupported sources remain visible as
                      coverage states, but they do not create active freshness debt.
                    </p>
                  </div>
                  <StatusRows />
                </div>
                <div className="mt-10">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    Machine-readable surfaces
                  </h3>
                  <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                    {MACHINE_READABLE_SURFACES.map((surface, index) => (
                      <div key={surface.label}>
                        <div className="grid gap-3 p-4 sm:grid-cols-[12rem_6rem_1fr] sm:p-5">
                          <p className="text-sm font-semibold text-foreground">{surface.label}</p>
                          <Badge
                            variant={surface.status === "Live" ? "secondary" : "outline"}
                            className="w-fit"
                          >
                            {surface.status}
                          </Badge>
                          <p className="text-sm leading-relaxed text-muted-foreground">{surface.body}</p>
                        </div>
                        {index < MACHINE_READABLE_SURFACES.length - 1 ? <Separator /> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section id="endpoints" className="scroll-mt-28">
                <div className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr] xl:gap-10">
                  <SectionIntro
                    kicker="Endpoints"
                    title="Public routes for JSON, Markdown, and agent discovery"
                    body="Use JSON for applications and scheduled jobs. Use Markdown routes when an agent, LLM workflow, or human-readable digest needs plain text context."
                  />
                  <EndpointRows />
                </div>
              </section>

              <section id="filters" className="scroll-mt-28">
                <div className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr] xl:gap-10">
                  <div className="flex min-w-0 flex-col gap-4">
                    <SectionIntro
                      kicker="Filters"
                      title="Ask for the changes your stack actually cares about"
                      body="Filters can be combined on /api/v1/updates and /feed.md. This is the piece that makes agents, bots, dashboards, release gates, and notifications useful instead of noisy."
                    />
                    <CodeBlock className="min-w-0" title="Filtered request" language="bash" code={`curl "${filteredUrl}"`} />
                  </div>
                  <FilterRows />
                </div>
              </section>

              <section id="response" className="scroll-mt-28">
                <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr] xl:gap-10">
                  <div className="flex flex-col gap-4">
                    <SectionIntro
                      kicker="Response shape"
                      title="Stable snake_case fields for tools and agents"
                      body="The important field is recommended_action. Agents should use it as a read-only action hint, check status_url when freshness matters, then cite source_detail_url for the exact official entry. source_url remains a backward-compatible alias."
                    />
                    <div className="flex flex-wrap gap-2">
                      {RESPONSE_FIELDS.map((field) => (
                        <Badge key={field} variant="outline" className="font-mono">
                          {field}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {WRAPPER_FIELDS.map((field) => (
                        <Badge key={field} variant="muted" className="font-mono">
                          {field}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ERROR_FIELDS.map((field) => (
                        <Badge key={field} variant="outline" className="font-mono">
                          {field}
                        </Badge>
                      ))}
                    </div>
                    <ErrorRows />
                  </div>
                  <CodeBlock title="Public update object" language="json" code={jsonExample} />
                </div>
              </section>

              <section id="skill" className="scroll-mt-28">
                <div className="grid gap-8 xl:grid-cols-[0.82fr_1.18fr] xl:gap-10">
                  <SectionIntro
                    kicker="Agent skill"
                    title="Give agents an operating procedure, not just endpoints"
                    body="The skill is read-only guidance for changelog intelligence: when to use Version Watch, how to discover valid vendors and tags, how to filter updates, how to follow pagination, how to de-duplicate results, and how to cite official sources."
                  />
                  <CodeBlock
                    title="Version Watch skill"
                    language="bash"
                    code={`curl "${skillUrl}"`}
                  />
                  <CodeBlock title="Freshness status" language="bash" code={`curl "${statusUrl}"`} />
                </div>
              </section>

              <section id="build" className="scroll-mt-28">
                <SectionIntro
                  kicker="Build with Version Watch"
                  title="Use Version Watch as a read-only changelog data layer"
                  body="Developers can build their own dashboards, release intelligence portals, CI checks, digests, and internal bots on top of the public API. The API returns snapshots and provenance; your app owns storage, delivery, permissions, and any side effects."
                />
                <div className="mt-8 grid gap-4 xl:grid-cols-2">
                  <CodeBlock title="Sync into your own database" language="ts" code={syncExample} />
                  <CodeBlock title="Render a release dashboard" language="ts" code={dashboardExample} />
                  <Card>
                    <CardHeader>
                      <FileJson className="size-5 text-foreground" aria-hidden="true" />
                      <CardTitle>Attribution contract</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                      <p>
                        Use source_detail_url as the exact official vendor entry. Use source_surface_url to
                        show the tracked changelog, docs, RSS, or GitHub release surface that Version Watch monitors.
                      </p>
                      <p>
                        Use version_watch_url when you want to link back to the normalized Version Watch record.
                        Store update ids to prevent duplicate digests, alerts, or dashboard rows.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <ShieldCheck className="size-5 text-foreground" aria-hidden="true" />
                      <CardTitle>Read-only boundary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                      <p>
                        Version Watch does not post to external tools for users today. It gives developers the
                        data contract to build their own workers, bots, and internal products safely.
                      </p>
                      <p>
                        Check /api/v1/status before release gates or high-confidence summaries, and show degraded
                        or stale status when coverage may be incomplete.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section id="integrations" className="scroll-mt-28">
                <SectionIntro
                  kicker="Integrations"
                  title="Connect it anywhere that can make an HTTP request"
                  body="Because the API is public HTTP, any platform that can make a GET request can consume it. Public self-serve watchlists come later; today, developers can poll filtered routes from scheduled workers, automation tools, bots, internal apps, and agent runtimes."
                />
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {INTEGRATIONS.map((item) => (
                    <DocsCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
                  ))}
                </div>
                <div className="mt-8 grid gap-4 xl:grid-cols-2">
                  <CodeBlock title="Latest updates" language="bash" code={`curl "${latestUrl}"`} />
                  <CodeBlock title="Discord webhook worker" language="ts" code={discordExample} />
                  <CodeBlock title="Slack incoming webhook" language="ts" code={slackExample} />
                  <CodeBlock title="Structured relevance signal" language="ts" code={relevanceExample} />
                  <Card>
                    <CardHeader>
                      <ShieldCheck className="size-5 text-foreground" aria-hidden="true" />
                      <CardTitle>Recommended polling pattern</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                      <p>
                        If you build a bot or worker, poll every 15 to 60 minutes, store the last update
                        id or timestamp, then deliver only new matching records. Start with high or
                        critical severity and add vendor, audience, or tag filters before widening the feed.
                      </p>
                      <p>
                        Check /api/v1/status before high-confidence agent reports or release gates.
                        Treat degraded or stale status as a signal to mention possible incomplete coverage.
                      </p>
                      <p>
                        For vendor-specific workflows, call /api/v1/status/vendors/[slug] to see freshness
                        tier, next due time, backoff state, and whether a background refresh is queued.
                      </p>
                      <p>
                        Follow next_cursor as an opaque value when a response contains more matching
                        records. Do not decode it, and do not build offset assumptions around it.
                      </p>
                      <p>
                        For Discord and Slack, format the message around vendor, title, summary,
                        recommended action, source_detail_url, and the Version Watch URL.
                      </p>
                      <p>
                        For broader integrations, store update ids after delivery and route by
                        vendor, severity, audience, or tag.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section id="coverage" className="scroll-mt-28">
                <SectionIntro
                  kicker="Platform coverage"
                  title="Use one API across the platforms your stack depends on"
                  body={`Version Watch currently exposes ${vendors.length} vendor records. The public vendor route lists source names, source URLs, and source types; use /api/v1/status for freshness and coverage health before relying on operational completeness.`}
                />
                <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {featuredVendors.map((vendor) => (
                    <Link
                      key={vendor.slug}
                      href={`/vendors/${vendor.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-[var(--border-strong)] hover:bg-muted/45"
                    >
                      <VendorMark vendorSlug={vendor.slug} vendorName={vendor.name} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{vendor.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {vendor.sources.length} source {vendor.sources.length === 1 ? "surface" : "surfaces"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-5">
                  <Button asChild variant="outline">
                    <Link href="/api/v1/vendors">
                      Open vendor API
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </section>

              <section id="roadmap" className="scroll-mt-28">
                <div className="grid gap-6 rounded-xl border border-border bg-card p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <CircleCheck className="size-5 text-foreground" aria-hidden="true" />
                      <p className="vw-kicker">What is next</p>
                    </div>
                    <h2 className="vw-title text-balance text-2xl md:text-3xl">
                      The API, Markdown feeds, signal v2, and structured feedback are live.
                    </h2>
                    <p className="vw-copy max-w-3xl text-base">
                      The next product step is self-serve watchlists, public webhook configuration,
                      RSS, email, and MCP once the freshness and signal foundations keep proving reliable.
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href="/agents.md">
                      Read agents.md
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
