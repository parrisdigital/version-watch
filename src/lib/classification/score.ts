import { parseISO } from "date-fns";

import type { ImportanceBand, MockEvent, SourceType } from "@/lib/mock-data";

const sourceWeights: Record<SourceType, number> = {
  github_release: 20,
  changelog_page: 20,
  docs_page: 8,
  blog: 12,
  rss: 10,
};

const categoryWeights: Record<string, number> = {
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

function getFreshnessWeight(publishedAt: string): number {
  const ageMs = Date.now() - parseISO(publishedAt).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (ageMs <= dayMs) return 15;
  if (ageMs <= dayMs * 3) return 10;
  if (ageMs <= dayMs * 7) return 5;
  return 0;
}

export function scoreEvent(event: MockEvent): number {
  const categoryScore = event.categories.reduce((total, category) => total + (categoryWeights[category] ?? 0), 0);
  const sourceScore = sourceWeights[event.sourceType] ?? 0;
  const freshnessScore = getFreshnessWeight(event.publishedAt);
  const evidenceScore = event.githubUrl ? 5 : 0;
  const total = categoryScore + sourceScore + freshnessScore + evidenceScore;

  if (event.categories.length === 1 && event.categories[0] === "docs" && !event.githubUrl) {
    return Math.min(total, 25);
  }

  return total;
}

export function getImportanceBand(score: number): ImportanceBand {
  if (score >= 70) return "critical";
  if (score >= 50) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export function rankEvents(events: MockEvent[]): MockEvent[] {
  return [...events].sort((a, b) => {
    const scoreDiff = scoreEvent(b) - scoreEvent(a);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}
