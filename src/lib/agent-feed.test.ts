import { describe, expect, it } from "vitest";

import { GET as getFeedJson } from "@/app/api/v1/feed.json/route";
import { GET as getFeedMarkdown } from "@/app/api/v1/feed.md/route";
import { GET as getOpenApi } from "@/app/api/v1/openapi.json/route";
import { GET as getStatus } from "@/app/api/v1/status/route";
import { GET as getTaxonomy } from "@/app/api/v1/taxonomy/route";
import { GET as getUpdateById } from "@/app/api/v1/updates/[id]/route";
import { GET as getUpdates } from "@/app/api/v1/updates/route";
import { GET as getSkill } from "@/app/skills/version-watch/SKILL.md/route";
import {
  buildRecommendedAction,
  encodeUpdateCursor,
  filterEventsForPublicUpdates,
  getPublicBaseUrl,
  parseUpdateFilters,
  renderAgentsMarkdown,
  renderLlmsTxt,
  renderUpdatesMarkdown,
  renderVersionWatchSkillMarkdown,
  serializePublicUpdate,
} from "@/lib/agent-feed";
import { buildPublicApiStatus } from "@/lib/agent-status";
import { events } from "@/lib/mock-data";

describe("agent update filters", () => {
  it("parses valid filters and clamps large limits", () => {
    const parsed = parseUpdateFilters(
      new URLSearchParams({
        since: "2026-04-24T00:00:00Z",
        vendor: "Stripe",
        severity: "high",
        audience: "backend",
        tag: "api",
        limit: "250",
      }),
    );

    expect(parsed).toMatchObject({
      ok: true,
      filters: {
        since: "2026-04-24T00:00:00.000Z",
        vendor: "stripe",
        severity: "high",
        audience: "backend",
        tag: "api",
        limit: 100,
      },
    });
  });

  it("rejects invalid since timestamps", () => {
    const parsed = parseUpdateFilters(new URLSearchParams({ since: "not-a-date" }));

    expect(parsed).toEqual({
      ok: false,
      error: "Invalid since timestamp. Use an ISO 8601 timestamp.",
    });
  });

  it("rejects fractional limits before clamping", () => {
    const parsed = parseUpdateFilters(new URLSearchParams({ limit: "0.5" }));

    expect(parsed).toEqual({
      ok: false,
      error: "Invalid limit. Use a positive integer.",
    });
  });

  it("rejects invalid cursors", () => {
    const parsed = parseUpdateFilters(new URLSearchParams({ cursor: "not-a-cursor" }));

    expect(parsed).toEqual({
      ok: false,
      error: "Invalid cursor. Use a cursor returned by next_cursor.",
    });
  });

  it("parses valid cursors", () => {
    const cursor = encodeUpdateCursor(3);
    const parsed = parseUpdateFilters(new URLSearchParams({ cursor }));

    expect(parsed).toMatchObject({
      ok: true,
      filters: {
        cursor,
        cursorOffset: 3,
      },
    });
  });

  it("filters by vendor, severity, audience, and tag", () => {
    const parsed = parseUpdateFilters(
      new URLSearchParams({
        vendor: "stripe",
        severity: "high",
        audience: "backend",
        tag: "payments",
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = filterEventsForPublicUpdates(events, parsed.filters);

    expect(result).toHaveLength(1);
    expect(result.every((event) => event.vendorSlug === "stripe")).toBe(true);
  });

  it("drops future-dated events beyond the public skew guard", () => {
    const parsed = parseUpdateFilters(new URLSearchParams({ limit: "10" }));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const future = {
      ...events[0]!,
      publishedAt: "2026-05-01T00:00:00.000Z",
    };
    const current = {
      ...events[0]!,
      publishedAt: "2026-04-25T00:00:00.000Z",
    };

    const result = filterEventsForPublicUpdates([future, current], parsed.filters, Date.parse("2026-04-25T12:00:00.000Z"));

    expect(result).toEqual([current]);
  });
});

describe("agent update serialization", () => {
  it("uses the custom domain as the canonical fallback URL", () => {
    expect(getPublicBaseUrl()).toBe("https://versionwatch.dev");
  });

  it("serializes the public API shape with stable snake_case fields", () => {
    const event = events.find((item) => item.vendorSlug === "stripe")!;
    const update = serializePublicUpdate(event, "https://version-watch.example");

    expect(update).toMatchObject({
      id: event.slug,
      vendor: event.vendorName,
      vendor_slug: event.vendorSlug,
      published_at: event.publishedAt,
      severity: event.importanceBand,
      source_url: event.sourceUrl,
      version_watch_url: `https://version-watch.example/events/${event.slug}`,
    });
    expect(update.signal_score).toBeGreaterThan(0);
    expect(update.tags).toEqual(expect.arrayContaining(event.categories));
    expect(update.recommended_action).not.toMatch(/review the official entry/i);
  });

  it("generates deterministic recommended actions by category", () => {
    const breaking = {
      ...events[0]!,
      categories: ["breaking", "api"],
      affectedStack: ["payments", "auth"],
    };
    const model = {
      ...events[0]!,
      categories: ["model"],
      affectedStack: ["llms", "agents"],
    };

    expect(buildRecommendedAction(breaking)).toContain("schedule migration work");
    expect(buildRecommendedAction(model)).toContain("Run model evals");
  });
});

describe("agent markdown feed", () => {
  it("renders update intelligence in Markdown", () => {
    const update = serializePublicUpdate(events[0]!, "https://version-watch.example");
    const markdown = renderUpdatesMarkdown([update], "2026-04-25T00:00:00.000Z", "https://version-watch.example");

    expect(markdown).toContain("# Version Watch Feed");
    expect(markdown).toContain("API status:");
    expect(markdown).toContain("- Recommended action:");
    expect(markdown).toContain(update.source_url);
  });

  it("renders agent guidance for integrations and de-duplication", () => {
    const markdown = renderAgentsMarkdown("https://version-watch.example");

    expect(markdown).toContain("/api/v1/updates");
    expect(markdown).toContain("/api/v1/status");
    expect(markdown).toContain("recommended_action");
    expect(markdown).toContain("De-duplicate updates by id");
    expect(markdown).toContain("/api/v1/taxonomy");
    expect(markdown).toContain("/skills/version-watch/SKILL.md");
  });

  it("renders llms.txt with broad integration guidance", () => {
    const markdown = renderLlmsTxt("https://version-watch.example");

    expect(markdown).toContain("/agent-access");
    expect(markdown).toContain("What Agents Can Do");
    expect(markdown).toContain("issue trackers");
    expect(markdown).toContain("de-duplicate by id");
    expect(markdown).toContain("/api/v1/openapi.json");
    expect(markdown).toContain("/api/v1/status");
  });

  it("renders the portable Version Watch skill", () => {
    const markdown = renderVersionWatchSkillMarkdown("https://version-watch.example");

    expect(markdown).toContain("name: version-watch");
    expect(markdown).toContain("Operating Procedure");
    expect(markdown).toContain("/api/v1/taxonomy");
    expect(markdown).toContain("/api/v1/status");
    expect(markdown).toContain("De-duplicate by update id");
    expect(markdown).toContain("Release Risk Check");
    expect(markdown).toContain("Dependency Upgrade Review");
    expect(markdown).toContain("Vendor Watch Digest");
    expect(markdown).toContain("CI Preflight");
    expect(markdown).toContain("Team Notification Formatting");
  });
});

describe("agent API status", () => {
  const now = Date.parse("2026-04-26T00:00:00.000Z");

  it("reports healthy status for recent clean refreshes", () => {
    const status = buildPublicApiStatus(
      {
        latestFeedRefresh: {
          status: "success",
          startedAt: "2026-04-25T23:40:00.000Z",
          finishedAt: "2026-04-25T23:45:00.000Z",
        },
        latestEvents: [{ publishedAt: "2026-04-25T22:00:00.000Z" }],
        recentRefreshRuns: [],
        sources: [
          {
            status: "healthy",
            lastSuccessAt: "2026-04-25T23:45:00.000Z",
            pollIntervalMinutes: 240,
          },
        ],
      },
      now,
    );

    expect(status).toMatchObject({
      status: "healthy",
      latest_refresh_age_minutes: 15,
      active_source_count: 1,
      degraded_source_count: 0,
      failing_source_count: 0,
      stale_source_count: 0,
    });
  });

  it("reports degraded status for partial or failing source coverage", () => {
    const status = buildPublicApiStatus(
      {
        latestFeedRefresh: {
          status: "partial_failure",
          startedAt: "2026-04-25T23:40:00.000Z",
          finishedAt: "2026-04-25T23:45:00.000Z",
        },
        recentRefreshRuns: [
          {
            status: "partial_failure",
            startedAt: "2026-04-25T23:40:00.000Z",
            finishedAt: "2026-04-25T23:45:00.000Z",
          },
        ],
        sources: [
          {
            status: "failing",
            lastSuccessAt: "2026-04-25T23:00:00.000Z",
            pollIntervalMinutes: 240,
          },
        ],
      },
      now,
    );

    expect(status.status).toBe("degraded");
    expect(status.failing_source_count).toBe(1);
    expect(status.recent_refresh_failures).toBe(1);
  });

  it("reports stale status when the latest refresh is beyond the public window", () => {
    const status = buildPublicApiStatus(
      {
        latestFeedRefresh: {
          status: "success",
          startedAt: "2026-04-25T18:00:00.000Z",
          finishedAt: "2026-04-25T18:30:00.000Z",
        },
        recentRefreshRuns: [],
        sources: [],
      },
      now,
    );

    expect(status.status).toBe("stale");
    expect(status.latest_refresh_age_minutes).toBe(330);
  });
});

describe("agent route handlers", () => {
  it("serves filtered update JSON", async () => {
    const response = await getUpdates(
      new Request("https://version-watch.example/api/v1/updates?vendor=stripe&severity=high&limit=1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.schema_version).toBe("2026-04-26");
    expect(body.status_url).toBe("https://version-watch.example/api/v1/status");
    expect(body.count).toBe(1);
    expect(body.total_count).toBeGreaterThanOrEqual(1);
    expect(body.filters.limit).toBe(1);
    expect(body.updates[0].vendor_slug).toBe("stripe");
  });

  it("serves paginated update JSON with next_cursor", async () => {
    const firstResponse = await getUpdates(
      new Request("https://version-watch.example/api/v1/updates?limit=1"),
    );
    const firstBody = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody.next_cursor).toEqual(expect.any(String));

    const secondResponse = await getUpdates(
      new Request(`https://version-watch.example/api/v1/updates?limit=1&cursor=${firstBody.next_cursor}`),
    );
    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondBody.updates[0].id).not.toBe(firstBody.updates[0].id);
  });

  it("returns 400 for invalid cursors", async () => {
    const response = await getUpdates(
      new Request("https://version-watch.example/api/v1/updates?cursor=bad"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Invalid cursor");
  });

  it("returns 400 for invalid since filters", async () => {
    const response = await getUpdates(
      new Request("https://version-watch.example/api/v1/updates?since=invalid"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Invalid since");
  });

  it("clamps route limits", async () => {
    const response = await getUpdates(
      new Request("https://version-watch.example/api/v1/updates?limit=250"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.filters.limit).toBe(100);
  });

  it("returns 404 for unknown update ids", async () => {
    const response = await getUpdateById(
      new Request("https://version-watch.example/api/v1/updates/missing"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Update not found.");
  });

  it("serves taxonomy JSON", async () => {
    const response = await getTaxonomy(new Request("https://version-watch.example/api/v1/taxonomy"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.schema_version).toBe("2026-04-26");
    expect(body.taxonomy.severities).toEqual(["critical", "high", "medium", "low"]);
    expect(body.taxonomy.vendors).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: "openai" })]),
    );
    expect(body.taxonomy.tags.length).toBeGreaterThan(0);
    expect(body.taxonomy.audiences.length).toBeGreaterThan(0);
  });

  it("serves OpenAPI JSON", async () => {
    const response = await getOpenApi(new Request("https://version-watch.example/api/v1/openapi.json"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.openapi).toBe("3.1.0");
    expect(body.paths["/api/v1/updates"]).toBeDefined();
    expect(body.paths["/api/v1/status"]).toBeDefined();
    expect(body.paths["/api/v1/taxonomy"]).toBeDefined();
    expect(body.paths["/skills/version-watch/SKILL.md"]).toBeDefined();
    expect(body.paths["/api/v1/updates"].get.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "cursor" })]),
    );
    expect(body.paths["/api/v1/feed.json"].get.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "limit" })]),
    );
    expect(body.components.schemas.StatusResponse).toBeDefined();
    expect(body.components.schemas.UpdatesResponse.required).toContain("status_url");
  });

  it("serves public API status JSON", async () => {
    const response = await getStatus(new Request("https://version-watch.example/api/v1/status"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.schema_version).toBe("2026-04-26");
    expect(["healthy", "degraded", "stale"]).toContain(body.status);
    expect(body).toMatchObject({
      active_source_count: expect.any(Number),
      degraded_source_count: expect.any(Number),
      failing_source_count: expect.any(Number),
      stale_source_count: expect.any(Number),
      recent_refresh_failures: expect.any(Number),
      coverage: expect.objectContaining({
        active_vendors: expect.any(Number),
        paused_vendors: expect.any(Number),
        unsupported_vendors: expect.any(Number),
      }),
    });
  });

  it("serves the Version Watch skill Markdown route", async () => {
    const response = await getSkill(new Request("https://version-watch.example/skills/version-watch/SKILL.md"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(body).toContain("Version Watch Skill");
    expect(body).toContain("/api/v1/updates");
  });

  it("serves Markdown feed responses", async () => {
    const response = await getFeedMarkdown(
      new Request("https://version-watch.example/api/v1/feed.md?limit=1"),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(body).toContain("# Version Watch Feed");
    expect(body).toContain("- Recommended action:");
  });

  it("serves JSON feed responses with status discovery", async () => {
    const response = await getFeedJson(
      new Request("https://version-watch.example/api/v1/feed.json?limit=1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status_url).toBe("https://version-watch.example/api/v1/status");
    expect(body.updates).toHaveLength(1);
  });
});
