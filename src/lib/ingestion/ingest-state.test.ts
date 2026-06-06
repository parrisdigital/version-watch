import { describe, expect, it } from "vitest";

import {
  classifyHttpStatus,
  classifyThrownError,
  SourceIngestionError,
} from "../../../convex/ingestionErrors";
import { buildFetchHeaders, buildFetchTargetForRun, parseFeedEntries } from "../../../convex/ingest";
import {
  findSameSourceCandidateByTitle,
  getFailureBackoffUntil,
  hasMeaningfulTitle,
  isAutoPublishVendorSlug,
  isReasonablePublishDate,
  isOfficialSourceUrl,
  shouldPollSource,
} from "../../../convex/ingestState";
import { buildSourceRegistryPayload } from "../../../convex/seed";
import { getFreshnessTier, getPollIntervalMinutesForFreshnessTier } from "../../../convex/sourceFreshness";
import {
  getLifecycleStateAfterFailure,
  getLifecycleStateAfterSuccess,
  shouldPollLifecycleState,
} from "../../../convex/sourceLifecycle";

describe("buildFetchHeaders", () => {
  it("requests xAI release notes as HTML instead of the stripped Markdown view", () => {
    const headers = buildFetchHeaders("VersionWatchBot/1.0", {
      url: "https://docs.x.ai/developers/release-notes",
      parserKey: "xai:docs_page",
      sourceType: "docs_page",
    });

    expect(headers.Accept).toContain("text/html");
    expect(headers.Accept).not.toContain("text/markdown");
  });

  it("requests Factory release notes as HTML so RSS discovery can see alternate links", () => {
    const headers = buildFetchHeaders("VersionWatchBot/1.0", {
      url: "https://docs.factory.ai/changelog/release-notes",
      parserKey: "factory-droid:changelog_page",
      sourceType: "changelog_page",
    });

    expect(headers.Accept).toContain("text/html");
    expect(headers.Accept).not.toContain("text/markdown");
  });

  it("keeps direct feeds on RSS/XML-first accept headers", () => {
    const headers = buildFetchHeaders("VersionWatchBot/1.0", {
      url: "https://resend.com/changelog/index.xml",
      parserKey: "resend:rss",
      sourceType: "rss",
    });

    expect(headers.Accept).toContain("application/rss+xml");
    expect(headers.Accept).not.toContain("text/html");
  });
});

