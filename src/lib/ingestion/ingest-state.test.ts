import { describe, expect, it } from "vitest";

import {
  classifyHttpStatus,
  classifyThrownError,
  SourceIngestionError,
} from "../../../convex/ingestionErrors";
import {
  findSameSourceCandidateByTitle,
  getFailureBackoffUntil,
  hasMeaningfulTitle,
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
