import { describe, expect, it } from "vitest";

import { clusterChangeEvents } from "@/lib/change-clusters";
import { deriveSignalMetadata } from "@/lib/classification/signal";
import type { MockEvent } from "@/lib/mock-data";

const baseEvent: MockEvent = {
  id: "openclaw-2026-4-24-beta-1",
  slug: "openclaw-2026-4-24-beta-1",
  vendorSlug: "openclaw",
  vendorName: "OpenClaw",
  title: "OpenClaw 2026.4.24-beta.1",
  summary: "OpenClaw beta release.",
  whatChanged: "OpenClaw beta release.",
  whyItMatters: "OpenClaw beta release.",
  whoShouldCare: ["backend", "ai"],
  affectedStack: ["agents", "developer-workflow"],
  categories: ["api"],
  publishedAt: "2026-04-24T12:00:00.000Z",
  sourceUrl: "https://github.com/openclaw/openclaw/releases",
  sourceType: "github_release",
  importanceBand: "medium",
};

describe("clusterChangeEvents", () => {
  it("clusters same-vendor release-family noise inside a 24 hour window", () => {
    const events = [1, 2, 3].map((patch) => ({
      ...baseEvent,
      id: `openclaw-2026-4-24-beta-${patch}`,
      slug: `openclaw-2026-4-24-beta-${patch}`,
      title: `OpenClaw 2026.4.24-beta.${patch}`,
      publishedAt: `2026-04-24T1${3 - patch}:00:00.000Z`,
    }));

    const clusters = clusterChangeEvents(events, { minClusterSize: 3, windowHours: 24 });

    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({
      kind: "cluster",
      vendorSlug: "openclaw",
      releaseClass: "beta_release",
      updateCount: 3,
      title: "OpenClaw shipped 3 beta releases in 24 hours",
    });
  });

  it("keeps unrelated or distant releases as raw single entries", () => {
    const events = [
      baseEvent,
      {
        ...baseEvent,
        id: "openclaw-2026-4-24-beta-2",
        slug: "openclaw-2026-4-24-beta-2",
        title: "OpenClaw 2026.4.24-beta.2",
        publishedAt: "2026-04-22T12:00:00.000Z",
      },
      {
        ...baseEvent,
        id: "openai-gpt-5-5",
        slug: "openai-gpt-5-5",
        vendorSlug: "openai",
        vendorName: "OpenAI",
        title: "Released GPT-5.5, a new frontier model for complex professional work.",
        sourceUrl: "https://developers.openai.com/api/docs/changelog",
        sourceType: "docs_page" as const,
        publishedAt: "2026-04-24T11:00:00.000Z",
      },
    ];

    const clusters = clusterChangeEvents(events, { minClusterSize: 2, windowHours: 24 });

    expect(clusters.every((cluster) => cluster.kind === "single")).toBe(true);
    expect(clusters.map((cluster) => cluster.updateCount)).toEqual([1, 1, 1]);
  });

  it("derives v2 cluster scores when stored event scores are still legacy", () => {
    const event = {
      ...baseEvent,
      computedScore: 58,
      scoreVersion: undefined,
    };

    const [cluster] = clusterChangeEvents([event], { minClusterSize: 2, windowHours: 24 });

    expect(cluster?.signalScore).toBe(deriveSignalMetadata(event).signalScore);
    expect(cluster?.signalScore).toBeLessThan(58);
  });
});