describe("parseFeedEntries", () => {
  it("uses rich Mintlify headings for date-bucket feed titles", async () => {
    const entries = await parseFeedEntries(
      `<?xml version="1.0" encoding="UTF-8"?>
      <rss xmlns:content="http://purl.org/rss/1.0/modules/content/" version="2.0">
        <channel>
          <title>Lovable changelog</title>
          <item>
            <title>Jun 5, 2026</title>
            <link>https://docs.lovable.dev/changelog#jun-5-2026</link>
            <pubDate>Sat, 06 Jun 2026 21:15:51 GMT</pubDate>
            <content:encoded><![CDATA[<h3>Toggle WHOIS privacy after purchase</h3><p>WHOIS privacy can now be changed after purchase.</p>]]></content:encoded>
          </item>
        </channel>
      </rss>`,
      "https://docs.lovable.dev/changelog/rss.xml",
    );

    expect(entries[0]).toMatchObject({
      title: "Toggle WHOIS privacy after purchase",
      url: "https://docs.lovable.dev/changelog#jun-5-2026",
    });
  });

  it("skips generic rich feed section headings for Bolt release notes", async () => {
    const entries = await parseFeedEntries(
      `<?xml version="1.0" encoding="UTF-8"?>
      <rss xmlns:content="http://purl.org/rss/1.0/modules/content/" version="2.0">
        <channel>
          <title>Bolt release notes</title>
          <item>
            <title>May 23 - 29</title>
            <link>https://support.bolt.new/release-notes#may-23-29</link>
            <pubDate>Tue, 02 Jun 2026 07:00:50 GMT</pubDate>
            <content:encoded><![CDATA[
              <h2>Updates</h2>
              <h3>Database settings consolidated</h3>
              <p>Your project's database settings now live in one place.</p>
            ]]></content:encoded>
          </item>
        </channel>
      </rss>`,
      "https://support.bolt.new/release-notes/rss.xml",
    );

    expect(entries[0]).toMatchObject({
      title: "Database settings consolidated",
      url: "https://support.bolt.new/release-notes#may-23-29",
    });
  });

  it("normalizes malformed Sourcegraph changelog feed links", async () => {
    const entries = await parseFeedEntries(
      `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Sourcegraph Changelog</title>
          <item>
            <title>2026-06-01 updates</title>
            <link>https://sourcegraph.com../changelog/releases/7.3.2527</link>
            <description>Cody and Sourcegraph updates.</description>
            <pubDate>Mon, 01 Jun 2026 21:42:07 GMT</pubDate>
          </item>
        </channel>
      </rss>`,
      "https://sourcegraph.com/changelog/featured.rss",
    );

    expect(entries[0]?.url).toBe("https://sourcegraph.com/changelog/releases/7.3.2527");
  });

  it("keeps Factory RSS content in the excerpt so version titles can be normalized", async () => {
    const entries = await parseFeedEntries(
      `<?xml version="1.0" encoding="UTF-8"?>
      <rss xmlns:content="http://purl.org/rss/1.0/modules/content/" version="2.0">
        <channel>
          <title>Release notes</title>
          <item>
            <title>CLI Updates</title>
            <description>GitLab code review setup and chat stability fixes</description>
            <link>https://docs.factory.ai/changelog/release-notes#june-5</link>
            <pubDate>Sat, 06 Jun 2026 00:59:44 GMT</pubDate>
            <content:encoded><![CDATA[<p><code>v0.142.0</code></p><h2>Improvements</h2>]]></content:encoded>
          </item>
        </channel>
      </rss>`,
      "https://docs.factory.ai/changelog/release-notes",
    );

    expect(entries[0]).toMatchObject({
      title: "CLI Updates",
      url: "https://docs.factory.ai/changelog/release-notes#june-5",
    });
    expect(entries[0]?.excerpt).toContain("v0.142.0");
  });
});

describe("buildFetchTargetForRun", () => {
  it("strips conditional cache validators during forced refreshes", () => {
    const source = {
      url: "https://github.com/anthropics/claude-code/releases.atom",
      parserKey: "claude-code:rss",
      sourceType: "rss",
      etag: 'W/"release-feed"',
      lastModified: "Sat, 06 Jun 2026 16:45:00 GMT",
    };

    expect(buildFetchTargetForRun(source, false)).toEqual(source);
    expect(buildFetchTargetForRun(source, true)).toEqual({
      url: source.url,
      parserKey: source.parserKey,
      sourceType: source.sourceType,
      etag: undefined,
      lastModified: undefined,
    });
  });
});

describe("isAutoPublishVendorSlug", () => {
  it("auto-publishes high-confidence official entries for active newly added vendors", () => {
    expect([
      "aider",
      "amazon-q-developer",
      "amp",
      "base-ui",
      "bolt",
      "coderabbit",
      "continue",
      "figma",
      "gemini-code-assist",
      "github-copilot",
      "goose",
      "heroui",
      "jetbrains-junie",
      "kiro",
      "lovable",
      "mistral-ai",
      "model-context-protocol",
      "openhands",
      "perplexity",
      "qodo",
      "replit-agent",
      "roo-code",
      "sourcegraph-cody",
      "tabnine",
      "tanstack",
      "v0",
    ].every((slug) => isAutoPublishVendorSlug(slug))).toBe(true);
  });

  it("keeps unsupported OpenRouter out of auto-publish until it has a machine-fetchable source", () => {
    expect(isAutoPublishVendorSlug("openrouter")).toBe(false);
  });
});

