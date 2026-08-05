#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const earliestRemovalAt = Date.parse("2026-08-12T04:00:00.000Z");
const suppliedNow = process.env.ROLLBACK_GATE_NOW;
const now = suppliedNow ? Date.parse(suppliedNow) : Date.now();

if (!Number.isFinite(now)) {
  throw new Error("ROLLBACK_GATE_NOW must be an ISO-8601 timestamp when provided.");
}

const eventsPath = fileURLToPath(new URL("../convex/events.ts", import.meta.url));
const source = await readFile(eventsPath, "utf8");
const hasListPublic = /export const listPublic\s*=\s*query\s*\(/.test(source);
const hasByVendorSlug = /export const byVendorSlug\s*=\s*query\s*\(/.test(source);
const compatibilityQueriesPresent = hasListPublic && hasByVendorSlug;
const compatibilityQueriesAbsent = !hasListPublic && !hasByVendorSlug;

if (now < earliestRemovalAt) {
  if (!compatibilityQueriesPresent) {
    throw new Error(
      "Rollback compatibility queries must remain available until 2026-08-12 America/Toronto.",
    );
  }

  console.log("[ok] Rollback compatibility queries are present inside the stability window.");
  process.exit(0);
}

if (!compatibilityQueriesPresent && !compatibilityQueriesAbsent) {
  throw new Error("Rollback compatibility removal is incomplete; remove listPublic and byVendorSlug together.");
}

if (compatibilityQueriesPresent) {
  console.warn(
    "[review] Rollback compatibility queries are eligible for removal after production stability and client-reference checks pass.",
  );
} else {
  console.log("[ok] Rollback compatibility queries were removed together after the safety window.");
}
