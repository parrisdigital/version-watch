import { describe, expect, it } from "vitest";

import { findSameSourceCandidateByTitle, hasMeaningfulTitle, shouldPollSource } from "../../../convex/ingestState";

describe("hasMeaningfulTitle", () => {
  it("allows short semver release titles for GitHub release sources", () => {
    expect(hasMeaningfulTitle("v1.14.21", "https://github.com/anomalyco/opencode/releases")).toBe(true);
    expect(hasMeaningfulTitle("v4.12.14", "https://github.com/honojs/hono/releases")).toBe(true);
    expect(hasMeaningfulTitle("Bun v1.3.13", "https://github.com/oven-sh/bun/releases")).toBe(true);
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
          lastSuccessAt: now - fourHoursMs + 5 * 60 * 1000 + 1,
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
});
