import { describe, expect, it } from "vitest";

import { buildSignalQualityReport } from "@/lib/signal-observability";
import { events } from "@/lib/mock-data";

describe("buildSignalQualityReport", () => {
  it("summarizes release intelligence and legacy rows", () => {
    const report = buildSignalQualityReport(events);

    expect(report.total_events).toBe(events.length);
    expect(report.score_version.legacy_rows).toBeGreaterThan(0);
    expect(report.release_classes.length).toBeGreaterThan(0);
    expect(report.severities.length).toBeGreaterThan(0);
    expect(report.impact_confidences.map((row) => row.value)).toEqual(
      expect.arrayContaining(["high", "medium", "low"]),
    );
    expect(report.watchlist_ready.high_or_critical_count).toBeGreaterThan(0);
  });
});
