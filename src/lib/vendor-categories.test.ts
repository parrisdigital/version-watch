import { describe, expect, it } from "vitest";

import { getCategoryForSlug } from "@/lib/vendor-categories";

describe("vendor categories", () => {
  it("places developer surfaces in concrete groups instead of Other", () => {
    expect(getCategoryForSlug("augment-code")).toBe("Editors & IDEs");
    expect(getCategoryForSlug("cursor")).toBe("Editors & IDEs");
    expect(getCategoryForSlug("dp-code")).toBe("Editors & IDEs");
    expect(getCategoryForSlug("google-antigravity")).toBe("Editors & IDEs");
    expect(getCategoryForSlug("kiro")).toBe("Editors & IDEs");
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
    expect(getCategoryForSlug("mistral-ai")).toBe("AI Models & APIs");
    expect(getCategoryForSlug("openrouter")).toBe("AI Models & APIs");
    expect(getCategoryForSlug("perplexity")).toBe("AI Models & APIs");
    expect(getCategoryForSlug("amp")).toBe("AI Coding Agents");
    expect(getCategoryForSlug("claude-code")).toBe("AI Coding Agents");
    expect(getCategoryForSlug("cline")).toBe("AI Coding Agents");
    expect(getCategoryForSlug("factory-droid")).toBe("AI Coding Agents");
    expect(getCategoryForSlug("kilo-code")).toBe("AI Coding Agents");
    expect(getCategoryForSlug("replit-agent")).toBe("AI Coding Agents");
    expect(getCategoryForSlug("v0")).toBe("AI Coding Agents");
    expect(getCategoryForSlug("firecrawl")).toBe("Search & Web Data");
    expect(getCategoryForSlug("exa")).toBe("Search & Web Data");
  });

  it("keeps shadcn ecosystem vendors in design systems and UI", () => {
    expect(getCategoryForSlug("base-ui")).toBe("Design Systems & UI");
    expect(getCategoryForSlug("figma")).toBe("Design Systems & UI");
    expect(getCategoryForSlug("heroui")).toBe("Design Systems & UI");
    expect(getCategoryForSlug("shadcn")).toBe("Design Systems & UI");
    expect(getCategoryForSlug("shadcn-studio")).toBe("Design Systems & UI");
    expect(getCategoryForSlug("shadcnblocks")).toBe("Design Systems & UI");
    expect(getCategoryForSlug("shadcnspace")).toBe("Design Systems & UI");
  });

  it("keeps protocol and frontend tooling vendors in frameworks and tooling", () => {
    expect(getCategoryForSlug("model-context-protocol")).toBe("Frameworks & Tooling");
    expect(getCategoryForSlug("tanstack")).toBe("Frameworks & Tooling");
  });
});
