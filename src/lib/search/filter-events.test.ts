import { describe, expect, it } from "vitest";

import { filterEvents, getSearchFacets } from "@/lib/search/filter-events";
import { events } from "@/lib/mock-data";

describe("filterEvents", () => {
  it("filters by text query, vendor, category, stack, and importance band together", () => {
    const result = filterEvents(events, {
      query: "subscription",
      vendor: "stripe",
      category: "breaking",
      stack: "payments",
      importance: "high",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.vendorSlug).toBe("stripe");
  });

  it("returns all items when no filters are active", () => {
    expect(filterEvents(events, {})).toHaveLength(events.length);
  });
});

describe("getSearchFacets", () => {
  it("builds stable facet counts from the event list", () => {
    const facets = getSearchFacets(events);

    expect(facets.vendors.find((facet) => facet.value === "openai")?.count).toBeGreaterThan(0);
    expect(facets.categories.find((facet) => facet.value === "api")?.count).toBeGreaterThan(0);
    expect(facets.stacks.find((facet) => facet.value === "payments")?.count).toBeGreaterThan(0);
  });
});
