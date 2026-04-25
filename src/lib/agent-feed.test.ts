import { describe, expect, it } from "vitest";

import { GET as getFeedMarkdown } from "@/app/api/v1/feed.md/route";
import { GET as getUpdateById } from "@/app/api/v1/updates/[id]/route";
import { GET as getUpdates } from "@/app/api/v1/updates/route";
import {
  buildRecommendedAction,
  filterEventsForPublicUpdates,
  parseUpdateFilters,
  renderUpdatesMarkdown,
  serializePublicUpdate,
} from "@/lib/agent-feed";
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
    expect(markdown).toContain("- Recommended action:");
    expect(markdown).toContain(update.source_url);
  });
});

describe("agent route handlers", () => {
  it("serves filtered update JSON", async () => {
    const response = await getUpdates(
      new Request("https://version-watch.example/api/v1/updates?vendor=stripe&severity=high&limit=1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.filters.limit).toBe(1);
    expect(body.updates[0].vendor_slug).toBe("stripe");
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
});