describe("hasMeaningfulTitle", () => {
  it("allows short semver release titles for GitHub release sources", () => {
    expect(hasMeaningfulTitle("v1.14.21", "https://github.com/anomalyco/opencode/releases")).toBe(true);
    expect(hasMeaningfulTitle("v4.12.14", "https://github.com/honojs/hono/releases")).toBe(true);
    expect(hasMeaningfulTitle("Bun v1.3.13", "https://github.com/oven-sh/bun/releases")).toBe(true);
  });

  it("allows short vendor-version release titles from official changelog pages", () => {
    expect(hasMeaningfulTitle("Zed 0.233.9", "https://zed.dev/releases/stable")).toBe(true);
    expect(hasMeaningfulTitle("Dia 1.16.0", "https://www.diabrowser.com/changelog")).toBe(true);
  });

  it("still rejects short generic titles outside GitHub releases", () => {
    expect(hasMeaningfulTitle("v1.14.21", "https://developers.openai.com/api/docs/changelog")).toBe(false);
    expect(hasMeaningfulTitle("update", "https://github.com/anomalyco/opencode/releases")).toBe(false);
  });

  it("allows short official changelog titles that end in API or CLI", () => {
    expect(hasMeaningfulTitle("Groups API", "https://workos.com/changelog")).toBe(true);
    expect(hasMeaningfulTitle("Clerk CLI", "https://clerk.com/changelog")).toBe(true);
    expect(hasMeaningfulTitle("Linear MCP", "https://linear.app/changelog")).toBe(true);
  });

  it("rejects hidden-character section headings", () => {
    expect(hasMeaningfulTitle("\u200BWhat's Changing", "https://exa.ai/docs/changelog")).toBe(false);
  });

  it("rejects feed date-range buckets so specific headings can replace them", () => {
    expect(hasMeaningfulTitle("May 23 - 29", "https://support.bolt.new/release-notes/rss.xml")).toBe(false);
    expect(hasMeaningfulTitle("Apr 25 - May 1", "https://support.bolt.new/release-notes/rss.xml")).toBe(false);
  });
});

describe("findSameSourceCandidateByTitle", () => {
  it("matches candidates by normalized title without collapsing different same-day entries", () => {
    const candidates = [
      { rawTitle: "Tailored notifications for Surveys" },
      { rawTitle: "Schedule recurring Workflows" },
    ];

    expect(findSameSourceCandidateByTitle(candidates, "Schedule recurring Workflows")).toBe(candidates[1]);
    expect(findSameSourceCandidateByTitle(candidates, "Weekly email digest for Web Analytics")).toBeNull();
  });

  it("matches old Stripe titles with appended product labels", () => {
    const candidates = [
      { rawTitle: "Adds support for the UPI payment methodPayments" },
      { rawTitle: "Updates the elements.update() method to return a PromiseElements" },
    ];

    expect(findSameSourceCandidateByTitle(candidates, "Adds support for the UPI payment method")).toBe(
      candidates[0],
    );
    expect(findSameSourceCandidateByTitle(candidates, "Updates the elements.update() method to return a Promise")).toBe(
      candidates[1],
    );
  });
});

describe("isReasonablePublishDate", () => {
  const now = Date.UTC(2026, 4, 4, 12, 0, 0);

  it("allows only the public future-skew window", () => {
    expect(isReasonablePublishDate(now + 59 * 60 * 1000, now)).toBe(true);
    expect(isReasonablePublishDate(now + 2 * 60 * 60 * 1000, now)).toBe(false);
    expect(isReasonablePublishDate(Date.UTC(2026, 4, 5), now)).toBe(false);
  });

  it("rejects dates before the supported ingestion window", () => {
    expect(isReasonablePublishDate(Date.UTC(2024, 11, 31), now)).toBe(false);
  });
});

