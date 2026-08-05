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
    expect(opsSource).not.toMatch(/query\("ingestionRuns"\)[\s\S]*?q\.gte\("startedAt", since\)/);
    expect(opsSource).not.toMatch(/query\("refreshRequests"\)\.collect\(\)/);
  });

  it("keeps public event reads bounded as the corpus grows", () => {
    const eventsSource = readFileSync(join(repoRoot, "convex/events.ts"), "utf8");
    const statsSource = readFileSync(join(repoRoot, "convex/publicStats.ts"), "utf8");

    expect(eventsSource).toContain("LEGACY_PUBLIC_EVENT_LIMIT");
    expect(eventsSource).toContain("PUBLIC_UPDATE_SCAN_LIMIT");
    expect(eventsSource).not.toMatch(/query\("changeEvents"\)[\s\S]*?\.collect\(\)/);
    expect(eventsSource).not.toContain("ctx.db.get(event.rawCandidateId)");
    expect(statsSource).toContain("paginationOptsValidator");
    expect(statsSource).toContain(".paginate(args.paginationOpts)");
    expect(statsSource).not.toMatch(/query\("changeEvents"\)[\s\S]*?\.collect\(\)/);
  });
});
