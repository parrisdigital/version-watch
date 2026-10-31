import { describe, expect, it } from "vitest";
import { auditSourceLinks } from "@/lib/source-link-audit";

const scriptModuleUrl = new URL("../../scripts/lib/source-link-audit.mjs", import.meta.url).href;

describe.each(["application", "script"])("%s audit feed recovery", (implementation) => {
  async function audit(source: { url: string; type: string; surface_url?: string; surfaceUrl?: string },
    detail: string, slug = "example") {
    const auditFn = implementation === "application" ? auditSourceLinks :
      (await import(scriptModuleUrl)).auditSourceLinks as typeof auditSourceLinks;
    return auditFn({
      vendors: [{ slug, sources: [{ name: "Changelog", ...source }] }],
      updates: [{ id: "release", vendor_slug: slug, title: "A real release", source_url: detail }],
    });
  }

  it.each(["surface_url", "surfaceUrl"])("uses %s for migrated feeds that retain their source type", async (key) => {
    for (const type of ["changelog_page", "docs_page"]) {
      const source = { url: "https://example.com/changelog/rss.xml", type,
        [key]: "https://example.com/changelog" };
      for (const detail of ["https://example.com/changelog#release-1", "https://example.com/changelog/release-1"]) {
        expect((await audit(source, detail)).warning_count).toBe(0);
      }
    }
  });

  it.each([
    "https://example.com/blog/release-1",
    "https://example.com/changelog-other/release-1",
    "https://other.example/changelog/release-1",
  ])("rejects unrelated entry %s", async (detail) => {
    expect((await audit({ url: "https://example.com/rss/changelog.xml", type: "changelog_page",
      surface_url: "https://example.com/changelog" }, detail)).warning_count).toBe(1);
  });

  it.each(["https://other.example/changelog", "https://example.com/"])(
    "does not expand coverage through surface %s", async (surface_url) => {
      const detail = surface_url.includes("other.example") ? `${surface_url}/release-1` : `${surface_url}unrelated`;
      expect((await audit({ url: "https://example.com/changelog/rss.xml", type: "docs_page", surface_url }, detail)).warning_count).toBe(1);
    },
  );

  it("preserves explicit blog blocklists even when a surface would cover the URL", async () => {
    const report = await audit({ url: "https://vercel.com/atom", type: "rss",
      surface_url: "https://vercel.com/blog" }, "https://vercel.com/blog/not-a-changelog", "vercel");
    expect(report.error_count).toBe(1);
  });
});
