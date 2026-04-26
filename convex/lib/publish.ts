function cleanText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function slugify(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function buildCandidateSlug(vendorSlug: string, publishedAt: number, title: string) {
  const datePrefix = new Date(publishedAt).toISOString().slice(0, 10);
  return slugify(`${vendorSlug}-${datePrefix}-${title}`);
}

export async function publishRawCandidate(ctx: any, rawCandidate: any) {
  const vendor = await ctx.db.get(rawCandidate.vendorId);
  const source = await ctx.db.get(rawCandidate.sourceId);

  if (!vendor || !source) {
    return null;
  }

  const title = rawCandidate.proposedTitle ?? rawCandidate.rawTitle;
  const slug = buildCandidateSlug(vendor.slug, rawCandidate.rawPublishedAt, title);
  const existingByCandidate = await ctx.db
    .query("changeEvents")
    .withIndex("by_raw_candidate", (q: any) => q.eq("rawCandidateId", rawCandidate._id))
    .unique();
  const existingBySlug = await ctx.db
    .query("changeEvents")
    .withIndex("by_slug", (q: any) => q.eq("slug", slug))
    .unique();
  const existingEvent = existingByCandidate ?? existingBySlug;

  const eventPayload = {
    vendorId: rawCandidate.vendorId,
    sourceId: rawCandidate.sourceId,
    rawCandidateId: rawCandidate._id,
    slug,
    title,
    summary: rawCandidate.proposedSummary,
    whatChanged: rawCandidate.proposedWhatChanged,
    whyItMatters: rawCandidate.proposedWhyItMatters,
    whoShouldCare: rawCandidate.proposedWhoShouldCare,
    affectedStack: rawCandidate.proposedAffectedStack,
    categories: rawCandidate.proposedCategories,
    topicTags: rawCandidate.proposedTopicTags,
    releaseClass: rawCandidate.releaseClass,
    impactConfidence: rawCandidate.impactConfidence,
    signalReasons: rawCandidate.signalReasons,
    scoreVersion: rawCandidate.scoreVersion,
    importanceScore: rawCandidate.importanceScore,
    importanceBand: rawCandidate.importanceBand,
    publishedAt: rawCandidate.rawPublishedAt,
    discoveredAt: rawCandidate.discoveredAt,
    sourceUrl: rawCandidate.sourceUrl,
    githubUrl: rawCandidate.githubUrl,
    visibility: "public" as const,
    updatedAt: Date.now(),
  };

  if (existingEvent) {
    await ctx.db.patch(existingEvent._id, eventPayload);
    return existingEvent._id;
  }

  return await ctx.db.insert("changeEvents", {
    ...eventPayload,
    createdAt: Date.now(),
  });
}
