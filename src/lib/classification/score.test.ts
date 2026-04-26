import { describe, expect, it } from "vitest";

import { getImportanceBand, rankEvents, scoreEvent } from "@/lib/classification/score";
import { deriveSignalMetadata, deriveSignalMetadataForEvents } from "@/lib/classification/signal";
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

  it("scores routine Codex CLI patch releases below frontier model launches", () => {
    const codexCliPatch: MockEvent = {
      ...highSignal,
      id: "codex-cli",
      slug: "codex-cli-0-125-0",
      vendorSlug: "openai",
      vendorName: "OpenAI",
      title: "Codex CLI 0.125.0",
      summary: "Codex CLI patch release.",
      whatChanged: "Codex CLI patch release.",
      affectedStack: ["llms", "agents", "developer-workflow"],
      categories: ["model", "api"],
      sourceType: "changelog_page",
      githubUrl: undefined,
    };
    const frontierModel: MockEvent = {
      ...codexCliPatch,
      id: "gpt-5-5",
      slug: "gpt-5-5",
      title: "Released GPT-5.5, a new frontier model for complex professional work, to the Chat Completions and Responses API.",
      summary: "Released GPT-5.5 to the Chat Completions and Responses API.",
      sourceType: "docs_page",
    };

    const patch = deriveSignalMetadata(codexCliPatch);
    const model = deriveSignalMetadata(frontierModel);

    expect(patch.releaseClass).toBe("cli_patch");
    expect(model.releaseClass).toBe("model_launch");
    expect(patch.importanceBand).toBe("medium");
    expect(model.signalScore).toBeGreaterThan(patch.signalScore);
  });

  it("decays repeated beta releases inside a 24 hour release family", () => {
    const releases = [1, 2, 3].map((patch) => ({
      ...highSignal,
      id: `openclaw-${patch}`,
      slug: `openclaw-${patch}`,
      vendorSlug: "openclaw",
      vendorName: "OpenClaw",
      title: `openclaw 2026.4.24-beta.${patch}`,
      summary: "OpenClaw beta release.",
      whatChanged: "OpenClaw beta release.",
      categories: ["api"],
      affectedStack: ["agents", "developer-workflow"],
      sourceType: "github_release" as const,
      publishedAt: `2026-04-24T0${3 - patch}:00:00.000Z`,
    }));
    const scored = deriveSignalMetadataForEvents(releases);

    expect(scored[0]?.metadata.releaseClass).toBe("beta_release");
    expect(scored[1]?.metadata.signalReasons).toContain("repeat_decay:-10");
    expect(scored[2]?.metadata.signalScore).toBeLessThan(scored[0]!.metadata.signalScore);
  });

  it("builds concise display titles for long OpenAI sentence entries", () => {
    const metadata = deriveSignalMetadata({
      ...highSignal,
      vendorSlug: "openai",
      vendorName: "OpenAI",
      title:
        "Released GPT-5.5, a new frontier model for complex professional work, to the Chat Completions and Responses API, and released GPT-5.5 pro for Responses API requests.",
      summary: "Released GPT-5.5 and GPT-5.5 pro.",
      categories: ["model", "api"],
      affectedStack: ["llms", "agents"],
      sourceType: "docs_page",
    });

    expect(metadata.displayTitle).toBe("GPT-5.5 and GPT-5.5 pro released");
    expect(metadata.topicTags).toContain("frontier-model");
    expect(metadata.whyItMatters).not.toMatch(/review the official entry/i);
  });
});

describe("rankEvents", () => {
  it("sorts the homepage feed by importance first", () => {
    expect(rankEvents([lowSignal, highSignal])[0]?.id).toBe("stripe-breaking");
  });
});
