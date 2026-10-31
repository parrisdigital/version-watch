import { describe, expect, it } from "vitest";

import { buildFetchHeaders, parseFeedEntries } from "../../../convex/ingest";

function atomFeed(urls: string[]) {
  return `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
    <title>Platform updates</title><id>https://example.com/feed</id>
    ${urls.map((url, index) => `<entry>
      <id>${url}</id><title>Update ${index}</title><link href="${url}"/>
      <updated>2026-10-30T12:00:00Z</updated><summary>Release details ${index}</summary>
    </entry>`).join("")}
  </feed>`;
}

describe("feed recovery request negotiation", () => {
  it("requests Synara HTML without changing other Markdown-first sources", () => {
    const headers = buildFetchHeaders("test-agent", {
      url: "https://www.trysynara.com/changelog",
      parserKey: "dp-code:changelog_page",
    });
    expect(headers.Accept).toMatch(/^text\/html,/);
    expect(headers.Accept).not.toContain("text/markdown");
    expect(headers["User-Agent"]).toBe("test-agent");
    expect(buildFetchHeaders("test-agent", {
      url: "https://example.com/changelog",
      parserKey: "example:changelog_page",
    }).Accept).toMatch(/^text\/markdown,/);
  });

  it.each([
    "https://vercel.com/atom",
    "https://www.vercel.com/atom/",
    "https://linear.app/rss/changelog.xml",
    "https://docs.devin.ai/desktop/changelog/rss.xml",
    "https://exa.ai/docs/changelog/rss.xml",
    "https://docs.langchain.com/langsmith/changelog/rss.xml",
    "https://www.firecrawl.dev/changelog/rss.xml",
    "https://github.com/example/project/releases.atom",
  ])("preserves XML-first headers and conditional caching for %s", (url) => {
    const headers = buildFetchHeaders("test-agent", {
      url,
      parserKey: "vercel:changelog_page",
      etag: '"version-1"',
      lastModified: "Fri, 30 Oct 2026 12:00:00 GMT",
    });
    expect(headers.Accept).toMatch(/^application\/rss\+xml,application\/atom\+xml/);
    expect(headers["If-None-Match"]).toBe('"version-1"');
    expect(headers["If-Modified-Since"]).toBe("Fri, 30 Oct 2026 12:00:00 GMT");
  });

  it("gives direct feeds priority over HTML-first parser preferences", () => {
    expect(buildFetchHeaders("test-agent", {
      url: "https://example.com/feed",
      parserKey: "dp-code:changelog_page",
    }).Accept).toMatch(/^application\/rss\+xml/);
  });
});

describe("feed recovery scoping", () => {
  const changelogUrls = Array.from({ length: 15 }, (_, index) => `https://vercel.com/changelog/release-${index}`);
  const unrelatedUrls = [
    ...Array.from({ length: 13 }, (_, index) => `https://vercel.com/blog/post-${index}`),
    "https://example.com/changelog/unrelated",
    "https://vercel.com/changelog-other/not-a-release",
  ];

  it.each(["https://vercel.com/atom", "https://www.vercel.com/atom/"])(
    "filters direct Vercel feed %s before the 12-entry limit",
    async (url) => {
      const entries = await parseFeedEntries(atomFeed([...unrelatedUrls, ...changelogUrls]), url);
      expect(entries.map((entry) => entry.url)).toEqual(changelogUrls.slice(0, 12));
      expect(entries[0]).toMatchObject({
        publishedAt: Date.parse("2026-10-30T12:00:00Z"),
        parseConfidence: "high",
      });
    },
  );

  it("filters discovered feeds before limiting, including posts after 12 unrelated entries", async () => {
    const entries = await parseFeedEntries(
      atomFeed([...unrelatedUrls, ...changelogUrls]),
      "https://vercel.com/changelog",
      "https://vercel.com/changelog",
    );
    expect(entries.map((entry) => entry.url)).toEqual(changelogUrls.slice(0, 12));
  });

  it("preserves unrelated direct feed entries rather than scoping to their feed URL", async () => {
    const urls = Array.from({ length: 15 }, (_, index) => `https://example.com/releases/${index}`);
    const entries = await parseFeedEntries(atomFeed(urls), "https://example.com/releases.atom");
    expect(entries.map((entry) => entry.url)).toEqual(urls.slice(0, 12));
  });

  it("preserves same-page fragment release links in discovered feeds", async () => {
    const url = "https://docs.devin.ai/desktop/changelog#v3-11-238";
    const entries = await parseFeedEntries(atomFeed([url]),
      "https://docs.devin.ai/desktop/changelog", "https://docs.devin.ai/desktop/changelog");
    expect(entries.map((entry) => entry.url)).toEqual([url]);
  });

  it("does not substitute blog entries when no scoped entries exist", async () => {
    expect(await parseFeedEntries(atomFeed(unrelatedUrls), "https://vercel.com/atom")).toEqual([]);
  });
});