describe("shouldPollSource", () => {
  const now = Date.UTC(2026, 3, 23, 12, 0, 0);
  const fourHoursMs = 240 * 60 * 1000;

  it("treats sources as due when the cron fires just before the full poll interval", () => {
    expect(
      shouldPollSource(
        {
          pollIntervalMinutes: 240,
          lastSuccessAt: now - fourHoursMs + 30 * 1000,
        },
        now,
        false,
      ),
    ).toBe(true);
  });

  it("does not poll sources that are still outside the grace window", () => {
    expect(
      shouldPollSource(
        {
          pollIntervalMinutes: 240,
          lastSuccessAt: now - fourHoursMs + 15 * 60 * 1000 + 1,
        },
        now,
        false,
      ),
    ).toBe(false);
  });

  it("uses the latest attempt time when failures are newer than successes", () => {
    expect(
      shouldPollSource(
        {
          pollIntervalMinutes: 240,
          lastSuccessAt: now - fourHoursMs,
          lastFailureAt: now - 10 * 60 * 1000,
        },
        now,
        false,
      ),
    ).toBe(false);
  });

  it("uses next due time before falling back to poll intervals", () => {
    expect(
      shouldPollSource(
        {
          pollIntervalMinutes: 240,
          nextDueAt: now + 20 * 60 * 1000,
          lastSuccessAt: now - fourHoursMs,
        },
        now,
        false,
      ),
    ).toBe(false);
    expect(
      shouldPollSource(
        {
          pollIntervalMinutes: 240,
          nextDueAt: now - 1,
        },
        now,
        false,
      ),
    ).toBe(true);
  });

  it("respects failure backoff unless a manual force run is requested", () => {
    const source = {
      pollIntervalMinutes: 30,
      nextDueAt: now - 1,
      backoffUntil: now + 30 * 60 * 1000,
    };

    expect(shouldPollSource(source, now, false)).toBe(false);
    expect(shouldPollSource(source, now, true)).toBe(true);
  });

  it("extends repeated failures into circuit-breaker backoff", () => {
    const normalBackoff = getFailureBackoffUntil({ _id: "src_1", freshnessTier: "critical" }, now, 1);
    const circuitBackoff = getFailureBackoffUntil({ _id: "src_1", freshnessTier: "critical" }, now, 5);

    expect(normalBackoff - now).toBeLessThan(2 * 60 * 60 * 1000);
    expect(circuitBackoff - now).toBeGreaterThan(23 * 60 * 60 * 1000);
  });
});

describe("source freshness tiers", () => {
  it("assigns faster tiers to critical and high priority vendors", () => {
    expect(getFreshnessTier("openai", "changelog_page")).toBe("critical");
    expect(getFreshnessTier("openai", "docs_page")).toBe("high");
    expect(getFreshnessTier("firebase", "changelog_page")).toBe("high");
    expect(getFreshnessTier("pnpm", "docs_page")).toBe("long_tail");
  });

  it("maps tiers to explicit poll intervals", () => {
    expect(getPollIntervalMinutesForFreshnessTier("critical")).toBe(30);
    expect(getPollIntervalMinutesForFreshnessTier("high")).toBe(60);
    expect(getPollIntervalMinutesForFreshnessTier("standard")).toBe(240);
    expect(getPollIntervalMinutesForFreshnessTier("long_tail")).toBe(720);
  });
});

