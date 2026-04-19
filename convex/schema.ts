import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  vendors: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    tier: v.optional(v.union(v.literal("a"), v.literal("b"))),
    homepageUrl: v.string(),
    isActive: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active_and_sort_order", ["isActive", "sortOrder"]),

  sources: defineTable({
    vendorId: v.id("vendors"),
    name: v.string(),
    sourceType: v.union(
      v.literal("github_release"),
      v.literal("changelog_page"),
      v.literal("docs_page"),
      v.literal("blog"),
      v.literal("rss"),
    ),
    url: v.string(),
    isPrimary: v.boolean(),
    pollIntervalMinutes: v.number(),
    parserKey: v.string(),
    isActive: v.boolean(),
    lastSuccessAt: v.optional(v.number()),
    lastFailureAt: v.optional(v.number()),
    consecutiveFailures: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_vendor", ["vendorId"])
    .index("by_vendor_and_url", ["vendorId", "url"])
    .index("by_url", ["url"]),

  rawCandidates: defineTable({
    vendorId: v.id("vendors"),
    sourceId: v.id("sources"),
    externalId: v.optional(v.string()),
    sourceUrl: v.string(),
    githubUrl: v.optional(v.string()),
    rawTitle: v.string(),
    rawBody: v.string(),
    rawPublishedAt: v.number(),
    discoveredAt: v.number(),
    checksum: v.optional(v.string()),
    parseConfidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    normalizationVersion: v.string(),
    proposedSummary: v.string(),
    proposedWhatChanged: v.string(),
    proposedWhyItMatters: v.string(),
    proposedWhoShouldCare: v.array(v.string()),
    proposedAffectedStack: v.array(v.string()),
    proposedCategories: v.array(v.string()),
    importanceScore: v.number(),
    importanceBand: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
    status: v.union(
      v.literal("pending_review"),
      v.literal("published"),
      v.literal("rejected"),
      v.literal("suppressed"),
    ),
    dedupeKey: v.string(),
  })
    .index("by_status_and_published", ["status", "rawPublishedAt"])
    .index("by_dedupe_key", ["dedupeKey"]),

  changeEvents: defineTable({
    vendorId: v.id("vendors"),
    sourceId: v.id("sources"),
    rawCandidateId: v.id("rawCandidates"),
    slug: v.string(),
    title: v.string(),
    summary: v.string(),
    whatChanged: v.string(),
    whyItMatters: v.string(),
    whoShouldCare: v.array(v.string()),
    affectedStack: v.array(v.string()),
    categories: v.array(v.string()),
    importanceScore: v.number(),
    importanceBand: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
    publishedAt: v.number(),
    discoveredAt: v.number(),
    sourceUrl: v.string(),
    githubUrl: v.optional(v.string()),
    visibility: v.union(v.literal("public"), v.literal("hidden")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_vendor_and_published", ["vendorId", "publishedAt"])
    .index("by_importance_and_published", ["importanceBand", "publishedAt"])
    .index("by_visibility_and_published", ["visibility", "publishedAt"]),

  eventLinks: defineTable({
    changeEventId: v.id("changeEvents"),
    linkType: v.string(),
    label: v.string(),
    url: v.string(),
    sortOrder: v.number(),
  }).index("by_event", ["changeEventId"]),

  reviewActions: defineTable({
    rawCandidateId: v.id("rawCandidates"),
    action: v.union(v.literal("approve"), v.literal("edit_publish"), v.literal("reject"), v.literal("suppress")),
    notes: v.optional(v.string()),
    performedAt: v.number(),
    performedBy: v.string(),
    diffSnapshot: v.optional(v.string()),
  }).index("by_candidate", ["rawCandidateId"]),

  ingestionRuns: defineTable({
    sourceId: v.id("sources"),
    vendorId: v.id("vendors"),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    status: v.union(v.literal("success"), v.literal("failure")),
    itemsFetched: v.number(),
    itemsCreated: v.number(),
    itemsDeduped: v.number(),
    errorMessage: v.optional(v.string()),
    runType: v.union(v.literal("scheduled"), v.literal("manual"), v.literal("deep_diff")),
  }).index("by_source_and_start", ["sourceId", "startedAt"]),
});
