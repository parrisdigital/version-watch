import { describe, expect, it } from "vitest";

import { getCategoryForSlug } from "@/lib/vendor-categories";

describe("vendor categories", () => {
  it("places developer surfaces in concrete groups instead of Other", () => {
    expect(getCategoryForSlug("augment-code")).toBe("Editors & IDEs");
    expect(getCategoryForSlug("cursor")).toBe("Editors & IDEs");
    expect(getCategoryForSlug("dp-code")).toBe("Editors & IDEs");
    expect(getCategoryForSlug("google-antigravity")).toBe("Editors & IDEs");
    expect(getCategoryForSlug("vscode")).toBe("Editors & IDEs");
    expect(getCategoryForSlug("windsurf")).toBe("Editors & IDEs");
    expect(getCategoryForSlug("zed")).toBe("Editors & IDEs");
    expect(getCategoryForSlug("warp")).toBe("Dev Workflow");
  });

  it("separates browsers, model platforms, coding agents, and web-data tools", () => {
    expect(getCategoryForSlug("brave")).toBe("Browsers");
    expect(getCategoryForSlug("dia")).toBe("Browsers");
    expect(getCategoryForSlug("xai")).toBe("AI Models & APIs");
    expect(getCategoryForSlug("groq")).toBe("AI Models & APIs");
    expect(getCategoryForSlug("meta-ai")).toBe("AI Models & APIs");
    expect(getCategoryForSlug("cline")).toBe("AI Coding Agents");
    expect(getCategoryForSlug("firecrawl")).toBe("Search & Web Data");
    expect(getCategoryForSlug("exa")).toBe("Search & Web Data");
  });
});
