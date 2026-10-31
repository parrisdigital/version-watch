import { readFileSync } from "node:fs";
import { hasMeaningfulTitle } from "../../../convex/ingestState";
import { describe, expect, it } from "vitest";
import { normalizeParsedEntry, parseHtmlEntries } from "@/lib/ingestion/source-ingestion";
import { getSourceSurfaceUrl, vendors } from "@/lib/mock-data";

const sourceUrl = "https://antigravity.google/docs/changelog";
const parse = (html: string) => parseHtmlEntries({ parserKey: "google-antigravity:changelog_page", sourceUrl, html });

describe("Antigravity docs changelog recovery", () => {
  it("extracts real dated releases from all product tabs, newest first", () => {
    const html = readFileSync(new URL("./fixtures/antigravity-docs-changelog.html", import.meta.url), "utf8");
    const entries = parse(html);
    expect(entries).toHaveLength(7);
    expect(entries.filter((entry) => entry.title.endsWith("v1.4.0")).map((entry) => entry.title).sort()).toEqual(["Antigravity JetBrains v1.4.0", "Antigravity Visual Studio Code v1.4.0"]);
    expect(entries.every((entry) => entry.parseConfidence === "high")).toBe(true);
    expect(entries.every((entry) => /^https:\/\/antigravity\.google\/(?:releases\?tab=|docs\/changelog#rel-)/.test(entry.url))).toBe(true);
    expect(entries.some((entry) => entry.title === "Antigravity App v2.28.2" && entry.publishedAt === Date.UTC(2026, 9, 29))).toBe(true);
    expect(entries.map((entry) => entry.publishedAt)).toEqual(entries.map((entry) => entry.publishedAt).sort((a, b) => b - a));
  });

  it("keeps same-version extensions distinct within the shared IDE Extensions panel", () => {
    const rows = ["vscode", "jetbrains"].map((product) => `<article class="release-entry" id="rel-${product}-1.4.0"><a class="rn-version-tag" href="/docs/ide/extensions/${product}">v1.4.0</a><time class="rn-date-text">October 12, 2026</time><details data-product="${product}"><p>A product-specific release.</p></details></article>`).join("");
    const entries = parse(`<div class="rn-panel"><h2 class="rn-panel-heading">IDE Extensions</h2>${rows}</div>`);
    expect(entries.map((entry) => entry.title)).toEqual(["Antigravity Visual Studio Code v1.4.0", "Antigravity JetBrains v1.4.0"]);
    expect(new Set(entries.map((entry) => entry.url)).size).toBe(2);
    const withoutDataProduct = rows.replace(/ data-product="[^"]+"/g, "");
    expect(parse(`<div class="rn-panel"><h2 class="rn-panel-heading">IDE Extensions</h2>${withoutDataProduct}</div>`).map((entry) => entry.title)).toEqual(entries.map((entry) => entry.title));
  });

  it("does not invent an index event when release rows are malformed or absent", () => {
    expect(parse('<main><h2>Antigravity App</h2><article class="release-entry"><a class="rn-version-tag" href="/releases?tab=hub&version=1.2.3">v1.2.3</a><time class="rn-date-text">not a date</time></article></main>')).toEqual([]);
    expect(parse('<title>Redirecting</title><script>location.href="/docs/changelog"</script>')).toEqual([]);
  });

  it("keeps distinct products with the same version and respects datetime attributes", () => {
    const html = ["App", "CLI"].map((product) => `<div class="rn-panel"><h2 class="rn-panel-heading">Antigravity ${product}</h2><article class="release-entry"><a class="rn-version-tag" href="/releases?tab=${product}&version=1.2.3">v1.2.3</a><time class="rn-date-text" datetime="2026-10-30">Localized date</time><div class="rn-summary">A real release summary.</div></article></div>`).join("");
    expect(parse(html)).toHaveLength(2);
    expect(parse(html)[0].publishedAt).toBe(Date.UTC(2026, 9, 30));
  });
});

describe("recovered source registry", () => {
  const expected = [
    ["windsurf", "https://docs.devin.ai/desktop/changelog/rss.xml", "https://docs.devin.ai/desktop/changelog"],
    ["exa", "https://exa.ai/docs/changelog/rss.xml", "https://exa.ai/docs/changelog"],
    ["langchain", "https://docs.langchain.com/langsmith/changelog/rss.xml", "https://docs.langchain.com/langsmith/changelog"],
    ["firecrawl", "https://www.firecrawl.dev/changelog/rss.xml", "https://www.firecrawl.dev/changelog"],
    ["linear", "https://linear.app/rss/changelog.xml", "https://linear.app/changelog"],
    ["vercel", "https://vercel.com/atom", "https://vercel.com/changelog"],
    ["google-antigravity", sourceUrl, sourceUrl],
  ];
  it.each(expected)("uses the verified source and readable surface for %s", (slug, url, surface) => {
    const source = vendors.find((vendor) => vendor.slug === slug)!.sources[0];
    expect(source.url).toBe(url);
    expect(getSourceSurfaceUrl(source)).toBe(surface);
  });
});


describe("Devin RSS publication titles", () => {
  it("retains the product label previously supplied by the Markdown adapter", () => {
    const item = normalizeParsedEntry({
      vendorSlug: "windsurf", vendorName: "Devin Desktop", sourceName: "Devin Desktop Changelog",
      sourceType: "changelog_page", entry: { title: "v3.11.238", url: "https://docs.devin.ai/desktop/changelog#v3-11-238", excerpt: "New model picker controls for enterprise users.", publishedAt: Date.UTC(2026, 9, 30) },
    });
    expect(item.title).toBe("Devin Desktop v3.11.238");
    expect(hasMeaningfulTitle(item.title, "https://docs.devin.ai/desktop/changelog/rss.xml")).toBe(true);
    expect(item.rawTitle).toBe("Devin Desktop v3.11.238");
  });
});
