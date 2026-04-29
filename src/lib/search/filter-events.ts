import { deriveSignalMetadata } from "@/lib/classification/signal";
import type { ImportanceBand, MockEvent, SourceType } from "@/lib/mock-data";

export type SinceWindow = "" | "7d" | "30d" | "90d";

export type SearchFilters = {
  query?: string;
  vendor?: string;
  category?: string;
  stack?: string;
  /** Merged categories + affected-stack facet. Matches either array. */
  topic?: string;
  since?: SinceWindow;
  sourceType?: SourceType | "";
  importance?: ImportanceBand | "";
};

export type SearchFacet = {
  value: string;
  label: string;
  count: number;
};

const WINDOW_MS: Record<Exclude<SinceWindow, "">, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getSignal(event: MockEvent) {
  return deriveSignalMetadata(event);
}

function getEventTopicTags(event: MockEvent) {
  return event.topicTags?.length ? event.topicTags : getSignal(event).topicTags;
}

function getEventImportanceBand(event: MockEvent) {
  return event.scoreVersion === "v2" ? event.importanceBand : getSignal(event).importanceBand;
}

function isWithinWindow(publishedAt: string, since: SinceWindow, now: number): boolean {
  if (!since) return true;
  const ms = WINDOW_MS[since];
  if (!ms) return true;
  const publishedMs = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedMs)) return false;
  return now - publishedMs <= ms;
}

export function filterEvents<T extends MockEvent>(
  events: T[],
  filters: SearchFilters,
  now: number = Date.now(),
): T[] {
  const query = normalize(filters.query ?? "");
  const vendor = normalize(filters.vendor ?? "");
  const category = normalize(filters.category ?? "");
  const stack = normalize(filters.stack ?? "");
  const topic = normalize(filters.topic ?? "");
  const sourceType = normalize(filters.sourceType ?? "");
  const importance = normalize(filters.importance ?? "");
  const since = (filters.since ?? "") as SinceWindow;

  return events.filter((event) => {
    const matchesQuery =
      !query ||
      [
        event.vendorName,
        event.title,
        event.summary,
        event.whatChanged,
        event.whyItMatters,
        ...event.categories,
        ...getEventTopicTags(event),
        ...event.affectedStack,
        ...event.whoShouldCare,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

    const matchesVendor = !vendor || event.vendorSlug === vendor;
    const matchesCategory =
      !category || event.categories.includes(category) || getEventTopicTags(event).includes(category);
    const matchesStack = !stack || event.affectedStack.includes(stack);
    const matchesTopic =
      !topic ||
      event.categories.includes(topic) ||
      event.affectedStack.includes(topic) ||
      getEventTopicTags(event).includes(topic);
    const matchesSourceType = !sourceType || event.sourceType === sourceType;
    const matchesImportance = !importance || getEventImportanceBand(event) === importance;
    const matchesSince = isWithinWindow(event.publishedAt, since, now);

    return (
      matchesQuery &&
      matchesVendor &&
      matchesCategory &&
      matchesStack &&
      matchesTopic &&
      matchesSourceType &&
      matchesImportance &&
      matchesSince
    );
  });
}

function toLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getFacetCounts(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({
      value,
      label: toLabel(value),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function getTopicFacets<T extends MockEvent>(events: T[]) {
  const eventsPerTopic = new Map<string, Set<string>>();
  for (const event of events) {
    const topics = new Set<string>([
      ...event.categories,
      ...event.affectedStack,
      ...getEventTopicTags(event),
    ]);
    for (const topic of topics) {
      const set = eventsPerTopic.get(topic) ?? new Set<string>();
      set.add(event.id);
      eventsPerTopic.set(topic, set);
    }
  }

  return Array.from(eventsPerTopic.entries())
    .map(([value, eventIds]) => ({ value, label: toLabel(value), count: eventIds.size }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function getSearchFacets<T extends MockEvent>(events: T[]) {
  return {
    vendors: getFacetCounts(events.map((event) => event.vendorSlug)),
    categories: getFacetCounts(
      events.flatMap((event) => [...event.categories, ...getEventTopicTags(event)]),
    ),
    stacks: getFacetCounts(events.flatMap((event) => event.affectedStack)),
    topics: getTopicFacets(events),
    sourceTypes: getFacetCounts(events.map((event) => event.sourceType)),
    importanceBands: getFacetCounts(events.map(getEventImportanceBand)),
  };
}