describe("source lifecycle state", () => {
  it("does not poll paused or unsupported sources even during forced runs", () => {
    expect(shouldPollLifecycleState({ lifecycleState: "active", isActive: true })).toBe(true);
    expect(shouldPollLifecycleState({ lifecycleState: "degraded", isActive: true })).toBe(true);
    expect(shouldPollLifecycleState({ lifecycleState: "paused", isActive: true })).toBe(false);
    expect(shouldPollLifecycleState({ lifecycleState: "unsupported", isActive: true })).toBe(false);
  });

  it("moves monitored sources between active and degraded without changing paused coverage", () => {
    expect(getLifecycleStateAfterFailure({ lifecycleState: "active" })).toBe("degraded");
    expect(getLifecycleStateAfterSuccess({ lifecycleState: "degraded" })).toBe("active");
    expect(getLifecycleStateAfterFailure({ lifecycleState: "unsupported" })).toBe("unsupported");
    expect(getLifecycleStateAfterSuccess({ lifecycleState: "paused" })).toBe("paused");
  });

  it("preserves operational health fields during registry sync payload construction", () => {
    const payload = buildSourceRegistryPayload({
      existingSource: {
        lifecycleState: "degraded",
        consecutiveFailures: 2,
        lastFailureAt: Date.UTC(2026, 3, 25, 12),
        lastSuccessAt: Date.UTC(2026, 3, 25, 8),
      },
      vendorId: "vendor_123",
      vendorSlug: "vercel",
      source: {
        name: "Vercel Changelog",
        type: "changelog_page",
        url: "https://vercel.com/changelog",
      },
      isPrimary: true,
      now: Date.UTC(2026, 3, 25, 16),
    });

    expect(payload.lifecycleState).toBe("degraded");
    expect(payload.freshnessTier).toBe("critical");
    expect(payload.pollIntervalMinutes).toBe(30);
    expect(payload).not.toHaveProperty("consecutiveFailures");
    expect(payload).not.toHaveProperty("lastFailureAt");
    expect(payload).not.toHaveProperty("lastSuccessAt");
  });

  it("reactivates formerly unsupported sources once the registry marks them active", () => {
    const payload = buildSourceRegistryPayload({
      existingSource: {
        lifecycleState: "unsupported",
        consecutiveFailures: 0,
      },
      vendorId: "vendor_xai",
      vendorSlug: "xai",
      source: {
        name: "Grok API Release Notes",
        type: "docs_page",
        url: "https://docs.x.ai/developers/release-notes",
      },
      isPrimary: true,
      now: Date.UTC(2026, 3, 25, 16),
    });

    expect(payload.lifecycleState).toBe("active");
    expect(payload).not.toHaveProperty("consecutiveFailures");
  });

  it("reactivates paused sources that remain active in the registry", () => {
    const payload = buildSourceRegistryPayload({
      existingSource: {
        lifecycleState: "paused",
        consecutiveFailures: 1,
      },
      vendorId: "vendor_warp",
      vendorSlug: "warp",
      source: {
        name: "Warp Changelog",
        type: "changelog_page",
        url: "https://docs.warp.dev/changelog",
      },
      isPrimary: true,
      now: Date.UTC(2026, 3, 25, 16),
    });

    expect(payload.lifecycleState).toBe("active");
    expect(payload).not.toHaveProperty("consecutiveFailures");
  });

  it("marks Railway as unsupported during registry sync", () => {
    const payload = buildSourceRegistryPayload({
      existingSource: {
        isActive: true,
        consecutiveFailures: 1,
      },
      vendorId: "vendor_railway",
      vendorSlug: "railway",
      source: {
        name: "Railway Changelog",
        type: "changelog_page",
        url: "https://railway.com/changelog",
      },
      isPrimary: true,
      now: Date.UTC(2026, 3, 25, 16),
    });

    expect(payload.lifecycleState).toBe("unsupported");
    expect(payload.isActive).toBe(true);
    expect(payload).not.toHaveProperty("consecutiveFailures");
  });
});

describe("official source URL validation", () => {
  it("blocks known blog detail bleed from changelog sources", () => {
    expect(
      isOfficialSourceUrl(
        "https://supabase.com/blog/supabase-is-now-iso-27001-certified",
        "https://supabase.com/changelog",
        "supabase",
      ),
    ).toBe(false);
    expect(
      isOfficialSourceUrl(
        "https://vercel.com/blog/how-zo-computer-improved-ai-reliability-20x-on-vercel",
        "https://vercel.com/changelog",
        "vercel",
      ),
    ).toBe(false);
  });

  it("allows official detail links surfaced by changelog pages", () => {
    expect(
      isOfficialSourceUrl(
        "https://github.com/orgs/supabase/discussions/45233",
        "https://supabase.com/changelog",
        "supabase",
      ),
    ).toBe(true);
    expect(
      isOfficialSourceUrl(
        "https://vercel.com/changelog/gpt-5.5-on-ai-gateway",
        "https://vercel.com/changelog",
        "vercel",
      ),
    ).toBe(true);
  });
});

describe("source error classification", () => {
  it("classifies blocked and generic HTTP failures separately", () => {
    expect(classifyHttpStatus(403)).toBe("fetch_blocked");
    expect(classifyHttpStatus(429)).toBe("fetch_blocked");
    expect(classifyHttpStatus(500)).toBe("http_error");
  });

  it("preserves explicit source ingestion error codes", () => {
    expect(classifyThrownError(new SourceIngestionError("parse_error", "Could not parse page"))).toBe(
      "parse_error",
    );
    expect(classifyThrownError(new Error("Request timeout after 30s"))).toBe("fetch_timeout");
    expect(classifyThrownError(new Error("Unexpected parser issue"))).toBe("unknown_error");
  });
});
