import { describe, expect, it } from "vitest";

import { getSourceSurfaceUrl, type VendorSource } from "@/lib/mock-data";

function source(url: string, type: VendorSource["type"] = "rss"): VendorSource {
  return {
    name: "Test source",
    url,
    type,
  };
}

describe("getSourceSurfaceUrl", () => {
  it("maps GitHub release atom feeds to the human release page", () => {
    expect(getSourceSurfaceUrl(source("https://github.com/openclaw/openclaw/releases.atom"))).toBe(
      "https://github.com/openclaw/openclaw/releases",
    );
  });

  it("maps common changelog RSS feeds to their readable changelog page", () => {
    expect(getSourceSurfaceUrl(source("https://docs.factory.ai/changelog/release-notes/rss.xml"))).toBe(
      "https://docs.factory.ai/changelog/release-notes",
    );
    expect(getSourceSurfaceUrl(source("https://kiro.dev/changelog/feed.rss"))).toBe(
      "https://kiro.dev/changelog",
    );
    expect(getSourceSurfaceUrl(source("https://ampcode.com/news.rss"))).toBe("https://ampcode.com/news");
  });

  it("uses explicit human pages for provider-specific feed endpoints", () => {
    expect(getSourceSurfaceUrl(source("https://developers.google.com/feeds/gemini-code-assist-free-release-notes.xml"))).toBe(
      "https://developers.google.com/gemini-code-assist/resources/release-notes",
    );
    expect(getSourceSurfaceUrl(source("https://www.figma.com/release-notes/feed/atom.xml"))).toBe(
      "https://www.figma.com/release-notes/",
    );
  });

  it("maps machine-readable Markdown sources to their human-readable page when obvious", () => {
    expect(
      getSourceSurfaceUrl(
        source("https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/doc-history.md", "docs_page"),
      ),
    ).toBe("https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/doc-history.html");
    expect(getSourceSurfaceUrl(source("https://clerk.com/changelog.md", "changelog_page"))).toBe(
      "https://clerk.com/changelog",
    );
  });
});
