import { describe, expect, it } from "vitest";
import { vendors } from "@/lib/mock-data";
import { resolveRegistrySource, syncVendorRegistryRecords } from "../../../convex/seed";

const oldUrls: Record<string, string> = {
  windsurf: "https://docs.devin.ai/desktop/changelog",
  exa: "https://exa.ai/docs/changelog",
  langchain: "https://docs.langchain.com/langsmith/changelog",
  firecrawl: "https://www.firecrawl.dev/changelog",
  linear: "https://linear.app/changelog",
  vercel: "https://vercel.com/changelog",
  "google-antigravity": "https://www.antigravity.google/changelog",
};

type Doc = { _id: string; [key: string]: unknown };

function mockContext() {
  const rows: Record<string, Doc[]> = { vendors: [], sources: [], rawCandidates: [], reviewActions: [], ingestionRuns: [] };
  const reads: { table: string; index: string; fields: string[]; limit?: number }[] = [];
  let inserted = 0;
  const ctx = { db: {
    query(table: string) {
      return { withIndex(index: string, build: (q: { eq(field: string, value: unknown): unknown }) => unknown) {
        const conditions: [string, unknown][] = [];
        const q = { eq(field: string, value: unknown) { conditions.push([field, value]); return q; } };
        build(q);
        const matches = () => rows[table].filter((row) => conditions.every(([field, value]) => row[field] === value));
        return {
          async unique() {
            reads.push({ table, index, fields: conditions.map(([field]) => field) });
            const found = matches();
            if (found.length > 1) throw new Error("Duplicate indexed record");
            return found[0] ? { ...found[0] } : null;
          },
          async take(limit: number) {
            reads.push({ table, index, fields: conditions.map(([field]) => field), limit });
            return matches().slice(0, limit).map((row) => ({ ...row }));
          },
        };
      } };
    },
    async insert(table: string, payload: Record<string, unknown>) {
      const _id = `inserted-${++inserted}`;
      rows[table].push({ _id, ...payload });
      return _id;
    },
    async patch(id: string, payload: Record<string, unknown>) {
      const row = Object.values(rows).flat().find((doc) => doc._id === id);
      if (!row) throw new Error(`Missing ${id}`);
      for (const [key, value] of Object.entries(payload)) {
        if (value === undefined) delete row[key];
        else row[key] = value;
      }
    },
  } };
  return { ctx, rows, reads };
}

function populatedRegistry() {
  const mock = mockContext();
  for (const vendor of vendors) {
    const vendorId = `vendor-${vendor.slug}`;
    mock.rows.vendors.push({ _id: vendorId, slug: vendor.slug });
    vendor.sources.forEach((source, index) => {
      const sourceId = `source-${vendor.slug}-${index}`;
      mock.rows.sources.push({
        _id: sourceId, vendorId, url: index === 0 ? oldUrls[vendor.slug] ?? source.url : source.url,
        isActive: true, lifecycleState: "degraded", consecutiveFailures: 15,
        lastSuccessAt: 100, lastAttemptAt: 200, lastFailureAt: 200,
        nextDueAt: 900, backoffUntil: 900, lastErrorCode: "empty_result", notes: "Keep source history",
        etag: '"old-etag"', lastModified: "old-date", contentHash: "old-hash", createdAt: 50,
      });
      if (oldUrls[vendor.slug] && index === 0) {
        mock.rows.rawCandidates.push({ _id: `candidate-${vendor.slug}`, sourceId, status: "rejected" });
        mock.rows.reviewActions.push({ _id: `review-${vendor.slug}`, candidateId: `candidate-${vendor.slug}`, action: "reject" });
        mock.rows.ingestionRuns.push({ _id: `run-${vendor.slug}`, sourceId, status: "failure" });
      }
    });
  }
  return mock;
}

