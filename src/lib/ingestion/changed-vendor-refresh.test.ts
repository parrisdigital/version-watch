import { describe, expect, it } from "vitest";

import {
  extractVendorSlugs,
  extractVendorSourceUrls,
  filterVendorAffectingFiles,
  getChangedVendorSlugs,
  getVendorLineRanges,
  hasOnlyUnsupportedSources,
} from "../../../scripts/lib/changed-vendor-refresh.mjs";

describe("changed vendor refresh helpers", () => {
  it("extracts vendor slugs from the registry source", () => {
    const source = `
      export const vendors = [
        { slug: "windsurf", name: "Devin Desktop" },
        { slug: "github", name: "GitHub" },
      ];
      const vendorNameBySlug = new Map(vendors.map((vendor) => [vendor.slug, vendor.name]));
      const eventSeeds = [
        { slug: "github-release-example", vendorSlug: "github" },
      ];
    `;

    expect(extractVendorSlugs(source)).toEqual(["github", "windsurf"]);
  });

  it("extracts source URLs for current registry vendors", () => {
    const source = `
      export const vendors = [
        {
          slug: "openrouter",
          sources: [{ name: "OpenRouter Changelog", url: "https://openrouter.ai/docs/changelog", type: "docs_page" }],
        },
        {
          slug: "tanstack",
          sources: [
            { name: "Query", url: "https://github.com/TanStack/query/releases.atom", type: "rss" },
            { name: "Router", url: "https://github.com/TanStack/router/releases.atom", type: "rss" },
          ],
        },
      ];
      const vendorNameBySlug = new Map(vendors.map((vendor) => [vendor.slug, vendor.name]));
    `;

    const sourceUrls = extractVendorSourceUrls(source);

    expect(sourceUrls.get("openrouter")).toEqual(["https://openrouter.ai/docs/changelog"]);
    expect(sourceUrls.get("tanstack")).toEqual([
      "https://github.com/TanStack/query/releases.atom",
      "https://github.com/TanStack/router/releases.atom",
    ]);
  });

  it("detects vendors whose current sources are intentionally unsupported", () => {
    const sourceUrls = new Map([
      ["openrouter", ["https://openrouter.ai/docs/changelog"]],
      ["mixed", ["https://openrouter.ai/docs/changelog", "https://example.com/feed.xml"]],
    ]);
    const unsupportedSourceUrls = new Set(["https://openrouter.ai/docs/changelog"]);

    expect(hasOnlyUnsupportedSources("openrouter", sourceUrls, unsupportedSourceUrls)).toBe(true);
    expect(hasOnlyUnsupportedSources("mixed", sourceUrls, unsupportedSourceUrls)).toBe(false);
    expect(hasOnlyUnsupportedSources("missing", sourceUrls, unsupportedSourceUrls)).toBe(false);
  });

  it("keeps only files that can affect vendor ingestion", () => {
    expect(
      filterVendorAffectingFiles([
        ".github/workflows/convex-production.yml",
        "README.md",
        "src/lib/ingestion/source-ingestion.test.ts",
        "src/lib/mock-data.ts",
        "src/lib/ingestion/source-ingestion.ts",
      ]),
    ).toEqual(["src/lib/ingestion/source-ingestion.ts", "src/lib/mock-data.ts"]);
  });

  it("detects slugs in changed registry hunks and parser keys", () => {
    const diffText = [
      "diff --git a/src/lib/mock-data.ts b/src/lib/mock-data.ts",
      "@@ -4,0 +4,1 @@",
      '+ name: "Devin Desktop",',
      "diff --git a/src/lib/ingestion/source-ingestion.ts b/src/lib/ingestion/source-ingestion.ts",
      "@@ -10,0 +10,1 @@",
      '+ if (parserKey === "shadcnblocks:changelog_page") {',
    ].join("\n");
    const vendorLineRanges = [{ slug: "windsurf", startLine: 2, endLine: 8 }];

    expect(
      getChangedVendorSlugs({
        diffText,
        vendorSlugs: ["github", "shadcnblocks", "windsurf"],
        vendorLineRanges,
      }),
    ).toEqual(["shadcnblocks", "windsurf"]);
  });

  it("maps registry line ranges to the current vendor slug", () => {
    const source = `
      export const vendors = [
      { slug: "windsurf", name: "Windsurf" },
      { slug: "github", name: "GitHub" },
      ];
      const vendorNameBySlug = new Map(vendors.map((vendor) => [vendor.slug, vendor.name]));
    `;

    expect(getVendorLineRanges(source)).toEqual([
      { slug: "windsurf", startLine: 3, endLine: 3 },
      { slug: "github", startLine: 4, endLine: 6 },
    ]);
  });

  it("ignores event seed slugs when mapping vendor line ranges", () => {
    const source = `
      export const vendors = [
        { slug: "docker", name: "Docker" },
      ];
      const vendorNameBySlug = new Map(vendors.map((vendor) => [vendor.slug, vendor.name]));
      const eventSeeds = [
        { slug: "docker-desktop-revises-networking-defaults", vendorSlug: "docker" },
      ];
    `;

    expect(getVendorLineRanges(source)).toEqual([{ slug: "docker", startLine: 3, endLine: 5 }]);
  });

  it("does not match slugs from unrelated workflow path text", () => {
    const diffText = `
      diff --git a/.github/workflows/convex-production.yml b/.github/workflows/convex-production.yml
      + run: npm run vendors:production
    `;

    expect(getChangedVendorSlugs({ diffText, vendorSlugs: ["github"] })).toEqual([]);
  });

  it("does not match vendor names or URL fragments as changed vendor slugs", () => {
    const diffText = [
      "diff --git a/src/lib/mock-data.ts b/src/lib/mock-data.ts",
      "@@ -4,0 +4,1 @@",
      '+ description: "Anthropic agent releases from GitHub.",',
      '+ sources: [{ name: "GitHub Releases", url: "https://github.com/anthropics/claude-code/releases.atom", type: "rss" }],',
    ].join("\n");

    expect(getChangedVendorSlugs({ diffText, vendorSlugs: ["anthropic", "claude-code", "github"] })).toEqual([]);
  });

  it("does not map structural insertion lines to the previous vendor", () => {
    const diffText = [
      "diff --git a/src/lib/mock-data.ts b/src/lib/mock-data.ts",
      "@@ -10,0 +10,2 @@",
      "+  {",
      '+    slug: "claude-code",',
    ].join("\n");
    const vendorLineRanges = [
      { slug: "t3-code", startLine: 10, endLine: 10 },
      { slug: "claude-code", startLine: 11, endLine: 12 },
    ];

    expect(
      getChangedVendorSlugs({
        diffText,
        vendorSlugs: ["claude-code", "t3-code"],
        vendorLineRanges,
      }),
    ).toEqual(["claude-code"]);
  });
});
