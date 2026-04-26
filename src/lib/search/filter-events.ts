import { deriveSignalMetadata } from "@/lib/classification/signal";
import type { ImportanceBand, MockEvent } from "@/lib/mock-data";

export type SearchFilters = {
  query?: string;
  vendor?: string;
  category?: string;
  stack?: string;
  importance?: ImportanceBand | "";
};

export type SearchFacet = {
  value: string;
  label: string;
  count: number;
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

export function filterEvents<T extends MockEvent>(events: T[], filters: SearchFilters): T[] {
  const query = normalize(filters.query ?? "");
  const vendor = normalize(filters.vendor ?? "");
  const category = normalize(filters.category ?? "");
  const stack = normalize(filters.stack ?? "");
  const importance = normalize(filters.importance ?? "");

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
    const matchesCategory = !category || event.categories.includes(category) || getEventTopicTags(event).includes(category);
    const matchesStack = !stack || event.affectedStack.includes(stack);
    const matchesImportance = !importance || getEventImportanceBand(event) === importance;

    return matchesQuery && matchesVendor && matchesCategory && matchesStack && matchesImportance;
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

export function getSearchFacets<T extends MockEvent>(events: T[]) {
  return {
    vendors: getFacetCounts(events.map((event) => event.vendorSlug)),
    categories: getFacetCounts(events.flatMap((event) => [...event.categories, ...getEventTopicTags(event)])),
    stacks: getFacetCounts(events.flatMap((event) => event.affectedStack)),
    importanceBands: getFacetCounts(events.map(getEventImportanceBand)),
  };
}
