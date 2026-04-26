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
  Webhook,
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
  { href: "#integrations", label: "Integrations" },
  { href: "#coverage", label: "Platform coverage" },
  { href: "#roadmap", label: "What is next" },
] as const;

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/updates",
    title: "List updates",
    description: "Latest platform changes with severity, audience, tags, source URLs, and recommended actions.",
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
    behavior: "Matches categories or affected stack tags.",
  },
  {
    name: "limit",
    example: "25",
    behavior: "Defaults to 25 and clamps at 100.",
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
    body: "Use severity, signal score, audience, and stack tags to route only the updates that matter.",
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
    status: "Next",
    body: "Would let tools like Zapier, GPT Actions, and generated SDKs understand the API contract.",
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
    body: "Post high-signal updates into Discord, Slack, Microsoft Teams, Telegram, or community channels.",
  },
  {
    icon: Bot,
    title: "Agents and IDEs",
    body: "Give Cursor, Codex-style agents, Claude workflows, custom copilots, and internal agents current platform context.",
  },
  {
    icon: BellRing,
    title: "Automation platforms",
    body: "Use Pipedream, Zapier, Make, n8n, Vercel Cron, Cloudflare Workers, or scheduled jobs to poll and route updates.",
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
  "audience",
  "tags",
  "summary",
  "why_it_matters",
  "recommended_action",
  "source_url",
  "github_url",
  "version_watch_url",
] as const;

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

  const jsonExample = `{
  "id": "openclaw-2026-04-25-openclaw-2026-4-24",
  "vendor": "OpenClaw",
  "vendor_slug": "openclaw",
  "title": "openclaw 2026.4.24",
  "published_at": "2026-04-25T19:39:08.000Z",
  "severity": "high",
  "signal_score": 58,
  "audience": ["backend", "ai"],
  "tags": ["api", "agents", "developer-workflow"],
  "summary": "One-sentence explanation of what changed.",
  "why_it_matters": "Clear operational impact for affected teams.",
  "recommended_action": "Review affected integration paths before upgrading.",
  "source_url": "https://...",
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
        update.version_watch_url
      )
      .join("\\n\\n"),
  }),
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
                  body="The API is a read-only change intelligence layer. It does not replace vendor sources. It gives tools and agents a consistent way to discover what changed, who is affected, how urgent it is, what action should happen next, and where the official source lives."
                />
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {CAPABILITIES.map((item) => (
                    <DocsCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
                  ))}
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
                      body="The important field is recommended_action. Agents should use it as an action hint, then link back to the official source when details matter."
                    />
                    <div className="flex flex-wrap gap-2">
                      {RESPONSE_FIELDS.map((field) => (
                        <Badge key={field} variant="outline" className="font-mono">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <CodeBlock title="Public update object" language="json" code={jsonExample} />
                </div>
              </section>

              <section id="integrations" className="scroll-mt-28">
                <SectionIntro
                  kicker="Integrations"
                  title="Connect it anywhere that can make an HTTP request"
                  body="Because the API is public HTTP, any platform that can make a GET request can consume it. Native watchlists and push notifications come later; today, developers can poll filtered routes from scheduled workers, automation tools, bots, internal apps, and agent runtimes."
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
                  <Card>
                    <CardHeader>
                      <ShieldCheck className="size-5 text-foreground" aria-hidden="true" />
                      <CardTitle>Recommended polling pattern</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                      <p>
                        Poll every 15 to 60 minutes, store the last update id or timestamp, then post
                        only new matching records. Start with high or critical severity and add vendor,
                        audience, or tag filters before widening the feed.
                      </p>
                      <p>
                        For Discord and Slack, format the message around vendor, title, summary,
                        recommended action, and the Version Watch URL.
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
                  body={`Version Watch currently tracks ${vendors.length} vendor surfaces. The public vendor route exposes the full list, source names, source URLs, and source types.`}
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
                      The API and Markdown feeds are live. Filtered notifications are the next layer.
                    </h2>
                    <p className="vw-copy max-w-3xl text-base">
                      The next product step is native watchlists and generic webhook delivery, then
                      Discord, Slack, Teams, email, RSS, OpenAPI, community relevance signals, and MCP
                      once the public API proves useful.
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
