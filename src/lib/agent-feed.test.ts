import { describe, expect, it } from "vitest";

import { GET as getFeedJson } from "@/app/api/v1/feed.json/route";
import { GET as getFeedMarkdown } from "@/app/api/v1/feed.md/route";
import { GET as getClusters } from "@/app/api/v1/clusters/route";
import { GET as getOpenApi } from "@/app/api/v1/openapi.json/route";
import { POST as postRelevance } from "@/app/api/v1/relevance/route";
import { GET as getStatus } from "@/app/api/v1/status/route";
import { GET as getVendorFreshnessBySlug } from "@/app/api/v1/status/vendors/[slug]/route";
import { GET as getVendorFreshness } from "@/app/api/v1/status/vendors/route";
import { GET as getTaxonomy } from "@/app/api/v1/taxonomy/route";
import { GET as getUpdateById } from "@/app/api/v1/updates/[id]/route";
import { GET as getUpdates } from "@/app/api/v1/updates/route";
import { POST as postAdminRefresh } from "@/app/api/admin/refresh/route";
import { POST as postAdminRescore } from "@/app/api/admin/rescore/route";
import {
  GET as getAdminWatchlists,
  POST as postAdminWatchlists,
} from "@/app/api/admin/watchlists/route";
import { POST as postAdminWatchlistDispatch } from "@/app/api/admin/watchlists/dispatch/route";
import { GET as getSkill } from "@/app/skills/version-watch/SKILL.md/route";
import {
  buildRecommendedAction,
  decodeUpdateCursor,
  encodeUpdateCursor,
  filterEventsForPublicUpdates,
  getPublicBaseUrl,
  paginateEventsForPublicUpdates,
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
        release_class: "pricing",
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
        releaseClass: "pricing",
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
      error: {
        error: {
          code: "invalid_filter",
          message: "Invalid since timestamp. Use an ISO 8601 timestamp.",
        },
      },
    });
  });

  it("rejects invalid release_class filters", () => {
    const parsed = parseUpdateFilters(new URLSearchParams({ release_class: "major-news" }));

    expect(parsed).toEqual({
      ok: false,
      error: {
        error: {
          code: "invalid_filter",
          message: "Invalid release_class. Use a value returned by /api/v1/taxonomy.",
        },
      },
    });
  });

  it("rejects fractional limits before clamping", () => {
    const parsed = parseUpdateFilters(new URLSearchParams({ limit: "0.5" }));

    expect(parsed).toEqual({
      ok: false,
      error: {
        error: {
          code: "invalid_filter",
          message: "Invalid limit. Use a positive integer.",
        },
      },
    });
  });

  it("rejects invalid cursors", () => {
    const parsed = parseUpdateFilters(new URLSearchParams({ cursor: "not-a-cursor" }));

    expect(parsed).toEqual({
      ok: false,
      error: {
        error: {
          code: "invalid_cursor",
          message: "Invalid cursor. Use a cursor returned by next_cursor.",
        },
      },
    });
  });

  it("parses valid cursors", () => {
    const cursor = encodeUpdateCursor({
      publishedAt: "2026-04-25T00:00:00.000Z",
      id: "openai-2026-04-25-example",
    });
    const parsed = parseUpdateFilters(new URLSearchParams({ cursor }));

    expect(parsed).toMatchObject({
      ok: true,
      filters: {
        cursor,
        cursorPosition: {
          publishedAt: "2026-04-25T00:00:00.000Z",
          id: "openai-2026-04-25-example",
        },
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

  it("uses stable sort-key cursors when new updates arrive before the cursor", () => {
    const parsed = parseUpdateFilters(new URLSearchParams({ limit: "1" }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const base = events.slice(0, 3).map((event, index) => ({
      ...event,
      slug: `event-${index}`,
      publishedAt: `2026-04-25T0${2 - index}:00:00.000Z`,
    }));
    const firstPage = paginateEventsForPublicUpdates(base, parsed.filters, Date.parse("2026-04-25T12:00:00.000Z"));
    const cursor = firstPage.next_cursor!;
    const cursorPosition = decodeUpdateCursor(cursor)!;
    const withInsertedNewer = [
      {
        ...base[0]!,
        slug: "newer-event",
        publishedAt: "2026-04-25T03:00:00.000Z",
      },
      ...base,
    ];
    const nextPage = paginateEventsForPublicUpdates(
      withInsertedNewer,
      { ...parsed.filters, cursor, cursorPosition },
      Date.parse("2026-04-25T12:00:00.000Z"),
    );

    expect(firstPage.events[0].slug).toBe("event-0");
    expect(nextPage.events[0].slug).toBe("event-1");
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
      severity: "critical",
      source_detail_url: event.sourceUrl,
      source_surface_url: event.sourceSurfaceUrl,
      source_surface_name: event.sourceSurfaceName,
      source_surface_type: event.sourceSurfaceType,
      source_url: event.sourceUrl,
      version_watch_url: `https://version-watch.example/events/${event.slug}`,
      release_class: "breaking",
      impact_confidence: "high",
      score_version: "v2",
    });
    expect(update.signal_score).toBeGreaterThan(0);
    expect(update.signal_reasons).toEqual(expect.arrayContaining(["release_class:breaking"]));
    expect(update.tags).toEqual(expect.arrayContaining(event.categories));
    expect(update.recommended_action).not.toMatch(/review the official entry/i);
  });

  it("normalizes GitHub release surfaces in the public source provenance", () => {
    const event = {
      ...events[0]!,
      sourceUrl: "https://github.com/openclaw/openclaw/releases/tag/v2026.4.25-beta.9",
      sourceSurfaceUrl: "https://github.com/openclaw/openclaw/releases",
      sourceSurfaceName: "GitHub Releases",
      sourceSurfaceType: "changelog_page" as const,
    };
    const update = serializePublicUpdate(event, "https://version-watch.example");

    expect(update.source_detail_url).toBe("https://github.com/openclaw/openclaw/releases/tag/v2026.4.25-beta.9");
    expect(update.source_surface_url).toBe("https://github.com/openclaw/openclaw/releases");
    expect(update.source_surface_type).toBe("github_release");
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
    expect(markdown).toContain("Freshness rule:");
    expect(markdown).toContain("Cite the official detail URL");
    expect(markdown).toContain("- Recommended action:");
    expect(markdown).toContain(update.source_detail_url);
    expect(markdown).toContain("- Tracked source:");
  });

  it("renders agent guidance for integrations and de-duplication", () => {
    const markdown = renderAgentsMarkdown("https://version-watch.example");

    expect(markdown).toContain("/api/v1/updates");
    expect(markdown).toContain("/api/v1/status");
    expect(markdown).toContain("recommended_action");
    expect(markdown).toContain("De-duplicate updates by id");
    expect(markdown).toContain("/api/v1/taxonomy");
    expect(markdown).toContain("/skills/version-watch/SKILL.md");
    expect(markdown).toContain("/api/v1/relevance");
    expect(markdown).toContain("Convex-backed snapshot API");
    expect(markdown).toContain("Freshness Contract");
    expect(markdown).toContain("invalid_cursor");
    expect(markdown).toContain("Treat next_cursor as opaque");
    expect(markdown).toContain("/api/v1/status/vendors");
    expect(markdown).toContain("adaptive source freshness");
    expect(markdown).toContain("read-only source of changelog intelligence");
    expect(markdown).toContain("Do not modify code, update dependencies, deploy, create issues, post notifications, or submit relevance feedback unless the user explicitly asks");
    expect(markdown).toContain("source_detail_url");
    expect(markdown).toContain("Build Your Own Read-Only Changelog System");
    expect(markdown).toContain("Watchlist Filter Model");
    expect(markdown).toContain("Notification Worker Pattern");
    expect(markdown).toContain("Query /api/v1/clusters");
    expect(markdown).toContain("Native Integration Roadmap");
  });

  it("renders llms.txt with broad integration guidance", () => {
    const markdown = renderLlmsTxt("https://version-watch.example");

    expect(markdown).toContain("/agent-access");
    expect(markdown).toContain("What Agents Can Do");
    expect(markdown).toContain("issue trackers");
    expect(markdown).toContain("de-duplicate by id");
    expect(markdown).toContain("/api/v1/openapi.json");
    expect(markdown).toContain("/api/v1/status");
    expect(markdown).toContain("/api/v1/relevance");
    expect(markdown).toContain("Convex-backed snapshots");
    expect(markdown).toContain("follow next_cursor as an opaque value");
    expect(markdown).toContain("/api/v1/status/vendors");
    expect(markdown).toContain("Do not post, open issues, change code, or submit feedback unless the user explicitly asks");
    expect(markdown).toContain("read-only changelog dashboards");
    expect(markdown).toContain("prefer /api/v1/clusters");
    expect(markdown).toContain("Discord webhook first");
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
    expect(markdown).toContain("Freshness Handling");
    expect(markdown).toContain("Pagination and Errors");
    expect(markdown).toContain("Handle error.code values invalid_filter, invalid_cursor, and not_found");
    expect(markdown).toContain("/api/v1/status/vendors/{slug}");
    expect(markdown).toContain("/api/v1/relevance");
    expect(markdown).toContain("Read-Only Scope");
    expect(markdown).toContain("Do not modify code, update dependencies, deploy, create issues, post notifications");
    expect(markdown).toContain("source_detail_url");
    expect(markdown).toContain("Read-Only Changelog Dashboard");
    expect(markdown).toContain("Cluster-First Notification Worker");
    expect(markdown).toContain("Store every delivered update id");
    expect(markdown).toContain("Discord webhook first");
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
          {
            status: "failure",
            startedAt: "2026-04-25T23:20:00.000Z",
            finishedAt: "2026-04-25T23:21:00.000Z",
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
    expect(status.recent_refresh_failures).toBe(2);
  });

  it("does not count paused or unsupported sources as public freshness debt", () => {
    const status = buildPublicApiStatus(
      {
        latestFeedRefresh: {
          status: "success",
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
        recentRuns: [
          {
            status: "failure",
            sourceLifecycleState: "unsupported",
            sourceUrl: "https://railway.com/changelog",
          },
        ],
        sources: [
          {
            lifecycleState: "unsupported",
            status: "unsupported",
            sourceUrl: "https://railway.com/changelog",
            lastSuccessAt: null,
            pollIntervalMinutes: 240,
          },
          {
            lifecycleState: "paused",
            status: "paused",
            lastSuccessAt: null,
            pollIntervalMinutes: 240,
          },
        ],
        coverage: {
          activeVendorCount: 44,
          pausedVendorCount: 1,
          unsupportedVendorCount: 1,
        },
      },
      now,
    );

    expect(status).toMatchObject({
      status: "healthy",
      active_source_count: 0,
      stale_source_count: 0,
      recent_refresh_failures: 0,
      coverage: {
        active_vendors: 44,
        paused_vendors: 1,
        unsupported_vendors: 1,
      },
    });
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
    expect(body.filters.release_class).toBeNull();
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
    expect(body.error).toMatchObject({
      code: "invalid_cursor",
      message: expect.stringContaining("Invalid cursor"),
    });
  });

  it("returns 400 for invalid since filters", async () => {
    const response = await getUpdates(
      new Request("https://version-watch.example/api/v1/updates?since=invalid"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatchObject({
      code: "invalid_filter",
      message: expect.stringContaining("Invalid since"),
    });
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
    expect(body.error).toMatchObject({
      code: "not_found",
      message: "Update not found.",
    });
  });

  it("serves taxonomy JSON", async () => {
    const response = await getTaxonomy(new Request("https://version-watch.example/api/v1/taxonomy"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.schema_version).toBe("2026-04-26");
    expect(body.taxonomy.severities).toEqual(["critical", "high", "medium", "low"]);
    expect(body.taxonomy.release_classes).toEqual(
      expect.arrayContaining(["breaking", "model_launch", "cli_patch"]),
    );
    expect(body.taxonomy.impact_confidences).toEqual(["high", "medium", "low"]);
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
    expect(body.paths["/api/v1/clusters"]).toBeDefined();
    expect(body.paths["/api/v1/status"]).toBeDefined();
    expect(body.paths["/api/v1/status/vendors"]).toBeDefined();
    expect(body.paths["/api/v1/status/vendors/{slug}"]).toBeDefined();
    expect(body.paths["/api/v1/taxonomy"]).toBeDefined();
    expect(body.paths["/api/v1/relevance"]).toBeDefined();
    expect(body.paths["/skills/version-watch/SKILL.md"]).toBeDefined();
    expect(body.paths["/api/v1/updates"].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "cursor" }),
        expect.objectContaining({ name: "release_class" }),
      ]),
    );
    expect(body.paths["/api/v1/feed.json"].get.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "limit" })]),
    );
    expect(body.components.schemas.StatusResponse).toBeDefined();
    expect(body.components.schemas.PublicUpdate.required).toEqual(
      expect.arrayContaining([
        "release_class",
        "impact_confidence",
        "signal_reasons",
        "score_version",
        "source_detail_url",
        "source_surface_url",
        "source_surface_name",
        "source_surface_type",
      ]),
    );
    expect(body.components.schemas.ClustersResponse).toBeDefined();
    expect(body.components.schemas.RelevanceSignalRequest.required).toEqual(["event_id", "signal", "area"]);
    expect(body.components.schemas.RelevanceSignalResponse.required).toEqual(["schema_version", "ok"]);
    expect(body.components.schemas.VendorFreshnessStatus).toBeDefined();
    expect(body.components.schemas.UpdatesResponse.required).toContain("status_url");
    expect(body.components.schemas.UpdatesResponse.properties.filters.$ref).toBe(
      "#/components/schemas/UpdateFilters",
    );
    expect(body.components.schemas.UpdateFilters.required).toContain("release_class");
    expect(body.components.schemas.ErrorResponse.properties.error.required).toEqual(["code", "message"]);
  });

  it("serves clustered update JSON without changing the raw update feed", async () => {
    const response = await getClusters(
      new Request("https://version-watch.example/api/v1/clusters?limit=5"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.schema_version).toBe("2026-04-26");
    expect(body.status_url).toBe("https://version-watch.example/api/v1/status");
    expect(body.count).toBeGreaterThan(0);
    expect(body.filters.release_class).toBeNull();
    expect(body.clusters[0]).toMatchObject({
      id: expect.any(String),
      kind: expect.stringMatching(/single|cluster/),
      release_class: expect.any(String),
      signal_score: expect.any(Number),
      updates: expect.any(Array),
    });
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

  it("serves public vendor freshness JSON", async () => {
    const response = await getVendorFreshness(new Request("https://version-watch.example/api/v1/status/vendors"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.schema_version).toBe("2026-04-26");
    expect(body.count).toBeGreaterThan(0);
    expect(body.vendors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          vendor_slug: "openai",
          lifecycle_state: expect.any(String),
          freshness_tier: expect.any(String),
          queued_refresh: false,
        }),
      ]),
    );
  });

  it("serves one public vendor freshness JSON response", async () => {
    const response = await getVendorFreshnessBySlug(
      new Request("https://version-watch.example/api/v1/status/vendors/openai"),
      { params: Promise.resolve({ slug: "openai" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.vendor).toMatchObject({
      vendor_slug: "openai",
      lifecycle_state: expect.any(String),
      active_source_count: expect.any(Number),
    });
  });

  it("returns 404 for unknown vendor freshness", async () => {
    const response = await getVendorFreshnessBySlug(
      new Request("https://version-watch.example/api/v1/status/vendors/missing"),
      { params: Promise.resolve({ slug: "missing" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toMatchObject({
      code: "not_found",
      message: "Vendor freshness status not found.",
    });
  });

  it("rejects unauthenticated admin refresh requests", async () => {
    const response = await postAdminRefresh(
      new Request("https://version-watch.example/api/admin/refresh", {
        method: "POST",
        body: JSON.stringify({ vendor: "openai" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ ok: false, error: "Unauthorized." });
  });

  it("rejects unauthenticated admin rescore requests", async () => {
    const response = await postAdminRescore(
      new Request("https://version-watch.example/api/admin/rescore", {
        method: "POST",
        body: JSON.stringify({ dry_run: true }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ ok: false, error: "Unauthorized." });
  });

  it("rejects unauthenticated admin watchlist requests", async () => {
    const listResponse = await getAdminWatchlists(
      new Request("https://version-watch.example/api/admin/watchlists"),
    );
    const createResponse = await postAdminWatchlists(
      new Request("https://version-watch.example/api/admin/watchlists", {
        method: "POST",
        body: JSON.stringify({ name: "Critical AI", webhook_type: "discord" }),
      }),
    );
    const dispatchResponse = await postAdminWatchlistDispatch(
      new Request("https://version-watch.example/api/admin/watchlists/dispatch", {
        method: "POST",
        body: JSON.stringify({ dry_run: true }),
      }),
    );

    expect(listResponse.status).toBe(401);
    expect(createResponse.status).toBe(401);
    expect(dispatchResponse.status).toBe(401);
  });

  it("returns stable errors for invalid relevance signals", async () => {
    const response = await postRelevance(
      new Request("https://version-watch.example/api/v1/relevance", {
        method: "POST",
        body: JSON.stringify({ signal: "maybe", area: "api" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatchObject({
      code: "invalid_filter",
      message: "event_id is required.",
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
    expect(body).toContain("Next page:");
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
