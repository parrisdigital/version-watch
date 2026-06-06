import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("production health query guardrails", () => {
  it("keeps high-growth production health tables on bounded indexed reads", () => {
    const opsSource = readFileSync(join(repoRoot, "convex/ops.ts"), "utf8");

    expect(opsSource).toContain("RECENT_INGESTION_RUN_LIMIT");
    expect(opsSource).toContain("OPEN_REFRESH_REQUEST_LIMIT");
    expect(opsSource).not.toMatch(/query\("ingestionRuns"\)\.collect\(\)/);
    expect(opsSource).not.toMatch(/query\("refreshRequests"\)\.collect\(\)/);
  });
});
