import { describe, expect, it } from "vitest";

import { findSameSourceCandidateByTitle, hasMeaningfulTitle } from "../../../convex/ingestState";

describe("hasMeaningfulTitle", () => {
  it("allows short semver release titles for GitHub release sources", () => {
    expect(hasMeaningfulTitle("v1.14.21", "https://github.com/anomalyco/opencode/releases")).toBe(true);
    expect(hasMeaningfulTitle("v4.12.14", "https://github.com/honojs/hono/releases")).toBe(true);
    expect(hasMeaningfulTitle("Bun v1.3.13", "https://github.com/oven-sh/bun/releases")).toBe(true);
  });

  it("still rejects short generic titles outside GitHub releases", () => {
    expect(hasMeaningfulTitle("v1.14.21", "https://developers.openai.com/api/docs/changelog")).toBe(false);
    expect(hasMeaningfulTitle("update", "https://github.com/anomalyco/opencode/releases")).toBe(false);
  });

  it("allows short official changelog titles that end in API or CLI", () => {
    expect(hasMeaningfulTitle("Groups API", "https://workos.com/changelog")).toBe(true);
    expect(hasMeaningfulTitle("Clerk CLI", "https://clerk.com/changelog")).toBe(true);
    expect(hasMeaningfulTitle("Linear MCP", "https://linear.app/changelog")).toBe(true);
  });
});

describe("findSameSourceCandidateByTitle", () => {
  it("matches candidates by normalized title without collapsing different same-day entries", () => {
    const candidates = [
      { rawTitle: "Tailored notifications for Surveys" },
      { rawTitle: "Schedule recurring Workflows" },
    ];

    expect(findSameSourceCandidateByTitle(candidates, "Schedule recurring Workflows")).toBe(candidates[1]);
    expect(findSameSourceCandidateByTitle(candidates, "Weekly email digest for Web Analytics")).toBeNull();
  });
});
