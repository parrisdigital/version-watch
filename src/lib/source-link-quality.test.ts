import { describe, expect, it } from "vitest";

import { auditSourceLinks } from "@/lib/source-link-audit";
import { buildSourceLinkQualityReport } from "@/lib/source-link-quality";
import { events, vendors } from "@/lib/mock-data";

describe("source link audit", () => {
  it("flags known blog URLs published from changelog sources", () => {
    const report = auditSourceLinks({
      vendors: vendors.filter((vendor) => vendor.slug === "supabase"),
      updates: [
        {
          id: "supabase-bad-link",
          vendor_slug: "supabase",
          title: "Supabase blog item",
          source_url: "https://supabase.com/blog/example",
          source_detail_url: "https://supabase.com/blog/example",
          source_surface_url: "https://supabase.com/changelog",
        },
      ],
    });

    expect(report.error_count).toBe(1);
    expect(report.findings[0]).toMatchObject({
      level: "error",
      vendor_slug: "supabase",
      reason: "Known blog/news URL was published from a changelog source.",
    });
  });
});

describe("buildSourceLinkQualityReport", () => {
  it("summarizes source audit state by source surface", () => {
    const supabaseVendor = vendors.find((vendor) => vendor.slug === "supabase")!;
    const event = {
      ...events[0]!,
      id: "supabase-bad-link",
      slug: "supabase-bad-link",
      vendorSlug: "supabase",
      vendorName: "Supabase",
      sourceUrl: "https://supabase.com/blog/example",
      sourceSurfaceUrl: "https://supabase.com/changelog",
      sourceSurfaceName: "Supabase Changelog",
      sourceSurfaceType: "changelog_page" as const,
      sourceType: "changelog_page" as const,
    };

    const report = buildSourceLinkQualityReport({
      vendors: [supabaseVendor],
      events: [event],
      freshnessReport: {
        checkedAt: "2026-04-26T22:00:00.000Z",
        sources: [
          {
            vendorName: "Supabase",
            vendorSlug: "supabase",
            sourceName: "Supabase Changelog",
            sourceUrl: "https://supabase.com/changelog",
            lifecycleState: "active",
            status: "healthy",
            freshnessTier: "critical",
            lastAttemptAt: "2026-04-26T21:55:00.000Z",
            lastSuccessAt: "2026-04-26T21:55:00.000Z",
          },
        ],
      },
      generatedAt: "2026-04-26T22:00:00.000Z",
    });

    expect(report.checked_updates).toBe(1);
    expect(report.error_count).toBe(1);
    expect(report.rows[0]).toMatchObject({
      vendor_slug: "supabase",
      audit_status: "error",
      parser_confidence: "low",
      error_count: 1,
      update_count: 1,
      freshness_tier: "critical",
    });
  });
});
