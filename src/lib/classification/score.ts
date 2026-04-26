import type { ImportanceBand, MockEvent, SourceType } from "@/lib/mock-data";
import {
  deriveSignalMetadata,
  deriveSignalMetadataForEvents,
  getImportanceBand as getSignalImportanceBand,
} from "@/lib/classification/signal";

export const legacySourceWeights: Record<SourceType, number> = {
  github_release: 20,
  changelog_page: 20,
  docs_page: 8,
  blog: 12,
  rss: 10,
};

export const legacyCategoryWeights: Record<string, number> = {
  breaking: 40,
  deprecation: 35,
  security: 35,
  pricing: 25,
  policy: 25,
  model: 20,
  api: 18,
  sdk: 18,
  infra: 15,
  docs: 5,
};

export function scoreEvent(event: MockEvent): number {
  const storedScore = (event as MockEvent & { computedScore?: number }).computedScore;
  return event.scoreVersion === "v2" && typeof storedScore === "number"
    ? storedScore
    : deriveSignalMetadata(event).signalScore;
}

export function getImportanceBand(score: number): ImportanceBand {
  return getSignalImportanceBand(score);
}

export function rankEvents(events: MockEvent[]): MockEvent[] {
  const scored = deriveSignalMetadataForEvents(events);
  const scoreBySlug = new Map(scored.map(({ event, metadata }) => [event.slug, metadata.signalScore]));

  return [...events].sort((a, b) => {
    const scoreDiff = (scoreBySlug.get(b.slug) ?? scoreEvent(b)) - (scoreBySlug.get(a.slug) ?? scoreEvent(a));
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}
