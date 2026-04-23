import { describe, expect, it } from "vitest";

import { hasMeaningfulTitle } from "../../../convex/ingestState";

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
});
