import { describe, expect, it } from "vitest";

import {
  discoverAntigravityBundleUrl,
  discoverFeedUrl,
  discoverWarpChangelogYearUrl,
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

  it("discovers Antigravity's official app bundle from the changelog shell", () => {
    const html = '<script src="main-5LR4F4TY.js" type="module"></script>';

    expect(discoverAntigravityBundleUrl(html, "https://antigravity.google/changelog")).toBe(
      "https://antigravity.google/main-5LR4F4TY.js",
    );
  });

  it("discovers Warp's active yearly changelog from the index", () => {
    const html = `
      <main>
        <a href="/changelog/2026/">2026</a>
        <a href="/changelog/2025/">2025</a>
      </main>
    `;

    expect(
      discoverWarpChangelogYearUrl(
        html,
        "https://docs.warp.dev/changelog",
        new Date("2026-05-07T00:00:00Z"),
      ),
    ).toBe("https://docs.warp.dev/changelog/2026/");
  });

  it("falls back to Warp's newest non-future yearly changelog", () => {
    const html = `
      <main>
        <a href="/changelog/2025/">2025</a>
        <a href="/changelog/2024/">2024</a>
      </main>
    `;

    expect(
      discoverWarpChangelogYearUrl(
        html,
        "https://docs.warp.dev/changelog",
        new Date("2026-01-01T00:00:00Z"),
      ),
    ).toBe("https://docs.warp.dev/changelog/2025/");
  });
});

