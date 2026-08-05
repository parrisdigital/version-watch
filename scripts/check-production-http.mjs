#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const baseUrl = new URL(process.env.VERSION_WATCH_URL ?? "https://versionwatch.dev");
const failures = [];
const warnings = [];
const measurements = [];
const defaultMaxDurationMs = Number(process.env.MAX_HTTP_DURATION_MS ?? 15_000);
const maxPublicEventCount = Number(process.env.MAX_PUBLIC_EVENT_COUNT ?? 10_000);
const capacityWarningRatio = Number(process.env.CAPACITY_WARNING_RATIO ?? 0.7);
const metricsPath = process.env.PRODUCTION_HTTP_METRICS_PATH;
let publicEventCount = null;

if (!Number.isFinite(maxPublicEventCount) || maxPublicEventCount < 1) {
  throw new Error("MAX_PUBLIC_EVENT_COUNT must be a positive number.");
}

if (!Number.isFinite(capacityWarningRatio) || capacityWarningRatio <= 0 || capacityWarningRatio >= 1) {
  throw new Error("CAPACITY_WARNING_RATIO must be greater than 0 and less than 1.");
}

async function fetchRoute(path, validate, thresholds) {
  const url = new URL(path, baseUrl);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "VersionWatchAvailability/1.0" },
    });
    const body = await response.text();
    const durationMs = Math.round(performance.now() - startedAt);
    const bodyBytes = Buffer.byteLength(body);

    if (!response.ok) {
      failures.push(`${path} returned HTTP ${response.status}.`);
    } else {
      try {
        validate(body, response);
      } catch (error) {
        failures.push(`${path} failed content validation: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const maxDurationMs = thresholds.maxDurationMs ?? defaultMaxDurationMs;
    if (durationMs > maxDurationMs) {
      failures.push(`${path} took ${durationMs}ms; maximum is ${maxDurationMs}ms.`);
    } else if (durationMs >= maxDurationMs * capacityWarningRatio) {
      warnings.push(`${path} used ${Math.round((durationMs / maxDurationMs) * 100)}% of its duration budget.`);
    }
    if (bodyBytes > thresholds.maxBytes) {
      failures.push(`${path} returned ${bodyBytes} bytes; maximum is ${thresholds.maxBytes} bytes.`);
    } else if (bodyBytes >= thresholds.maxBytes * capacityWarningRatio) {
      warnings.push(`${path} used ${Math.round((bodyBytes / thresholds.maxBytes) * 100)}% of its payload budget.`);
    }

    measurements.push({
      path,
      status: response.status,
      duration_ms: durationMs,
      max_duration_ms: maxDurationMs,
      body_bytes: bodyBytes,
      max_body_bytes: thresholds.maxBytes,
    });

    console.log(`${response.status} ${path} ${durationMs}ms ${bodyBytes} bytes`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${path} request failed: ${message}`);
    measurements.push({
      path,
      status: null,
      duration_ms: null,
      max_duration_ms: thresholds.maxDurationMs ?? defaultMaxDurationMs,
      body_bytes: null,
      max_body_bytes: thresholds.maxBytes,
      error: message,
    });
  }
}

function expectIncludes(body, value) {
  if (!body.includes(value)) throw new Error(`missing ${JSON.stringify(value)}`);
}

function parseJson(body) {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("response is not valid JSON");
  }
}

await Promise.all([
  fetchRoute("/", (body) => expectIncludes(body, "Every platform change"), { maxBytes: 750_000 }),
  fetchRoute("/search", (body) => expectIncludes(body, "Search"), { maxBytes: 1_000_000 }),
  fetchRoute("/api/v1/updates?limit=1", (body) => {
    const payload = parseJson(body);
    if (payload.count !== 1 || !Array.isArray(payload.updates) || payload.updates.length !== 1) {
      throw new Error("expected one public update");
    }
    if (!Number.isFinite(payload.total_count) || payload.total_count < 1) {
      throw new Error("expected a positive exact total_count");
    }
    if (payload.total_count_is_exact !== true) {
      throw new Error("expected total_count_is_exact to be true");
    }
    publicEventCount = payload.total_count;
  }, { maxBytes: 250_000 }),
  fetchRoute("/api/v1/feed.json?limit=1", (body) => {
    const payload = parseJson(body);
    if (payload.count !== 1 || !Array.isArray(payload.updates) || payload.updates.length !== 1) {
      throw new Error("expected one feed update");
    }
  }, { maxBytes: 250_000 }),
  fetchRoute("/api/v1/feed.md?limit=1", (body) => expectIncludes(body, "Version Watch"), { maxBytes: 250_000 }),
  fetchRoute("/api/v1/taxonomy", (body) => {
    const payload = parseJson(body);
    if (!Array.isArray(payload.taxonomy?.vendors) || payload.taxonomy.vendors.length < 1) {
      throw new Error("taxonomy has no vendors");
    }
  }, { maxBytes: 250_000 }),
  fetchRoute("/sitemap.xml", (body) => {
    expectIncludes(body, "/vendors/");
    expectIncludes(body, "/events/");
  }, { maxBytes: 3_000_000 }),
]);

if (publicEventCount !== null) {
  if (publicEventCount > maxPublicEventCount) {
    failures.push(`Public event count is ${publicEventCount}; capacity review threshold is ${maxPublicEventCount}.`);
  } else if (publicEventCount >= maxPublicEventCount * capacityWarningRatio) {
    warnings.push(
      `Public event count is ${publicEventCount}, ${Math.round((publicEventCount / maxPublicEventCount) * 100)}% of the capacity review threshold.`,
    );
  }
}

measurements.sort((left, right) => left.path.localeCompare(right.path));

const metrics = {
  schema_version: 1,
  checked_at: new Date().toISOString(),
  base_url: baseUrl.toString(),
  status: failures.length > 0 ? "failure" : warnings.length > 0 ? "warning" : "pass",
  public_event_count: publicEventCount,
  max_public_event_count: maxPublicEventCount,
  capacity_warning_ratio: capacityWarningRatio,
  routes: measurements,
  warnings,
  failures,
};

if (metricsPath) {
  const outputPath = resolve(metricsPath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  console.log(`Production HTTP metrics written to ${outputPath}`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = measurements
    .map((measurement) => {
      return `| \`${measurement.path}\` | ${measurement.status ?? "error"} | ${measurement.duration_ms ?? "-"} / ${measurement.max_duration_ms} | ${measurement.body_bytes ?? "-"} / ${measurement.max_body_bytes} |`;
    })
    .join("\n");
  const summary = [
    "## Production HTTP capacity snapshot",
    "",
    `- Result: **${metrics.status}**`,
    `- Public events: **${publicEventCount ?? "unavailable"} / ${maxPublicEventCount}**`,
    "",
    "| Route | HTTP | Duration ms | Payload bytes |",
    "| --- | ---: | ---: | ---: |",
    rows,
    "",
  ].join("\n");
  await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { encoding: "utf8", flag: "a" });
}

if (warnings.length) {
  console.warn("\nProduction HTTP capacity warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length) {
  console.error("\nProduction HTTP availability failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nProduction HTTP availability passed.");
