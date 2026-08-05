import { describe, expect, it } from "vitest";

import { auditSourceLinks } from "@/lib/source-link-audit";
import { buildSourceLinkQualityReport } from "@/lib/source-link-quality";
import { events, vendors } from "@/lib/mock-data";

describe("source link audit", () => {
  it("accepts Resend changelog detail links from the registered RSS feed", () => {
    const report = auditSourceLinks({
      vendors: vendors.filter((vendor) => vendor.slug === "resend"),
      updates: [
        {
          id: "resend-auth0-integration",
          vendor_slug: "resend",
          title: "Auth0 Integration",
          source_url: "https://resend.com/changelog/auth0-integration",
          source_detail_url: "https://resend.com/changelog/auth0-integration",
          source_surface_url: "https://resend.com/changelog/index.xml",
        },
      ],
    });

    expect(report.error_count).toBe(0);
    expect(report.warning_count).toBe(0);
  });

  it("accepts detail links from registered Markdown changelog indexes", () => {
    const report = auditSourceLinks({
      vendors: [
        {
          slug: "clerk",
          sources: [{ name: "Clerk Changelog", type: "changelog_page", url: "https://clerk.com/changelog.md" }],
        },
      ],
      updates: [
        {
          id: "clerk-email-logs",
          vendor_slug: "clerk",
          title: "Email Logs public beta",
          source_url: "https://clerk.com/changelog/2026-06-01-email-logs-public-beta",
          source_detail_url: "https://clerk.com/changelog/2026-06-01-email-logs-public-beta",
          source_surface_url: "https://clerk.com/changelog.md",
        },
      ],
    });

    expect(report.error_count).toBe(0);
    expect(report.warning_count).toBe(0);
  });

  it("accepts legacy DP Code GitHub release details for Synara history", () => {
    const report = auditSourceLinks({
      vendors: vendors.filter((vendor) => vendor.slug === "dp-code"),
      updates: [
        {
          id: "dp-code-legacy-release",
          vendor_slug: "dp-code",
          title: "Synara v0.0.51",
          source_url: "https://github.com/Emanuele-web04/dpcode/releases/tag/v0.0.51",
          source_detail_url: "https://github.com/Emanuele-web04/dpcode/releases/tag/v0.0.51",
          source_surface_url: "https://github.com/Emanuele-web04/dpcode/releases.atom",
        },
      ],
    });

    expect(report.error_count).toBe(0);
    expect(report.warning_count).toBe(0);
  });

  it.each([
    {
      vendorSlug: "google-antigravity",
      title: "Google Antigravity 2.5.0",
      detailUrl: "https://www.antigravity.google/releases?tab=hub&version=2.5.0",
    },
    {
      vendorSlug: "google-antigravity",
      title: "Google Antigravity CLI 1.1.10",
      detailUrl: "https://www.antigravity.google/download#antigravity-cli",
    },
    {
      vendorSlug: "anthropic",
      title: "Claude Console workbench sunset",
      detailUrl: "https://platform.claude.com/workbench",
    },
    {
      vendorSlug: "anthropic",
      title: "Trusted devices for Remote Control",
      detailUrl: "https://code.claude.com/docs/en/remote-control#trusted-devices",
    },
    {
      vendorSlug: "openai",
      title: "Codex CLI 0.143.0",
      detailUrl: "https://learn.chatgpt.com/docs/changelog",
    },
  ])("accepts official detail links emitted by $vendorSlug release notes", ({ vendorSlug, title, detailUrl }) => {
    const report = auditSourceLinks({
      vendors: vendors.filter((vendor) => vendor.slug === vendorSlug),
      updates: [
        {
          id: `${vendorSlug}-official-linked-detail`,
          vendor_slug: vendorSlug,
          title,
          source_url: detailUrl,
          source_detail_url: detailUrl,
        },
      ],
    });

    expect(report.error_count).toBe(0);
    expect(report.warning_count).toBe(0);
  });

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
