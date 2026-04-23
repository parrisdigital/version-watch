import { describe, expect, it } from "vitest";

import {
  discoverFeedUrl,
  normalizeParsedEntry,
  parseHtmlEntries,
  parsePostHogPageData,
} from "@/lib/ingestion/source-ingestion";

describe("discoverFeedUrl", () => {
  it("resolves relative RSS links against the source URL", () => {
    const html = `
      <html>
        <body>
          <a href="/changelog/rss.xml">Subscribe to RSS</a>
        </body>
      </html>
    `;

    expect(discoverFeedUrl(html, "https://clerk.com/changelog")).toBe(
      "https://clerk.com/changelog/rss.xml",
    );
  });

  it("discovers GitHub release atom feeds from alternate links", () => {
    const html = `
      <html>
        <head>
          <link
            rel="alternate"
            type="application/atom+xml"
            title="ui Release Notes"
            href="https://github.com/shadcn-ui/ui/releases.atom"
          />
        </head>
      </html>
    `;

    expect(discoverFeedUrl(html, "https://github.com/shadcn-ui/ui/releases")).toBe(
      "https://github.com/shadcn-ui/ui/releases.atom",
    );
  });
});

describe("parseHtmlEntries", () => {
  it("parses PostHog Gatsby page-data changelog nodes", () => {
    const pageData = JSON.stringify({
      result: {
        data: {
          allRoadmap: {
            nodes: [
              {
                date: "2026-04-21",
                title: "Multiple Slack channels for support ticket creation",
                description: "Support ticket creation can now fan out to more than one Slack channel.",
                cta: { url: "https://github.com/PostHog/posthog/pull/54970" },
                githubUrls: ["https://github.com/PostHog/posthog/pull/54970"],
              },
              {
                date: "2026-04-17",
                title: "Weekly email digest for Web Analytics",
                description: "Web Analytics can now send a weekly digest so teams can track changes without opening dashboards.",
                cta: { url: "https://posthog.com/blog/weekly-email-digest-for-web-analytics" },
                githubUrls: ["https://github.com/PostHog/posthog/pull/52785"],
              },
            ],
          },
        },
      },
    });

    const entries = parsePostHogPageData("https://posthog.com/changelog", pageData);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      title: "Multiple Slack channels for support ticket creation",
      url: "https://posthog.com/changelog",
      githubUrl: "https://github.com/PostHog/posthog/pull/54970",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-21T00:00:00.000Z"));
    expect(entries[1]).toMatchObject({
      title: "Weekly email digest for Web Analytics",
      url: "https://posthog.com/blog/weekly-email-digest-for-web-analytics",
    });
  });

  it("parses date-plus-heading changelog blocks", () => {
    const html = `
      <main>
        <p>Apr 17, 2026</p>
        <h2><a href="/changelog/2026-04-17-api-keys-ga">API Keys General Availability</a></h2>
        <p>API keys are now generally available, with usage-based billing now active.</p>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "clerk:changelog_page",
      sourceUrl: "https://clerk.com/changelog",
      html,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "API Keys General Availability",
      url: "https://clerk.com/changelog/2026-04-17-api-keys-ga",
      excerpt: "API keys are now generally available, with usage-based billing now active.",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-17T00:00:00.000Z"));
  });

  it("parses OpenAI-style dated timeline entries without dedicated headings", () => {
    const html = `
      <main>
        <h3>May, 2025</h3>
        <p>May 20</p>
        <p>Feature</p>
        <p>v1/responses</p>
        <p>Added support for new built-in tools in the Responses API, including remote MCP servers and code interpreter.</p>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "openai:docs_page",
      sourceUrl: "https://developers.openai.com/api/docs/changelog",
      html,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "Added support for new built-in tools in the Responses API, including remote MCP servers and code interpreter.",
      url: "https://developers.openai.com/api/docs/changelog",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2025-05-20T00:00:00.000Z"));
  });

  it("parses Anthropic Help Center release-note sections", () => {
    const html = `
      <main>
        <h1>Release notes</h1>
        <h2>April 2026</h2>
        <h3>April 17, 2026</h3>
        <p>Claude Design by Anthropic Labs</p>
        <p>With Opus 4.7, we also launched Claude Design. <a href="https://www.anthropic.com/news/introducing-anthropic-labs">Anthropic Labs</a></p>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "anthropic:changelog_page",
      sourceUrl: "https://support.claude.com/en/articles/12138966-release-notes",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "Claude Design by Anthropic Labs",
      url: "https://www.anthropic.com/news/introducing-anthropic-labs",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-17T00:00:00.000Z"));
  });

  it("parses Anthropic Platform markdown into concise titles", () => {
    const markdown = `
      # Claude Platform
      ### April 20, 2026
      * We've retired the Claude Haiku 3 model (\`claude-3-haiku-20240307\`). All requests to this model will now return an error. We recommend upgrading to [Claude Haiku 4.5](/docs/en/about-claude/models/overview#latest-models-comparison).
      ### April 16, 2026
      * We've launched [Claude Opus 4.7](https://www.anthropic.com/news/claude-opus-4-7), our most capable generally available model for complex reasoning and agentic coding.
    `;

    const entries = parseHtmlEntries({
      parserKey: "anthropic:docs_page",
      sourceUrl: "https://platform.claude.com/docs/en/release-notes/overview",
      html: markdown,
    });

    expect(entries[0]).toMatchObject({
      title: "Claude Haiku 3 retired from the Claude API",
      url: "https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-20T00:00:00.000Z"));
    expect(entries[1]).toMatchObject({
      title: "Claude Opus 4.7 generally available",
      url: "https://www.anthropic.com/news/claude-opus-4-7",
    });
  });

  it("parses markdown changelog tables from Stripe", () => {
    const markdown = `
      # Changelog
      ## 2026-03-25.dahlia
      | Title | Affected Products | Breaking change? | Category |
      | --- | --- | --- | --- |
      | [Adds support for async flows](https://docs.stripe.com/changelog/dahlia/2026-03-25/async-flows.md) | Checkout | Non-breaking | api |
    `;

    const entries = parseHtmlEntries({
      parserKey: "stripe:changelog_page",
      sourceUrl: "https://docs.stripe.com/changelog",
      html: markdown,
    });

    expect(entries[0]).toMatchObject({
      title: "Adds support for async flows",
      url: "https://docs.stripe.com/changelog/dahlia/2026-03-25/async-flows",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-03-25T00:00:00.000Z"));
  });

  it("parses Docker Desktop markdown release entries", () => {
    const markdown = `
      # Docker Desktop release notes
      ## 4.70.0 <em>2026-04-20</em>
      ### New
      - Added a CLI hint that surfaces the Logs view.
    `;

    const entries = parseHtmlEntries({
      parserKey: "docker:docs_page",
      sourceUrl: "https://docs.docker.com/desktop/release-notes/",
      html: markdown,
    });

    expect(entries[0]).toMatchObject({
      title: "Docker Desktop 4.70.0",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-20T00:00:00.000Z"));
  });

  it("parses Cursor article-grid changelog entries", () => {
    const html = `
      <main>
        <article>
          <div>
            <div>
              <a href="/changelog/04-15-26">
                <time dateTime="2026-04-15T00:00:00.000Z">Apr 15, 2026</time>
              </a>
            </div>
            <div>
              <h1><a href="/changelog/04-15-26">Canvases</a></h1>
              <div class="prose">
                <p>Cursor can now respond by creating interactive canvases.</p>
                <p>These visualizations can include dashboards and custom interfaces.</p>
              </div>
            </div>
          </div>
        </article>
        <article>
          <div>
            <div>
              <a href="/changelog/04-14-26">
                <time dateTime="2026-04-14T00:00:00.000Z">Apr 14, 2026</time>
              </a>
            </div>
            <div>
              <h1><a href="/changelog/04-14-26">CLI Debug Mode and /btw Support</a></h1>
              <div class="prose">
                <p>We've shipped quality-of-life improvements to the Cursor CLI.</p>
              </div>
            </div>
          </div>
        </article>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "cursor:changelog_page",
      sourceUrl: "https://cursor.com/changelog",
      html,
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      title: "Canvases",
      url: "https://cursor.com/changelog/04-15-26",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-15T00:00:00.000Z"));
    expect(entries[1]).toMatchObject({
      title: "CLI Debug Mode and /btw Support",
      url: "https://cursor.com/changelog/04-14-26",
    });
    expect(entries[1]?.publishedAt).toBe(Date.parse("2026-04-14T00:00:00.000Z"));
  });

  it("parses Railway markdown changelog entries", () => {
    const markdown = `
      # Railway Changelog
      ## Remote MCP, Railway Agent in the CLI, one-command skills install
      - Date: 2026-04-17
      - Link: https://railway.com/changelog/2026-04-17-remote-mcp
      - Markdown: https://railway.com/changelog/2026-04-17-remote-mcp.md
      ## Skip rebuilds, Guardrails, better CLI
      - Date: 2026-04-03
      - Link: https://railway.com/changelog/2026-04-03-skip-rebuilds
    `;

    const entries = parseHtmlEntries({
      parserKey: "railway:changelog_page",
      sourceUrl: "https://railway.com/changelog",
      html: markdown,
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      title: "Remote MCP, Railway Agent in the CLI, one-command skills install",
      url: "https://railway.com/changelog/2026-04-17-remote-mcp",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-17T00:00:00.000Z"));
  });

  it("parses Prisma changelog cards with embedded date metadata", () => {
    const html = `
      <main>
        <a href="/changelog/2026-04-07">
          <div class="eyebrow">v7.7.0Prisma ORMApril 7, 2026</div>
          <h2>Prisma ORM v7.7.0: the new prisma bootstrap command</h2>
          <p>Prisma ORM v7.7.0 introduces a new prisma bootstrap command that sequences the full Prisma Postgres setup.</p>
        </a>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "prisma:changelog_page",
      sourceUrl: "https://www.prisma.io/changelog",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "Prisma ORM v7.7.0: the new prisma bootstrap command",
      url: "https://www.prisma.io/changelog/2026-04-07",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-07T00:00:00.000Z"));
  });

  it("parses Expo changelog timeline articles", () => {
    const html = `
      <main>
        <article>
          <div>
            <time datetime="2026-03-04T16:30:00.000Z">March 4, 2026</time>
            <a href="/changelog/introducing-expo-observe">/ Read more -></a>
          </div>
          <a href="/changelog/introducing-expo-observe">
            <h2>Introducing Expo Observe (Private Preview)</h2>
          </a>
          <p>We are building Expo Observe, a new way to understand how your app performs in the real world.</p>
        </article>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "expo:changelog_page",
      sourceUrl: "https://expo.dev/changelog",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "Introducing Expo Observe (Private Preview)",
      url: "https://expo.dev/changelog/introducing-expo-observe",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-03-04T00:00:00.000Z"));
  });

  it("parses Sentry changelog cards", () => {
    const html = `
      <main>
        <a href="/changelog/monitors--alerts-are-in-early-access/">
          <article>
            <h3>Monitors & Alerts are in Early Access</h3>
            <div class="prose">
              <p>Sentry Alerts is splitting into two features to give teams more control over what they track.</p>
            </div>
            <time datetime="April 20, 2026">April 20, 2026</time>
          </article>
        </a>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "sentry:changelog_page",
      sourceUrl: "https://sentry.io/changelog/",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "Monitors & Alerts are in Early Access",
      url: "https://sentry.io/changelog/monitors--alerts-are-in-early-access/",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-20T00:00:00.000Z"));
  });

  it("parses Neon markdown changelog entries grouped under a release date", () => {
    const markdown = `
      # Changelog
      ## Entries
      ### 2026-04-17
      ## Neon plugin for OpenAI Codex
      The Neon Postgres plugin is now available in the OpenAI Codex plugin directory.
      ## Snapshot API responses include storage size fields
      Snapshot responses now expose full_size and diff_size fields.
      ### 2026-04-10
      ## Neon Auth Plugins tab
      You can now manage authentication plugins from a dedicated tab.
    `;

    const entries = parseHtmlEntries({
      parserKey: "neon:changelog_page",
      sourceUrl: "https://neon.com/docs/changelog",
      html: markdown,
    });

    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({
      title: "Neon plugin for OpenAI Codex",
      url: "https://neon.com/docs/changelog",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-17T00:00:00.000Z"));
    expect(entries[1]).toMatchObject({
      title: "Snapshot API responses include storage size fields",
    });
  });

  it("parses Better Auth release sections from the official changelog page", () => {
    const html = `
      <div class="flex items-baseline mb-4">
        <a href="https://github.com/better-auth/better-auth/releases/tag/v1.6.8">v1.6.8</a>
        <time>Apr 23, 2026</time>
      </div>
      <div>
        <div class="changelog-content">
          <ul>
            <li>Fixed mapProfileToUser fallback for OAuth providers that omit email from their profile response.</li>
          </ul>
        </div>
      </div>
    `;

    const entries = parseHtmlEntries({
      parserKey: "better-auth:changelog_page",
      sourceUrl: "https://better-auth.com/changelog",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "Better Auth v1.6.8",
      url: "https://github.com/better-auth/better-auth/releases/tag/v1.6.8",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-23T00:00:00.000Z"));
  });
});

describe("normalizeParsedEntry", () => {
  it("keeps the official title and derives structured metadata", () => {
    const normalized = normalizeParsedEntry({
      vendorSlug: "stripe",
      vendorName: "Stripe",
      sourceName: "Stripe Changelog",
      sourceType: "changelog_page",
      entry: {
        title:
          "Updates computation of subscription schedule phase end date to consider billing cycle anchor changes",
        url: "https://docs.stripe.com/changelog/clover/2025-09-30/billing-cycle-anchor-resets-during-phase-computation",
        excerpt:
          "When a subscription schedule phase omits an explicit end date, Stripe now factors billing_cycle_anchor changes into the computed end_date.",
        publishedAt: Date.parse("2025-09-30T00:00:00.000Z"),
      },
    });

    expect(normalized.title).toBe(
      "Updates computation of subscription schedule phase end date to consider billing cycle anchor changes",
    );
    expect(normalized.categories).toEqual(expect.arrayContaining(["breaking", "api"]));
    expect(normalized.affectedStack).toEqual(expect.arrayContaining(["payments", "subscriptions"]));
    expect(normalized.importanceBand).toBe("critical");
    expect(normalized.summary).toContain("billing_cycle_anchor");
  });
});
