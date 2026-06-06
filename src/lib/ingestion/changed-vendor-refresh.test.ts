import { describe, expect, it } from "vitest";

import {
  extractVendorSlugs,
  filterVendorAffectingFiles,
  getChangedVendorSlugs,
  getVendorLineRanges,
} from "../../../scripts/lib/changed-vendor-refresh.mjs";

describe("changed vendor refresh helpers", () => {
  it("extracts vendor slugs from the registry source", () => {
    const source = `
      export const vendors = [
        { slug: "windsurf", name: "Devin Desktop" },
        { slug: "github", name: "GitHub" },
      ];
    `;

    expect(extractVendorSlugs(source)).toEqual(["github", "windsurf"]);
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
      { slug: "windsurf", name: "Windsurf" },
      { slug: "github", name: "GitHub" },
    `;

    expect(getVendorLineRanges(source)).toEqual([
      { slug: "windsurf", startLine: 2, endLine: 2 },
      { slug: "github", startLine: 3, endLine: 4 },
    ]);
  });

  it("does not match slugs from unrelated workflow path text", () => {
    const diffText = `
      diff --git a/.github/workflows/convex-production.yml b/.github/workflows/convex-production.yml
      + run: npm run vendors:production
    `;

    expect(getChangedVendorSlugs({ diffText, vendorSlugs: ["github"] })).toEqual([]);
  });
});