describe("identity-preserving source URL migration", () => {
  it("moves all seven exact sources in place, preserves references and clears only old cache validators", async () => {
    const { ctx, rows, reads } = populatedRegistry();
    const related = JSON.stringify([rows.rawCandidates, rows.reviewActions, rows.ingestionRuns]);
    const originalCount = rows.sources.length;
    const result = await syncVendorRegistryRecords(ctx);
    expect(result.sourceCount).toBe(0);
    expect(rows.sources).toHaveLength(originalCount);
    for (const slug of Object.keys(oldUrls)) {
      const source = rows.sources.find((row) => row._id === `source-${slug}-0`)!;
      expect(source.url).toBe(vendors.find((vendor) => vendor.slug === slug)!.sources[0].url);
      expect(source).toMatchObject({ createdAt: 50, consecutiveFailures: 15, lifecycleState: "degraded",
        lastSuccessAt: 100, lastAttemptAt: 200, lastFailureAt: 200, nextDueAt: 900, backoffUntil: 900,
        lastErrorCode: "empty_result", notes: "Keep source history", isActive: true });
      for (const field of ["etag", "lastModified", "contentHash"]) expect(source).not.toHaveProperty(field);
      expect(result.sourceIds.get(`${slug}:${source.url}`)).toBe(source._id);
    }
    expect(JSON.stringify([rows.rawCandidates, rows.reviewActions, rows.ingestionRuns])).toBe(related);
    expect(rows.sources.find((row) => row._id === "source-stripe-0")).toMatchObject({
      url: "https://docs.stripe.com/changelog", etag: '"old-etag"', lastModified: "old-date", contentHash: "old-hash",
    });
    expect(reads.every((read) => ["by_slug", "by_vendor_and_url", "by_vendor"].includes(read.index))).toBe(true);
    expect(reads.filter((read) => read.limit !== undefined).every((read) => read.limit === 51)).toBe(true);
  });

  it("is idempotent and preserves newly obtained validators on the second sync", async () => {
    const { ctx, rows } = populatedRegistry();
    await syncVendorRegistryRecords(ctx);
    const originalIds = rows.sources.map((source) => source._id);
    for (const slug of Object.keys(oldUrls)) {
      await ctx.db.patch(`source-${slug}-0`, { etag: '"new-etag"', contentHash: "new-hash", lastModified: "new-date" });
    }
    const result = await syncVendorRegistryRecords(ctx);
    expect(result.sourceCount).toBe(0);
    expect(rows.sources.map((source) => source._id)).toEqual(originalIds);
    for (const slug of Object.keys(oldUrls)) {
      expect(rows.sources.find((source) => source._id === `source-${slug}-0`)).toMatchObject({
        etag: '"new-etag"', contentHash: "new-hash", lastModified: "new-date",
      });
    }
  });

  it.each(Object.keys(oldUrls))("fails closed on a distinct old/new collision for %s", async (slug) => {
    const { ctx, rows } = populatedRegistry();
    const vendorId = `vendor-${slug}`;
    const targetUrl = vendors.find((vendor) => vendor.slug === slug)!.sources[0].url;
    rows.sources.push({ _id: "distinct-target", vendorId, url: targetUrl, isActive: false });
    const before = JSON.stringify(rows);
    await expect(resolveRegistrySource(ctx, vendorId, slug, targetUrl)).rejects.toThrow(`Source URL migration collision for ${slug}`);
    expect(JSON.stringify(rows)).toBe(before);
  });

  it("does not infer migrations from vendor names, nearby URLs or other vendor IDs", async () => {
    const { ctx, rows, reads } = populatedRegistry();
    expect(await resolveRegistrySource(ctx, "vendor-exa", "exa", "https://exa.ai/docs/changelog/other.xml")).toBeNull();
    expect(await resolveRegistrySource(ctx, "vendor-stripe", "exa", "https://exa.ai/docs/changelog/rss.xml")).toBeNull();
    const target = "https://exa.ai/docs/changelog/rss.xml";
    expect(await resolveRegistrySource(ctx, "vendor-exa", "unknown-vendor", target)).toBeNull();
    expect(rows.sources.find((row) => row._id === "source-exa-0")!.url).toBe(oldUrls.exa);
    expect(reads.every((read) => read.index === "by_vendor_and_url" && read.fields.join(",") === "vendorId,url")).toBe(true);
  });
});