describe("parseHtmlEntries", () => {
  it("parses Tabnine Markdown release notes with version headings and following dates", () => {
    const entries = parseHtmlEntries({
      parserKey: "tabnine:docs_page",
      sourceUrl: "https://docs.tabnine.com/main/administering-tabnine/release-notes.md",
      html: `
# Release Notes

### v6.2.4 <a href="#v6.2.4" id="v6.2.4"></a>

<mark style="color:$primary;">Jun 2, 2026</mark>

#### Bug Fixes

* **Agent:** Fixed node server headers that prevented Chat and IDE Agent from starting.

### v6.2.3

May 28, 2026

#### Features & Improvements

* **Agent:** Fixed image uploading for OpenAI-compatible self-managed models.
`,
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      title: "Tabnine v6.2.4",
      url: "https://docs.tabnine.com/main/administering-tabnine/release-notes#v6.2.4",
      publishedAt: Date.parse("2026-06-02T00:00:00.000Z"),
      parseConfidence: "high",
    });
  });

  it("parses Amazon Q Developer document-history rows", () => {
    const entries = parseHtmlEntries({
      parserKey: "amazon-q-developer:docs_page",
      sourceUrl: "https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/doc-history.html",
      html: `
<table>
  <tr><th>Change</th><th>Description</th><th>Date</th></tr>
  <tr>
    <td>Updated managed policies: AmazonQFullAccess and AmazonQDeveloperAccess</td>
    <td>Added permissions to enable Amazon Q artifacts preview.</td>
    <td>May 21, 2026</td>
  </tr>
</table>
`,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "Updated managed policies: AmazonQFullAccess and AmazonQDeveloperAccess",
      publishedAt: Date.parse("2026-05-21T00:00:00.000Z"),
      parseConfidence: "high",
    });
  });

  it("parses Amazon Q Developer Markdown document-history tables", () => {
    const entries = parseHtmlEntries({
      parserKey: "amazon-q-developer:docs_page",
      sourceUrl: "https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/doc-history.md",
      html: `
# Document history for Amazon Q Developer User Guide

| Change | Description | Date |
| --- |--- |--- |
| [Updated managed policies: AmazonQFullAccess and AmazonQDeveloperAccess](#doc-history) | Added \`q:CreateArtifact\` permissions to enable Amazon Q artifacts preview. | May 21, 2026 |
| [Updated Builder ID unsubscribe instructions](#doc-history) | Added guidance for unsubscribing a personal account when the Amazon Q Developer Profile has been deleted. | March 19, 2026 |
`,
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      title: "Updated managed policies: AmazonQFullAccess and AmazonQDeveloperAccess",
      url: "https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/doc-history.md#doc-history",
      publishedAt: Date.parse("2026-05-21T00:00:00.000Z"),
      parseConfidence: "high",
    });
  });

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

  it("parses Clerk Markdown changelog exports", () => {
    const markdown = `
      # Clerk Changelog

      # Prebuilt Organization components for iOS and Android
      URL: https://clerk.com/changelog/2026-06-05-ios-android-organization-management.md
      Date: 2026-06-05
      Category: SDK
      Description:

      Clerk's native mobile SDKs now include prebuilt Organization management UI for iOS and Android.

      ---

      # Email Logs public beta
      URL: https://clerk.com/changelog/2026-06-01-email-logs-public-beta.md
      Date: 2026-06-01
      Category: Product
      Description: Inspect transactional email delivery events from the Clerk Dashboard.
    `;

    const entries = parseHtmlEntries({
      parserKey: "clerk:changelog_page",
      sourceUrl: "https://clerk.com/changelog.md",
      html: markdown,
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      title: "Prebuilt Organization components for iOS and Android",
      url: "https://clerk.com/changelog/2026-06-05-ios-android-organization-management",
      excerpt: "Clerk's native mobile SDKs now include prebuilt Organization management UI for iOS and Android.",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-06-05T00:00:00.000Z"));
    expect(entries[1]).toMatchObject({
      title: "Email Logs public beta",
      url: "https://clerk.com/changelog/2026-06-01-email-logs-public-beta",
    });
  });

  it("parses xAI month-grouped release notes", () => {
    const html = `
      <main>
        <h1>April 2026</h1>
        <div>Apr 15</div>
        <h3>Speech to Text is available</h3>
        <p>The xAI API now supports speech-to-text transcription.</p>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "xai:docs_page",
      sourceUrl: "https://docs.x.ai/developers/release-notes",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "Speech to Text is available",
      excerpt: "The xAI API now supports speech-to-text transcription.",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-15T00:00:00.000Z"));
  });

  it("parses xAI yearless month sections with day-specific release notes", () => {
    const html = `
      <main>
        <h1>Release Notes</h1>
        <h2>May</h2>
        <div class="entry">
          <div>May 29</div>
          <div>
            <span><h3 id="smart-turn-for-streaming-stt">Smart Turn for Streaming STT</h3></span>
            <p>The streaming Speech to Text API now supports Smart Turn end-of-turn detection.</p>
            <span><h3 id="context-compaction">Context Compaction</h3></span>
            <p>The Context Compaction API is now available.</p>
          </div>
        </div>
        <div>May 27</div>
        <h3 id="image-search-in-web-search">Image Search in Web Search</h3>
        <p>Web Search now supports explicitly searching for images.</p>
        <div>May 19</div>
        <h3 id="grok-build-01">Grok Build 0.1</h3>
        <p>xAI's fast coding model trained specifically for agentic coding, currently in early access.</p>
        <div>May 14</div>
        <h3 id="grok-build">Grok Build</h3>
        <p>Grok Build is now available in beta.</p>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "xai:docs_page",
      sourceUrl: "https://docs.x.ai/developers/release-notes",
      html,
    });
    const mayYear = new Date().getUTCMonth() >= 4 ? new Date().getUTCFullYear() : new Date().getUTCFullYear() - 1;

    expect(entries.map((entry) => entry.title)).toEqual([
      "Smart Turn for Streaming STT",
      "Context Compaction",
      "Image Search in Web Search",
      "Grok Build 0.1",
      "Grok Build",
    ]);
    expect(entries.map((entry) => new Date(entry.publishedAt).toISOString().slice(0, 10))).toEqual([
      `${mayYear}-05-29`,
      `${mayYear}-05-29`,
      `${mayYear}-05-27`,
      `${mayYear}-05-19`,
      `${mayYear}-05-14`,
    ]);
    expect(entries[1]?.excerpt).toBe("The Context Compaction API is now available.");
    expect(entries[3]?.url).toBe("https://docs.x.ai/developers/release-notes#grok-build-01");
    expect(entries[4]?.url).toBe("https://docs.x.ai/developers/release-notes#grok-build");
  });

  it("parses xAI Markdown release notes from the official docs file", () => {
    const markdown = `
      ===/overview===
      # Overview
      # April 2026
      ### Ignore this unrelated heading
      ===/developers/release-notes===
      #### Release Notes
      # Release Notes
      # April 2026
      ### Speech to Text is available
      The xAI Speech to Text API is now generally available.
      # March 2026
      ### Text-to-Speech is available
      The Text-to-Speech API is now generally available.
    `;

    const entries = parseHtmlEntries({
      parserKey: "xai:docs_page",
      sourceUrl: "https://docs.x.ai/llms.txt",
      html: markdown,
    });

    expect(entries.map((entry) => entry.title)).toEqual([
      "Speech to Text is available",
      "Text-to-Speech is available",
    ]);
    expect(entries[0]).toMatchObject({
      url: "https://docs.x.ai/developers/release-notes#speech-to-text-is-available",
      parseConfidence: "medium",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-01T00:00:00.000Z"));
  });

  it("parses Grok Build versioned changelog entries", () => {
    const html = `
      <main>
        <div>June 3, 2026</div>
        <h2 id="grok-build-0220">Grok Build 0.2.20</h2>
        <p>Improved apply patch handling and terminal reliability.</p>
        <div>May 29, 2026</div>
        <h2 id="grok-build-0219">Grok Build 0.2.19</h2>
        <p>Added better agent context handling for coding sessions.</p>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "grok-build:changelog_page",
      sourceUrl: "https://x.ai/build/changelog",
      html,
    });

    expect(entries.map((entry) => entry.title)).toEqual(["Grok Build 0.2.20", "Grok Build 0.2.19"]);
    expect(entries.map((entry) => new Date(entry.publishedAt).toISOString().slice(0, 10))).toEqual([
      "2026-06-03",
      "2026-05-29",
    ]);
    expect(entries[0]).toMatchObject({
      url: "https://x.ai/build/changelog#grok-build-0220",
      excerpt: "Improved apply patch handling and terminal reliability.",
      parseConfidence: "high",
    });
  });

  it("parses Grok Build markdown from the datacenter-safe changelog mirror", () => {
    const markdown = `
      Title: Grok Build Changelog
      URL Source: https://x.ai/build/changelog
      Markdown Content:
      August 3, 2026 Aug 3, 2026
      v 0.2.120
      ## Grok Build 0.2.120
      * Model picker updates the status bar immediately.
      * Background task completions consume less memory over ACP.
    `;

    const entries = parseHtmlEntries({
      parserKey: "grok-build:changelog_page",
      sourceUrl: "https://r.jina.ai/https://x.ai/build/changelog",
      html: markdown,
    });

    expect(entries[0]).toMatchObject({
      title: "Grok Build 0.2.120",
      url: "https://x.ai/build/changelog#0.2.120",
      parseConfidence: "high",
    });
    expect(entries[0]?.excerpt).toContain("Model picker updates");
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-08-03T00:00:00.000Z"));
  });

  it("parses Groq date-led changelog entries and cleans run-together verbs", () => {
    const html = `
      <main>
        <span>Dec 1, 2025</span>
        <h3>AddedMCP Connectors (Beta)</h3>
        <p>MCP Connectors provide a streamlined way to integrate with popular business applications.</p>
        <h3>ChangedPython SDK v0.33.0, TypeScript SDK v0.34.0</h3>
        <p>The SDKs include updated client behavior and examples.</p>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "groq:docs_page",
      sourceUrl: "https://console.groq.com/docs/changelog",
      html,
    });

    expect(entries.map((entry) => entry.title)).toEqual([
      "MCP Connectors (Beta)",
      "Python SDK v0.33.0, TypeScript SDK v0.34.0",
    ]);
    expect(entries[0]?.publishedAt).toBe(Date.parse("2025-12-01T00:00:00.000Z"));
  });

  it("parses Augment month-grouped changelog cards", () => {
    const html = `
      <main>
        <div>APRIL 2026</div>
        <div>Apr 23</div>
        <h2><a href="/changelog/intent-0-3-6-release-notes">Intent 0.3.6 Release Notes</a></h2>
        <p>Model picker no longer swaps your selected model when a provider is slow to load.</p>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "augment-code:changelog_page",
      sourceUrl: "https://www.augmentcode.com/changelog",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "Intent 0.3.6 Release Notes",
      url: "https://www.augmentcode.com/changelog/intent-0-3-6-release-notes",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-23T00:00:00.000Z"));
  });

  it("parses Replit Agent markdown update headings from the current update page", () => {
    const markdown = `
      # June 5, 2026

      ## Agent

      ### Improve your search ranking with SEO Agent

      SEO Agent reviews your published app and finds the issues that keep search engines and AI tools from discovering it.

      ## Billing

      ### Use Stripe in collaborative workspaces

      Stripe now works in collaborative workspaces, so your whole team can build, test, and monetize the same app together.
    `;

    const entries = parseHtmlEntries({
      parserKey: "replit-agent:changelog_page",
      sourceUrl: "https://docs.replit.com/updates",
      html: markdown,
    });

    expect(entries.map((entry) => entry.title)).toEqual([
      "Improve your search ranking with SEO Agent",
      "Use Stripe in collaborative workspaces",
    ]);
    expect(entries[0]).toMatchObject({
      url: "https://docs.replit.com/updates#improve-your-search-ranking-with-seo-agent",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-06-05T00:00:00.000Z"));
  });

  it("parses Mistral changelog entries from server-rendered timeline blocks", () => {
    const html = `
      <main>
        <div id="date-2026-05-28" data-changelog-entry="true">
          <h2>May 28</h2>
          <div class="changelog-content">
            <ul>
              <li>We launched Vibe, our unified agent at chat.mistral.ai, available in three modes: OTHER</li>
            </ul>
          </div>
        </div>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "mistral-ai:docs_page",
      sourceUrl: "https://docs.mistral.ai/resources/changelogs",
      html,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "We launched Vibe, our unified agent at chat.mistral.ai, available in three modes:",
      url: "https://docs.mistral.ai/resources/changelogs#date-2026-05-28",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-05-28T00:00:00.000Z"));
  });

  it("parses Figma REST API dated changelog sections", () => {
    const html = `
      <article>
        <div class="theme-doc-markdown">
          <h2 id="2026-03-25">March 25, 2026</h2>
          <p>Added an oEmbed API to retrieve oEmbed data for Figma files and published Makes.</p>
          <h2 id="2026-01-26">January 26, 2026</h2>
          <ul>
            <li>Added complexStrokeProperties to all supported node types.</li>
          </ul>
        </div>
      </article>
    `;

    const entries = parseHtmlEntries({
      parserKey: "figma:docs_page",
      sourceUrl: "https://developers.figma.com/docs/rest-api/changelog/",
      html,
    });

    expect(entries.map((entry) => entry.title)).toEqual([
      "Added an oEmbed API to retrieve oEmbed data for Figma files and published Makes.",
      "Added complexStrokeProperties to all supported node types.",
    ]);
    expect(entries[0]).toMatchObject({
      url: "https://developers.figma.com/docs/rest-api/changelog/#2026-03-25",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-03-25T00:00:00.000Z"));
  });

  it("parses Convex Ship changelog cards from the production HTML", () => {
    const html = `
      <main>
        <a href="/changelog/item-356-fine-grained-query-invalidation">
          <span>Improvement</span><span>Jun 6, 2026</span>
          <h3><span>#<!-- -->356</span>Fine-grained query invalidation</h3>
          <p>The Convex cloud now avoids invalidating all queries on code push.</p>
        </a>
        <a href="/changelog/convex-1-40-0">
          <span>Release</span><span>Jun 2, 2026</span>
          <h3>convex v1.40.0</h3>
          <p>You can now create a local deployment in a specific Convex cloud project.</p>
        </a>
        <a href="/requests/js716zvxmz2v2c4z8vx0p1vqbh84x8j3">
          <span>Estimated: Jun 2026</span>
          <h3>Scoped authorization tokens to prevent agent risk</h3>
        </a>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "convex:changelog_page",
      sourceUrl: "https://ship.convex.dev/",
      html,
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      title: "Fine-grained query invalidation",
      url: "https://ship.convex.dev/changelog/item-356-fine-grained-query-invalidation",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-06-06T00:00:00.000Z"));
    expect(entries[1]).toMatchObject({
      title: "convex v1.40.0",
      url: "https://ship.convex.dev/changelog/convex-1-40-0",
    });
  });

  it("parses shadcnspace timeline entries with concatenated version and day text", () => {
    const html = `
      <main>
        <div class="relative flex flex-col gap-4 md:flex-row md:items-start">
          <div>Version 2.1.528 April 2026</div>
          <div>
            <h2>UI Blocks & Components Expansion</h2>
            <div>Added 30+ new blocks and 30+ new components across the collection.</div>
          </div>
        </div>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "shadcnspace:changelog_page",
      sourceUrl: "https://shadcnspace.com/changelog",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "shadcnspace 2.1.5: UI Blocks & Components Expansion",
      url: "https://shadcnspace.com/changelog#version-2-1-5",
      excerpt: "Added 30+ new blocks and 30+ new components across the collection.",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-28T00:00:00.000Z"));
  });

  it("parses shadcnspace timeline entries with spaced version and day text", () => {
    const html = `
      <main>
        <div class="relative flex flex-col gap-4 md:flex-row md:items-start">
          <div>Version 2.1.4 14 April 2026</div>
          <div>
            <h2>UI Blocks, UI Components & Added Template</h2>
            <div>Added 1 new template and more blocks across the collection.</div>
          </div>
        </div>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "shadcnspace:changelog_page",
      sourceUrl: "https://shadcnspace.com/changelog",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "shadcnspace 2.1.4: UI Blocks, UI Components & Added Template",
      url: "https://shadcnspace.com/changelog#version-2-1-4",
      excerpt: "Added 1 new template and more blocks across the collection.",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-14T00:00:00.000Z"));
  });

  it("parses Synara release entries from the former DP Code source", () => {
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthLabel = monthLabels[now.getUTCMonth()];
    const html = `
      <main>
        <div id="v0-1-3">
          <span>${monthLabel} 5</span>
          <h2>Synara 0.1.3</h2>
          <p>The chat side panel is clearer for busy sessions.</p>
        </div>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "dp-code:changelog_page",
      sourceUrl: "https://www.trysynara.com/changelog",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "Synara 0.1.3",
      url: "https://www.trysynara.com/changelog#v0-1-3",
      excerpt: "The chat side panel is clearer for busy sessions.",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 5));
  });

  it("parses Devin Desktop MDX changelog entries from the former Windsurf source", () => {
    const markdown = `
      # Changelog

      <Update label="v3.0.28" description="June 6, 2026">
        * Hardened migration from Windsurf on Windows to preserve shortcut icon.
        * Improved handling of file context in Devin Local agent

        <Accordion title="Download 3.0.28" defaultOpen>
          <Release darwinArm64="https://example.com/Devin-darwin-arm64-3.0.28.zip" />
        </Accordion>
      </Update>

      <Update label="v3.0.12" description="June 2, 2026">
        Windsurf is now [Devin Desktop](https://devin.ai/blog/windsurf-is-now-devin-desktop).
      </Update>
    `;

    const entries = parseHtmlEntries({
      parserKey: "windsurf:changelog_page",
      sourceUrl: "https://docs.devin.ai/desktop/changelog.md",
      html: markdown,
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      title: "Devin Desktop v3.0.28",
      url: "https://docs.devin.ai/desktop/changelog#v3-0-28",
      excerpt: "Hardened migration from Windsurf on Windows to preserve shortcut icon. Improved handling of file context in Devin Local agent",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-06-06T00:00:00.000Z"));
    expect(entries[1]).toMatchObject({
      title: "Devin Desktop v3.0.12",
      excerpt: "Windsurf is now Devin Desktop.",
    });
  });

  it("parses shadcn Studio CHANGELOG.md entries", () => {
    const markdown = `
      # Changelog

      ## v1.0.0 (2025-11-19)

      ### Added

      - Added blocks and registries for easier access to component variants.
    `;

    const entries = parseHtmlEntries({
      parserKey: "shadcn-studio:changelog_page",
      sourceUrl: "https://raw.githubusercontent.com/shadcnstudio/shadcn-studio/main/CHANGELOG.md",
      html: markdown,
    });

    expect(entries[0]).toMatchObject({
      title: "v1.0.0 (2025-11-19)",
      excerpt: "Added blocks and registries for easier access to component variants.",
      parseConfidence: "medium",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2025-11-19T00:00:00.000Z"));
  });

  it("parses shadcnblocks changelog cards without nested section headings", () => {
    const html = `
      <main>
        <a href="/changelog/page/2">Older entries</a>
        <div>
          <span>Released</span>
          <a href="/changelog/new-blocks-may-2026">New Blocks - May 2026</a>
          <time>May 30, 2026</time>
          <p>Added 111 new blocks across marketing and application sections.</p>
        </div>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "shadcnblocks:changelog_page",
      sourceUrl: "https://www.shadcnblocks.com/changelog",
      html,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "New Blocks - May 2026",
      url: "https://www.shadcnblocks.com/changelog/new-blocks-may-2026",
      excerpt: "Added 111 new blocks across marketing and application sections.",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-05-30T00:00:00.000Z"));
  });

  it("parses shadcnblocks Astro serialized changelog entries", () => {
    const props = JSON.stringify({
      entries: [
        1,
        [
          [
            0,
            {
              id: [0, "shadcn-admin-kit-v2.2.0"],
              data: [
                0,
                {
                  date: [0, "2026-06-01T00:00:00.000Z"],
                  title: [0, "Shadcn Admin Kit v2.2.0"],
                  type: [0, "Released"],
                },
              ],
              body: [0, "Shadcn Admin Kit **v2.2.0** adds project management and todo sections."],
              rendered: [
                0,
                {
                  html: [
                    0,
                    "&lt;p&gt;Shadcn Admin Kit &lt;strong&gt;v2.2.0&lt;/strong&gt; adds project management and todo sections.&lt;/p&gt;",
                  ],
                },
              ],
            },
          ],
        ],
      ],
    });
    const html = `
      <main>
        <astro-island component-export="Changelog" props='${props}'></astro-island>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "shadcnblocks:changelog_page",
      sourceUrl: "https://www.shadcnblocks.com/changelog",
      html,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "Shadcn Admin Kit v2.2.0",
      url: "https://www.shadcnblocks.com/changelog/shadcn-admin-kit-v2.2.0",
      excerpt: "Shadcn Admin Kit v2.2.0 adds project management and todo sections.",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-06-01T00:00:00.000Z"));
  });

  it("parses Warp version headings", () => {
    const html = `
      <main>
        <h2 id="id-2026.04.22-v0.2026.04.22.08.46">hashtag2026.04.22 (v0.2026.04.22.08.46)</h2>
        <p>Warp added new agent mode controls for terminal workflows.</p>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "warp:docs_page",
      sourceUrl: "https://docs.warp.dev/changelog",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "Warp 2026.04.22 (v0.2026.04.22.08.46)",
      url: "https://docs.warp.dev/changelog#id-2026.04.22-v0.2026.04.22.08.46",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-22T00:00:00.000Z"));
  });

  it("parses Warp changelog entries from the official llms-full feed", () => {
    const markdown = `
      # Getting started
      # Changelog
      ### 2026.04.22 (v0.2026.04.22.08.46)
      Warp added new agent mode controls for terminal workflows.
      ### 2026.04.15 (v0.2026.04.15.08.45)
      Warp fixed terminal launch behavior.
      # Other docs
    `;

    const entries = parseHtmlEntries({
      parserKey: "warp:docs_page",
      sourceUrl: "https://docs.warp.dev/llms-full.txt",
      html: markdown,
    });

    expect(entries[0]).toMatchObject({
      title: "Warp 2026.04.22 (v0.2026.04.22.08.46)",
      url: "https://docs.warp.dev/changelog#id-2026.04.22-v0.2026.04.22.08.46",
      parseConfidence: "high",
    });
    expect(entries).toHaveLength(2);
  });

  it("parses Warp changelog entries from GitBook markdown exports", () => {
    const markdown = `
      # Changelog

      ### 2026.04.22 (v0.2026.04.22.08.46)
      Warp added new agent mode controls for terminal workflows.
    `;

    const entries = parseHtmlEntries({
      parserKey: "warp:changelog_page",
      sourceUrl: "https://docs.warp.dev/changelog",
      html: markdown,
    });

    expect(entries[0]).toMatchObject({
      title: "Warp 2026.04.22 (v0.2026.04.22.08.46)",
      url: "https://docs.warp.dev/changelog#id-2026.04.22-v0.2026.04.22.08.46",
      parseConfidence: "high",
    });
  });

  it("parses Zed stable release text blocks", () => {
    const html = `
      <main>
        April 2026
        0.233.10Apr 24, 2026macOSLoading…WindowsLoading…LinuxLoading…
        Added support for GPT 5.5 in the assistant panel.
        0.232.7Apr 17, 2026macOSLoading…Fixed editor performance regressions.
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "zed:changelog_page",
      sourceUrl: "https://zed.dev/releases/stable",
      html,
    });

    expect(entries.map((entry) => entry.title)).toEqual(["Zed 0.233.10", "Zed 0.232.7"]);
    expect(entries[0]?.excerpt).toContain("Added support for GPT 5.5");
  });

  it("parses Antigravity changelog data from the official app bundle", () => {
    const html = `
      var u7={title:"Google Antigravity Changelog",sections:[
        {version:"1.23.2<br>Apr 16, 2026",description:"Bug Fixes",accordion:{changes:"<p>Fixed bug that prevented MCP servers from loading.</p>",items:[]}},
        {version:"1.22.2<br>Apr 7, 2026",description:"Agent Permissions",accordion:{changes:"<p>New unified <a href='/docs/agent-permissions'>permissions system</a> to control agent actions.</p>",items:[]}}
      ]};
    `;

    const entries = parseHtmlEntries({
      parserKey: "google-antigravity:changelog_page",
      sourceUrl: "https://antigravity.google/changelog",
      html,
    });

    expect(entries.map((entry) => entry.title)).toEqual([
      "Google Antigravity 1.23.2",
      "Google Antigravity 1.22.2",
    ]);
    expect(entries[0]).toMatchObject({
      url: "https://antigravity.google/changelog#1.23.2",
      excerpt: "Fixed bug that prevented MCP servers from loading.",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-16T00:00:00.000Z"));
  });

  it("parses Antigravity changelog rows from the rendered page", () => {
    const html = `
      <main>
        <div data-section-row>
          <div class="version" data-date-pin>
            <p><a class="version-link" href="/releases?tab=hub&amp;version=2.5.0">2.5.0</a><br>July 31, 2026</p>
          </div>
          <div class="description">
            <h3>Agent workflow improvements</h3>
            <div class="changes"><p>Added a faster planning workflow for complex tasks.</p></div>
            <div class="expandable-items"><ul><li>Improved startup reliability.</li></ul></div>
          </div>
        </div>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "google-antigravity:changelog_page",
      sourceUrl: "https://www.antigravity.google/changelog",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "Google Antigravity 2.5.0",
      url: "https://www.antigravity.google/releases?tab=hub&version=2.5.0",
      parseConfidence: "high",
    });
    expect(entries[0]?.excerpt).toContain("Added a faster planning workflow");
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-07-31T00:00:00.000Z"));
  });

  it("parses Dia article changelog entries", () => {
    const html = `
      <main>
        <article>
          <time datetime="2026-01-29">January 28, 2026</time>
          <h2><a href="/changelog/1-16-0">What's New in Dia 1.16.0</a></h2>
          <p>Dia added browser updates for research workflows.</p>
        </article>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "dia:changelog_page",
      sourceUrl: "https://www.diabrowser.com/changelog",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "What's New in Dia 1.16.0",
      url: "https://www.diabrowser.com/changelog/1-16-0",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-01-29T00:00:00.000Z"));
  });

  it("parses Brave release-note headings", () => {
    const html = `
      <main>
        <h2 id="release-notes-v1-89-143">Release Notes v1.89.143 (Apr 23, 2026)</h2>
        <p>Brave updated Leo and general browser behavior.</p>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "brave:changelog_page",
      sourceUrl: "https://brave.com/latest/",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "Brave 1.89.143 release notes",
      url: "https://brave.com/latest/#release-notes-v1-89-143",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-23T00:00:00.000Z"));
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

  it("parses OpenAI changelog cards by date instead of model snapshot strings", () => {
    const html = `
      <main>
        <div>
          <h1>Changelog</h1>
          <div>
            <h3>April, 2026</h3>
            <div>
              <div>
                <div data-variant="outline">Apr 21</div>
              </div>
              <div>
                <div data-variant="soft">Feature</div>
                <div data-variant="soft">gpt-image-2</div>
                <p>Released GPT Image 2, a state-of-the-art image generation model for image generation and editing.</p>
              </div>
            </div>
          </div>
          <div>
            <h3>March, 2025</h3>
            <div>
              <div>
                <div data-variant="outline">Mar 3</div>
              </div>
              <div>
                <div data-variant="soft">Feature</div>
                <div data-variant="soft">v1/fine_tuning/jobs</div>
                <p>Added metadata field support to fine-tuning jobs.</p>
              </div>
            </div>
          </div>
          <div>
            <h3>December, 2025</h3>
            <div>
              <div>
                <div data-variant="outline">Dec 15</div>
              </div>
              <div>
                <div data-variant="soft">Feature</div>
                <p>Released four new dated audio snapshots.</p>
                <ul>
                  <li>gpt-4o-mini-transcribe-2025-12-15</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "openai:docs_page",
      sourceUrl: "https://developers.openai.com/api/docs/changelog",
      html,
    });

    expect(entries.map((entry) => entry.title)).toEqual([
      "Released GPT Image 2, a state-of-the-art image generation model for image generation and editing.",
      "Released four new dated audio snapshots.",
      "Added metadata field support to fine-tuning jobs.",
    ]);
    expect(entries.map((entry) => new Date(entry.publishedAt).toISOString())).toEqual([
      "2026-04-21T00:00:00.000Z",
      "2025-12-15T00:00:00.000Z",
      "2025-03-03T00:00:00.000Z",
    ]);
  });

  it("parses the current OpenAI markdown changelog format", () => {
    const markdown = `
      # Changelog
      ## July, 2026
      ### Jul 30
      Update · Model: gpt-5.6-sol · API: v1/responses
      Starting July 30, GPT-5.6 Luna costs less for high-volume workloads.
      ### Jul 29
      Feature
      Released the official OpenAI Terraform provider for managing API Platform resources.
    `;

    const entries = parseHtmlEntries({
      parserKey: "openai:docs_page",
      sourceUrl: "https://developers.openai.com/api/docs/changelog",
      html: markdown,
    });

    expect(entries.map((entry) => entry.title)).toEqual([
      "Starting July 30, GPT-5.6 Luna costs less for high-volume workloads.",
      "Released the official OpenAI Terraform provider for managing API Platform resources.",
    ]);
    expect(entries[0]).toMatchObject({
      url: "https://developers.openai.com/api/docs/changelog#2026-07-30",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-07-30T00:00:00.000Z"));
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

  it("parses Stripe linked changelog cards without using ingestion time", () => {
    const html = `
      <main>
        <a href="/changelog/dahlia">Learn what's changing in Dahlia</a>
        <a href="/changelog/dahlia/2026-03-25/remove-legacy-stripejs-methods">
          <span>Removes deprecated Payment Intents, Setup Intents, and Sources methods from Stripe.js</span>
          <span>Payments</span>
        </a>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "stripe:changelog_page",
      sourceUrl: "https://docs.stripe.com/changelog",
      html,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "Removes deprecated Payment Intents, Setup Intents, and Sources methods from Stripe.js",
      url: "https://docs.stripe.com/changelog/dahlia/2026-03-25/remove-legacy-stripejs-methods",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-03-25T00:00:00.000Z"));
  });

  it("keeps Exa deprecation notices anchored to their notice date", () => {
    const html = `
      <main>
        <h1>API Deprecation Notice</h1>
        <p>Date: April 1, 2026 We're retiring a few legacy fields before May 1, 2026.</p>
        <h2>\u200BWhat's Changing</h2>
        <p>/research endpoint sunsets on May 1.</p>
        <h2>Timeline</h2>
        <ol>
          <li>April 1 — This notice</li>
          <li>May 1 — Hard removal.</li>
        </ol>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "exa:docs_page",
      sourceUrl: "https://exa.ai/docs/changelog/may-2026-api-deprecations",
      html,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "API Deprecation Notice",
      url: "https://exa.ai/docs/changelog/may-2026-api-deprecations",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-01T00:00:00.000Z"));
  });

  it("parses Exa monthly MDX changelog updates", () => {
    const markdown = `
      # Changelog
      <Update
        label="July 2026"
        description={<div><a href="#publication-research">Publication research</a></div>}
        rss={{
          title: "July 2026",
          description: "Expanded publication research and released Exa Agent in MCP."
        }}
      >
        ## Publication research
        We significantly expanded research over academic publications.
      </Update>
    `;

    const entries = parseHtmlEntries({
      parserKey: "exa:docs_page",
      sourceUrl: "https://exa.ai/docs/changelog",
      html: markdown,
    });

    expect(entries[0]).toMatchObject({
      title: "Exa July 2026 update",
      url: "https://exa.ai/docs/changelog#publication-research",
      excerpt: "Expanded publication research and released Exa Agent in MCP.",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-07-31T00:00:00.000Z"));
  });

  it("parses LangSmith MDX update blocks after the legacy changelog redirect", () => {
    const markdown = `
      # LangSmith Cloud changelog
      <Update label="July 27-31, 2026" rss={{ title: "2026-07-27 - LangSmith Cloud update" }}>
        ## Observability
        Evaluator lists now show an evaluator's current name.
      </Update>
    `;

    const entries = parseHtmlEntries({
      parserKey: "langchain:changelog_page",
      sourceUrl: "https://docs.langchain.com/langsmith/changelog",
      html: markdown,
    });

    expect(entries[0]).toMatchObject({
      title: "2026-07-27 - LangSmith Cloud update",
      url: "https://docs.langchain.com/langsmith/changelog#2026-07-27-langsmith-cloud-update",
      parseConfidence: "high",
    });
    expect(entries[0]?.excerpt).toContain("Evaluator lists now show");
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-07-27T00:00:00.000Z"));
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
      sourceUrl: "https://railway.com/changelog.md",
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

  it("parses Supabase changelog entries from the official changelog page instead of the blog feed", () => {
    const html = `
      <main>
        <div>
          <div>
            <a href="https://github.com/orgs/supabase/discussions/45233">
              <h3>Feature Preview: RLS Tester</h3>
            </a>
            <p>Apr 24, 2026</p>
          </div>
          <article>
            <h2>Verify the correctness of your RLS policies with the RLS tester</h2>
            <p>The RLS tester helps teams check row-level security behavior before shipping policies.</p>
          </article>
        </div>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "supabase:changelog_page",
      sourceUrl: "https://supabase.com/changelog",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "Feature Preview: RLS Tester",
      url: "https://github.com/orgs/supabase/discussions/45233",
      parseConfidence: "high",
    });
    expect(entries[0]?.excerpt).toContain("row-level security");
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-24T00:00:00.000Z"));
  });

  it("parses Vercel changelog cards with changelog detail URLs", () => {
    const html = `
      <main>
        <article>
          <time>Apr 24, 2026</time>
          <h2><a href="/changelog/gpt-5.5-on-ai-gateway">GPT 5.5 on AI Gateway</a></h2>
          <div id="changelog-description">
            <p>GPT-5.5 is now available on Vercel AI Gateway.</p>
          </div>
        </article>
      </main>
    `;

    const entries = parseHtmlEntries({
      parserKey: "vercel:changelog_page",
      sourceUrl: "https://vercel.com/changelog",
      html,
    });

    expect(entries[0]).toMatchObject({
      title: "GPT 5.5 on AI Gateway",
      url: "https://vercel.com/changelog/gpt-5.5-on-ai-gateway",
      excerpt: "GPT-5.5 is now available on Vercel AI Gateway.",
      parseConfidence: "high",
    });
    expect(entries[0]?.publishedAt).toBe(Date.parse("2026-04-24T00:00:00.000Z"));
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
  it("keeps the official source title and derives structured metadata", () => {
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

    expect(normalized.rawTitle).toBe(
      "Updates computation of subscription schedule phase end date to consider billing cycle anchor changes",
    );
    expect(normalized.title).toBe(
      "Updates computation of subscription schedule phase end date to consider billing cycle anchor...",
    );
    expect(normalized.categories).toEqual(expect.arrayContaining(["breaking", "api"]));
    expect(normalized.affectedStack).toEqual(expect.arrayContaining(["payments", "subscriptions"]));
    expect(normalized.importanceBand).toBe("critical");
    expect(normalized.releaseClass).toBe("breaking");
    expect(normalized.summary).toContain("billing_cycle_anchor");
  });

  it("normalizes Factory Droid RSS items into unique version titles", () => {
    const normalized = normalizeParsedEntry({
      vendorSlug: "factory-droid",
      vendorName: "Factory Droid",
      sourceName: "Factory Release Notes",
      sourceType: "rss",
      entry: {
        title: "CLI Updates",
        url: "https://docs.factory.ai/changelog/release-notes#june-5",
        excerpt:
          "v0.142.0 Improvements GitLab code review setup - The install-code-review skill now configures review pipelines.",
        publishedAt: Date.parse("2026-06-06T00:59:44.000Z"),
      },
    });

    expect(normalized.rawTitle).toBe("Factory Droid v0.142.0");
    expect(normalized.title).toBe("Factory Droid v0.142.0");
    expect(normalized.affectedStack).toEqual(
      expect.arrayContaining(["developer-workflow", "agents", "llms"]),
    );
  });
});
