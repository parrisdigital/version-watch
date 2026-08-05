import { adjustPublicEventStats } from "../publicStats";

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

const DATE_RANGE_TITLE_PATTERN =
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]* \d{1,2}\s*-\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+)?\d{1,2}$/i;
const GENERIC_SECTION_TITLES = new Set([
  "bug fixes",
  "enhancements",
  "features",
  "fixes",
  "improvements",
  "new features",
  "updates",
]);

export function isStaleDuplicateEventTitle(title: string) {
  const normalized = cleanText(title).toLowerCase();
  return DATE_RANGE_TITLE_PATTERN.test(normalized) || GENERIC_SECTION_TITLES.has(normalized);
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
    sourceTitle: rawCandidate.rawTitle,
    githubUrl: rawCandidate.githubUrl,
    visibility: "public" as const,
    updatedAt: Date.now(),
  };
  const wasPublic = existingEvent?.visibility === "public";
  const wasHighSignal = wasPublic && (existingEvent.importanceBand === "critical" || existingEvent.importanceBand === "high");
  const isHighSignal = rawCandidate.importanceBand === "critical" || rawCandidate.importanceBand === "high";

  async function updateStats() {
    await adjustPublicEventStats(ctx, {
      vendorSlug: vendor.slug,
      eventDelta: wasPublic ? 0 : 1,
      highSignalDelta: Number(isHighSignal) - Number(wasHighSignal),
      audiences: rawCandidate.proposedWhoShouldCare,
      tags: [
        ...rawCandidate.proposedCategories,
        ...(rawCandidate.proposedTopicTags ?? []),
        ...rawCandidate.proposedAffectedStack,
      ],
      sourceType: source.sourceType,
    });
  }

  if (existingEvent) {
    await ctx.db.patch(existingEvent._id, eventPayload);
    await updateStats();
    return existingEvent._id;
  }

  const eventId = await ctx.db.insert("changeEvents", {
    ...eventPayload,
    createdAt: Date.now(),
  });
  await updateStats();
  return eventId;
}

export async function hideStaleDuplicateEvents(ctx: any, rawCandidate: any, activeEventId: any) {
  const duplicateEvents = await ctx.db
    .query("changeEvents")
    .withIndex("by_vendor_and_published", (q: any) =>
      q.eq("vendorId", rawCandidate.vendorId).eq("publishedAt", rawCandidate.rawPublishedAt),
    )
    .take(100);
  let hidden = 0;
  const vendor = await ctx.db.get(rawCandidate.vendorId);

  for (const event of duplicateEvents) {
    if (
      event._id === activeEventId ||
      event.visibility !== "public" ||
      event.sourceId !== rawCandidate.sourceId ||
      event.sourceUrl !== rawCandidate.sourceUrl ||
      !isStaleDuplicateEventTitle(event.title)
    ) {
      continue;
    }

    await ctx.db.patch(event._id, {
      visibility: "hidden" as const,
      updatedAt: Date.now(),
    });
    if (vendor) {
      await adjustPublicEventStats(ctx, {
        vendorSlug: vendor.slug,
        eventDelta: -1,
        highSignalDelta: event.importanceBand === "critical" || event.importanceBand === "high" ? -1 : 0,
      });
    }
    hidden += 1;
  }

  return hidden;
}

export async function hidePublishedRawCandidate(ctx: any, rawCandidateId: any) {
  const existingEvent = await ctx.db
    .query("changeEvents")
    .withIndex("by_raw_candidate", (q: any) => q.eq("rawCandidateId", rawCandidateId))
    .unique();

  if (!existingEvent || existingEvent.visibility !== "public") {
    return null;
  }

  await ctx.db.patch(existingEvent._id, {
    visibility: "hidden" as const,
    updatedAt: Date.now(),
  });
  const vendor = await ctx.db.get(existingEvent.vendorId);
  if (vendor) {
    await adjustPublicEventStats(ctx, {
      vendorSlug: vendor.slug,
      eventDelta: -1,
      highSignalDelta:
        existingEvent.importanceBand === "critical" || existingEvent.importanceBand === "high" ? -1 : 0,
    });
  }

  return existingEvent._id;
}
