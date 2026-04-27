#!/usr/bin/env node

const baseUrl = process.env.VERSION_WATCH_URL ?? "https://versionwatch.dev";
const maxPages = Number(process.env.MAX_PAGES ?? "50");
const limit = Number(process.env.LIMIT ?? "100");
const nonMonitoredStates = new Set(["paused", "unsupported"]);

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

function getVendorCounts(updates) {
  const counts = new Map();

  for (const update of updates) {
    counts.set(update.vendor_slug, (counts.get(update.vendor_slug) ?? 0) + 1);
  }

  return counts;
}

function formatVendor(vendor) {
  return `${vendor.vendor ?? vendor.name ?? vendor.vendor_slug ?? vendor.slug} (${vendor.vendor_slug ?? vendor.slug})`;
}

const [status, vendorsBody, freshnessBody, updates] = await Promise.all([
  fetchJson("/api/v1/status"),
  fetchJson("/api/v1/vendors"),
  fetchJson("/api/v1/status/vendors"),
  fetchAllUpdates(),
]);

const failures = [];
const warnings = [];
const vendors = vendorsBody.vendors ?? [];
const freshnessRecords = freshnessBody.vendors ?? [];
const freshnessBySlug = new Map(freshnessRecords.map((vendor) => [vendor.vendor_slug, vendor]));
const updateCounts = getVendorCounts(updates);

if (status.status === "stale") {
  failures.push(`Public API status is stale. latest_refresh_at=${status.latest_refresh_at ?? "null"}`);
} else if (status.status === "degraded") {
  warnings.push(`Public API status is degraded. Vendor-level source debt checks will determine whether this is actionable.`);
}

if (vendors.length !== freshnessRecords.length) {
  failures.push(`Vendor count mismatch: /vendors=${vendors.length}, /status/vendors=${freshnessRecords.length}.`);
}

for (const vendor of vendors) {
  const freshness = freshnessBySlug.get(vendor.slug);
  const lifecycleState = freshness?.lifecycle_state ?? "missing";
  const updateCount = updateCounts.get(vendor.slug) ?? 0;
  const sourceCount = vendor.sources?.length ?? 0;

  if (!freshness) {
    failures.push(`${vendor.name} (${vendor.slug}) is missing from /api/v1/status/vendors.`);
    continue;
  }

  if (nonMonitoredStates.has(lifecycleState)) {
    if (updateCount === 0) {
      warnings.push(`${formatVendor(freshness)} is ${lifecycleState} and has no public updates.`);
    }
    continue;
  }

  if (sourceCount === 0) {
    failures.push(`${vendor.name} (${vendor.slug}) is active but has no registered public sources.`);
  }

  if (updateCount === 0) {
    failures.push(`${vendor.name} (${vendor.slug}) is active but has no public updates.`);
  }

  if (
    (freshness.degraded_source_count ?? 0) > 0 ||
    (freshness.failing_source_count ?? 0) > 0 ||
    (freshness.stale_source_count ?? 0) > 0
  ) {
    failures.push(
      `${formatVendor(freshness)} has source debt: degraded=${freshness.degraded_source_count}, failing=${freshness.failing_source_count}, stale=${freshness.stale_source_count}.`,
    );
  }
}

console.log(`Version Watch vendor coverage`);
console.log(`Base URL: ${baseUrl}`);
console.log(`API status: ${status.status}`);
console.log(`Vendors checked: ${vendors.length}`);
console.log(`Updates checked: ${updates.length}`);

if (warnings.length) {
  console.log("\nVendor coverage warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (failures.length) {
  console.error("\nVendor coverage failures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\n[ok] Vendor coverage checks passed.");
