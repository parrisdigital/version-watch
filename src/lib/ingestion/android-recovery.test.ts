import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildFetchHeaders } from "../../../convex/ingest";
import { parseHtmlEntries } from "./source-ingestion";

const source = {
  url: "https://developer.android.com/about/versions/17/release-notes?hl=en",
  parserKey: "android-developers:docs_page",
  sourceType: "docs_page",
};
const html = readFileSync(new URL("./fixtures/android-release-notes.html", import.meta.url), "utf8");
const markdown = readFileSync(new URL("./fixtures/android-release-notes.md", import.meta.url), "utf8");
const expectedReleases = [
  ["Beta 4.1", "beta4_1", "2026-06-01"],
  ["Beta 4", "beta4", "2026-04-16"],
  ["Beta 3", "beta3", "2026-03-26"],
  ["Beta 2", "beta2", "2026-02-26"],
  ["Beta 1", "beta1", "2026-02-13"],
].map(([title, anchor, date]) => ({
  title: `Android 17 ${title}`,
  url: `https://developer.android.com/about/versions/17/release-notes#${anchor}`,
  publishedAt: Date.parse(`${date}T00:00:00.000Z`),
  parseConfidence: "high",
}));

describe("Android release-note recovery", () => {
  it("requests HTML and preserves the existing user agent, language, and cache validators", () => {
    const headers = buildFetchHeaders("test-agent", {
      ...source,
      etag: '"android-release-notes"',
      lastModified: "Mon, 02 Nov 2026 02:30:00 GMT",
    });

    expect(headers.Accept).toMatch(/^text\/html,/);
    expect(headers.Accept).not.toContain("text/markdown");
    expect(headers["User-Agent"]).toBe("test-agent");
    expect(headers["Accept-Language"]).toBe("en-US,en;q=0.9");
    expect(headers["If-None-Match"]).toBe('"android-release-notes"');
    expect(headers["If-Modified-Since"]).toBe("Mon, 02 Nov 2026 02:30:00 GMT");
  });

  it("negotiates the parseable representation instead of the date-in-table Markdown response", () => {
    // Google serves Markdown for the old Markdown-first Accept header. Dates
    // are in table cells rather than headings, so the generic parser yields no entries.
    expect(parseHtmlEntries({ parserKey: source.parserKey, sourceUrl: source.url, html: markdown })).toEqual([]);

    const headers = buildFetchHeaders("test-agent", source);
    const responseBody = headers.Accept.startsWith("text/markdown") ? markdown : html;
    const entries = parseHtmlEntries({ parserKey: source.parserKey, sourceUrl: source.url, html: responseBody });

    expect(entries).toHaveLength(5);
    expect(entries).toMatchObject(expectedReleases);
    expect(entries[0]?.excerpt).toContain("June 1, 2026");
    expect(entries[0]?.excerpt).toContain("CP21.260330.011");
  });

  it("parses release dates rather than security patch dates and preserves official anchors", () => {
    const entries = parseHtmlEntries({ parserKey: source.parserKey, sourceUrl: source.url, html });

    expect(entries).toHaveLength(5);
    expect(entries).toMatchObject(expectedReleases);
    expect(new Set(entries.map((entry) => entry.url)).size).toBe(5);
  });

  it("keeps direct feeds XML-first even with the Android parser preference", () => {
    const headers = buildFetchHeaders("test-agent", { ...source, url: "https://example.com/releases.atom" });

    expect(headers.Accept).toMatch(/^application\/rss\+xml,application\/atom\+xml/);
  });

  it("does not change other Markdown-first documentation sources", () => {
    const headers = buildFetchHeaders("test-agent", {
      url: "https://example.com/release-notes",
      parserKey: "example:docs_page",
      sourceType: "docs_page",
    });

    expect(headers.Accept).toMatch(/^text\/markdown,/);
  });
});
