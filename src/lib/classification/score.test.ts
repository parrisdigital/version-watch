import { describe, expect, it } from "vitest";

import { getImportanceBand, rankEvents, scoreEvent } from "@/lib/classification/score";
import type { MockEvent } from "@/lib/mock-data";

const lowSignal: MockEvent = {
  id: "firebase-docs",
  slug: "firebase-docs-update",
  vendorSlug: "firebase",
  vendorName: "Firebase",
  title: "Firebase updated docs examples",
  summary: "Firebase refreshed documentation examples.",
  whatChanged: "A docs-only update refreshed examples.",
  whyItMatters: "Little to no production impact.",
  whoShouldCare: ["frontend"],
  affectedStack: ["database"],
  categories: ["docs"],
  publishedAt: "2026-04-18T09:00:00.000Z",
  sourceUrl: "https://firebase.google.com/support/release-notes",
  sourceType: "docs_page",
  importanceBand: "low",
};

const highSignal: MockEvent = {
  id: "stripe-breaking",
  slug: "stripe-subscription-schedules-update",
  vendorSlug: "stripe",
  vendorName: "Stripe",
  title: "Stripe updates subscription schedule phase end-date computation",
  sourceTitle: "Updates computation of subscription schedule phase end date to consider billing cycle anchor changes",
  summary: "Stripe now considers billing cycle anchor changes when it computes phase end dates.",
  whatChanged: "Stripe changed how schedule phase end dates are computed when billing cycle anchors move.",
  whyItMatters: "Teams using schedules may need to review billing logic.",
  whoShouldCare: ["backend", "product"],
  affectedStack: ["payments"],
  categories: ["breaking", "api"],
  publishedAt: "2025-09-30T00:00:00.000Z",
  sourceUrl: "https://docs.stripe.com/changelog/clover/2025-09-30/billing-cycle-anchor-resets-during-phase-computation",
  githubUrl: "https://github.com/stripe/stripe-node",
  sourceType: "changelog_page",
  importanceBand: "high",
};

describe("scoreEvent", () => {
  it("ranks breaking change events above docs-only events", () => {
    expect(scoreEvent(highSignal)).toBeGreaterThan(scoreEvent(lowSignal));
  });

  it("maps scores into stable importance bands", () => {
    expect(getImportanceBand(scoreEvent(highSignal))).toMatch(/critical|high/);
    expect(getImportanceBand(scoreEvent(lowSignal))).toBe("low");
  });
});

describe("rankEvents", () => {
  it("sorts the homepage feed by importance first", () => {
    expect(rankEvents([lowSignal, highSignal])[0]?.id).toBe("stripe-breaking");
  });
});
