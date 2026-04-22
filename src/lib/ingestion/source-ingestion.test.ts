import { describe, expect, it } from "vitest";

import {
  discoverFeedUrl,
  normalizeParsedEntry,
  parseHtmlEntries,
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
});

describe("parseHtmlEntries", () => {
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
