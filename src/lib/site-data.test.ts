import { describe, expect, it } from "vitest";

import { formatRelevanceSignals, type RawRelevanceSignalEntry } from "@/lib/site-data";

describe("formatRelevanceSignals", () => {
  it("adds admin-facing labels and event URLs", () => {
    const entries: RawRelevanceSignalEntry[] = [
      {
        _id: "signal-1",
        eventSlug: "openai-gpt-5-release",
        signal: "needs_review",
        area: "api",
        note: "Check compatibility before rollout.",
        userAgent: "Version Watch test",
        createdAt: Date.UTC(2026, 3, 30, 14, 0),
        eventTitle: "OpenAI releases GPT-5",
        eventVisibility: "public",
        vendorName: "OpenAI",
        vendorSlug: "openai",
      },
    ];

    expect(formatRelevanceSignals(entries)).toEqual([
      {
        ...entries[0],
        signalLabel: "Needs review",
        areaLabel: "API",
        eventTitle: "OpenAI releases GPT-5",
        vendorName: "OpenAI",
        eventUrl: "/events/openai-gpt-5-release",
      },
    ]);
  });

  it("falls back to stable identifiers when the source event is missing", () => {
    const entries: RawRelevanceSignalEntry[] = [
      {
        _id: "signal-2",
        eventSlug: "missing-event",
        signal: "impacted",
        area: "other",
        createdAt: Date.UTC(2026, 3, 30, 14, 15),
      },
    ];

    const [formatted] = formatRelevanceSignals(entries);

    expect(formatted).toMatchObject({
      eventTitle: "missing-event",
      vendorName: "Unknown vendor",
      eventUrl: "/events/missing-event",
      signalLabel: "Impacted us",
      areaLabel: "Other",
    });
  });
});
