#!/usr/bin/env node

import { auditSourceLinks } from "./lib/source-link-audit.mjs";

const baseUrl = process.env.VERSION_WATCH_URL ?? "https://versionwatch.dev";
const maxPages = Number(process.env.MAX_PAGES ?? "20");
const limit = Number(process.env.LIMIT ?? "100");

async function fetchJson(path) {
  const response = await fetch(new URL(path, baseUrl));
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`GET ${path} failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function fetchAllUpdates() {
  const updates = [];
  let cursor = "";

  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) {
      params.set("cursor", cursor);
    }

    const body = await fetchJson(`/api/v1/updates?${params.toString()}`);
    updates.push(...(body.updates ?? []));

    cursor = body.next_cursor ?? "";
    if (!cursor) {
      break;
    }
  }

  return updates;
}

const vendorsBody = await fetchJson("/api/v1/vendors");
const updates = await fetchAllUpdates();
const audit = auditSourceLinks({
  vendors: vendorsBody.vendors ?? [],
  updates,
});

console.log(`Source links checked: ${audit.checked_updates} updates across ${audit.checked_vendors} vendors`);
console.log(`Errors: ${audit.error_count}`);
console.log(`Warnings: ${audit.warning_count}`);

for (const finding of audit.findings.slice(0, 30)) {
  const label = finding.level.toUpperCase();
  console.log(`${label}: ${finding.vendor_slug} / ${finding.title}`);
  console.log(`  ${finding.source_url}`);
  console.log(`  ${finding.reason}`);
}

if (audit.findings.length > 30) {
  console.log(`... ${audit.findings.length - 30} additional findings omitted`);
}

if (audit.error_count > 0) {
  process.exit(1);
}
