#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api.js";

const DEFAULT_PRODUCTION_CONVEX_URL = "https://joyous-mole-525.convex.cloud";

const noisyTitlePatterns = [
  /\blearn what'?s changing\b/i,
  /^what'?s changing$/i,
  /[\u200B-\u200D\uFEFF]/,
  /\bpromiseelements\b/i,
  /\bcheckout\+\s*\d+\s*more\b/i,
  /\bpayment intents\s+payments\b/i,
];

function readNumber(name, fallback) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }

  return value;
}

function hoursBetween(now, isoTimestamp) {
  return (now - Date.parse(isoTimestamp)) / (60 * 60 * 1000);
}

function formatHours(value) {
  return `${value.toFixed(1)}h`;
}

function normalizeTitle(title) {
  return title.replace(/\s+/g, " ").trim();
}

function titleLooksNoisy(title) {
  const normalized = normalizeTitle(title);
  return noisyTitlePatterns.some((pattern) => pattern.test(normalized));
}

const convexUrl =
  process.env.CONVEX_URL ||
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  DEFAULT_PRODUCTION_CONVEX_URL;
const sinceHours = readNumber("SINCE_HOURS", 8);
const eventLimit = Math.trunc(readNumber("EVENT_LIMIT", 24));
const maxLatestEventAgeHours = readNumber("MAX_LATEST_EVENT_AGE_HOURS", 72);
const maxSourceLagHours = readNumber("MAX_SOURCE_LAG_HOURS", 8);
const maxFutureSkewHours = readNumber("MAX_FUTURE_SKEW_HOURS", 1);

const client = new ConvexHttpClient(convexUrl);
const report = await client.query(api.ops.productionFreshness, {
  sinceHours,
  eventLimit,
});

const now = Date.now();
const failures = [];
const latestEvents = report.latestEvents ?? [];
const sources = report.sources ?? [];
const recentRuns = report.recentRuns ?? [];

if (!latestEvents.length) {
  failures.push("No public events were returned from the production feed.");
} else {
  const latestEventAge = hoursBetween(now, latestEvents[0].publishedAt);

  if (latestEventAge > maxLatestEventAgeHours) {
    failures.push(
      `Latest public event is stale: ${formatHours(latestEventAge)} old, limit ${maxLatestEventAgeHours}h.`,
    );
  }
}

for (let index = 1; index < latestEvents.length; index += 1) {
  const previous = Date.parse(latestEvents[index - 1].publishedAt);
  const current = Date.parse(latestEvents[index].publishedAt);

  if (previous < current) {
    failures.push("Production latestEvents are not sorted newest first.");
    break;
  }
}

const futureEvents = latestEvents.filter((event) => {
  return hoursBetween(now, event.publishedAt) < -maxFutureSkewHours;
});

if (futureEvents.length) {
  failures.push(
    `Found future-dated public events: ${futureEvents
      .slice(0, 3)
      .map((event) => `${event.vendorName} / ${event.title}`)
      .join("; ")}.`,
  );
}

const noisyEvents = latestEvents.filter((event) => titleLooksNoisy(event.title));

if (noisyEvents.length) {
  failures.push(
    `Found noisy event titles: ${noisyEvents
      .slice(0, 3)
      .map((event) => `${event.vendorName} / ${normalizeTitle(event.title)}`)
      .join("; ")}.`,
  );
}

const unhealthySources = sources.filter((source) => source.status !== "healthy");

if (unhealthySources.length) {
  failures.push(
    `Found unhealthy sources: ${unhealthySources
      .slice(0, 5)
      .map((source) => `${source.vendorName} / ${source.sourceName} (${source.status})`)
      .join("; ")}.`,
  );
}

const staleSources = sources.filter((source) => {
  if (!source.lastSuccessAt) {
    return true;
  }

  return hoursBetween(now, source.lastSuccessAt) > maxSourceLagHours;
});

if (staleSources.length) {
  failures.push(
    `Found stale sources: ${staleSources
      .slice(0, 5)
      .map((source) => {
        const age = source.lastSuccessAt ? formatHours(hoursBetween(now, source.lastSuccessAt)) : "never";
        return `${source.vendorName} / ${source.sourceName} (${age})`;
      })
      .join("; ")}.`,
  );
}

if (!recentRuns.length) {
  failures.push(`No ingestion runs found in the last ${sinceHours}h.`);
}

if ((report.recentFailureCount ?? 0) > 0) {
  failures.push(`Found ${report.recentFailureCount} ingestion failures in the last ${sinceHours}h.`);
}

const severityCounts = latestEvents.reduce((counts, event) => {
  counts[event.importanceBand] = (counts[event.importanceBand] ?? 0) + 1;
  return counts;
}, {});

console.log(`Version Watch production freshness`);
console.log(`Convex: ${convexUrl}`);
console.log(`Checked at: ${report.checkedAt}`);
console.log(`Recent window: ${sinceHours}h`);

if (latestEvents[0]) {
  const latest = latestEvents[0];
  console.log(
    `Latest event: ${latest.vendorName} / ${normalizeTitle(latest.title)} (${formatHours(
      hoursBetween(now, latest.publishedAt),
    )} old)`,
  );
}

console.log(
  `Top ${latestEvents.length} signal bands: critical=${severityCounts.critical ?? 0}, high=${
    severityCounts.high ?? 0
  }, medium=${severityCounts.medium ?? 0}, low=${severityCounts.low ?? 0}`,
);
console.log(`Sources checked: ${sources.length}`);
console.log(`Recent ingestion runs: ${recentRuns.length}`);
console.log(`Recent ingestion failures: ${report.recentFailureCount ?? 0}`);

if (failures.length) {
  console.error("\nProduction freshness check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("\n[ok] Production freshness checks passed.");
}
