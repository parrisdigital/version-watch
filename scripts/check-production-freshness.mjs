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
const knownBlockedSourceUrls = new Set([
  // Railway currently returns a Cloudflare managed challenge to server-side fetches and no official feed endpoint.
  "https://railway.com/changelog",
]);
const nonMonitoredLifecycleStates = new Set(["paused", "unsupported"]);

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

function getSourceLagLimitHours(source, defaultLimitHours, multiplier, graceHours) {
  if (!source.pollIntervalMinutes) {
    return defaultLimitHours;
  }

  const pollIntervalHours = source.pollIntervalMinutes / 60;
  return Math.max(defaultLimitHours, pollIntervalHours * multiplier + graceHours);
}

function formatSource(source) {
  const label = `${source.vendorName} / ${source.sourceName}`;
  return source.sourceUrl ? `${label} (${source.sourceUrl})` : label;
}

function formatRunSource(run) {
  const vendorName = run.vendorName ?? "Unknown vendor";
  const sourceName = run.sourceName ?? "Unknown source";
  const label = `${vendorName} / ${sourceName}`;
  return run.sourceUrl ? `${label} (${run.sourceUrl})` : label;
}

function getRunSourceKey(run) {
  return [run.vendorName ?? "", run.sourceName ?? "", run.sourceUrl ?? ""].join("::");
}

function isKnownBlockedSourceUrl(url) {
  return Boolean(url && knownBlockedSourceUrls.has(url));
}

function getLifecycleState(entry) {
  return (
    entry.sourceLifecycleState ??
    entry.lifecycleState ??
    (isKnownBlockedSourceUrl(entry.sourceUrl) ? "unsupported" : "active")
  );
}

function isMonitoredSource(entry) {
  return !nonMonitoredLifecycleStates.has(getLifecycleState(entry));
}

function groupFailureRuns(runs) {
  const groups = new Map();

  for (const run of runs) {
    const key = getRunSourceKey(run);
    const group = groups.get(key) ?? {
      label: formatRunSource(run),
      runs: [],
    };
    group.runs.push(run);
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

const convexUrl =
  process.env.CONVEX_URL ||
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  DEFAULT_PRODUCTION_CONVEX_URL;
const sinceHours = readNumber("SINCE_HOURS", 8);
const eventLimit = Math.trunc(readNumber("EVENT_LIMIT", 24));
const maxLatestEventAgeHours = readNumber("MAX_LATEST_EVENT_AGE_HOURS", 72);
const maxFeedRefreshAgeHours = readNumber("MAX_FEED_REFRESH_AGE_HOURS", 5);
const maxSourceLagHours = readNumber("MAX_SOURCE_LAG_HOURS", 8);
const maxSourceLagGraceHours = readNumber("MAX_SOURCE_LAG_GRACE_HOURS", 1);
const maxSourceLagMultiplier = readNumber("MAX_SOURCE_LAG_MULTIPLIER", 2);
const maxDegradedSourceCount = Math.trunc(readNumber("MAX_DEGRADED_SOURCE_COUNT", 1));
const maxConsecutiveSourceFailures = Math.trunc(readNumber("MAX_CONSECUTIVE_SOURCE_FAILURES", 1));
const maxRecentFailureSourceCount = Math.trunc(readNumber("MAX_RECENT_FAILURE_SOURCE_COUNT", 1));
const maxRecentFailuresPerSource = Math.trunc(readNumber("MAX_RECENT_FAILURES_PER_SOURCE", 1));
const maxFutureSkewHours = readNumber("MAX_FUTURE_SKEW_HOURS", 1);

const client = new ConvexHttpClient(convexUrl);
const report = await client.query(api.ops.productionFreshness, {
  sinceHours,
  eventLimit,
});

const now = Date.now();
const failures = [];
const warnings = [];
const latestEvents = report.latestEvents ?? [];
const sources = (report.sources ?? []).filter(isMonitoredSource);
const recentRuns = (report.recentRuns ?? []).filter(isMonitoredSource);
const recentRefreshRuns = report.recentRefreshRuns ?? [];
const latestFeedRefresh = report.latestFeedRefresh ?? null;

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

const degradedSources = sources.filter((source) => source.status === "degraded");
const failingSources = sources.filter((source) => source.status === "failing");
const repeatedDegradedSources = degradedSources.filter((source) => {
  return (source.consecutiveFailures ?? 0) > maxConsecutiveSourceFailures;
});
const transientDegradedSources = degradedSources.filter((source) => {
  return (source.consecutiveFailures ?? 0) <= maxConsecutiveSourceFailures;
});
const unknownStatusSources = sources.filter((source) => {
  return !["healthy", "degraded", "failing"].includes(source.status);
});

if (unknownStatusSources.length) {
  failures.push(
    `Found sources with unknown health status: ${unknownStatusSources
      .slice(0, 5)
      .map((source) => `${formatSource(source)} (${source.status})`)
      .join("; ")}.`,
  );
}

if (failingSources.length) {
  failures.push(
    `Found failing sources: ${failingSources
      .slice(0, 5)
      .map((source) => `${formatSource(source)} (${source.consecutiveFailures ?? 0} consecutive failures)`)
      .join("; ")}.`,
  );
}

if (repeatedDegradedSources.length) {
  failures.push(
    `Found repeatedly degraded sources: ${repeatedDegradedSources
      .slice(0, 5)
      .map((source) => `${formatSource(source)} (${source.consecutiveFailures ?? 0} consecutive failures)`)
      .join("; ")}.`,
  );
}

if (transientDegradedSources.length > maxDegradedSourceCount) {
  failures.push(
    `Found ${transientDegradedSources.length} transient degraded sources, limit ${maxDegradedSourceCount}: ${transientDegradedSources
      .slice(0, 5)
      .map((source) => `${formatSource(source)} (${source.consecutiveFailures ?? 0} consecutive failures)`)
      .join("; ")}.`,
  );
} else if (transientDegradedSources.length) {
  warnings.push(
    `Transient degraded source: ${transientDegradedSources
      .map((source) => `${formatSource(source)} (${source.consecutiveFailures ?? 0} consecutive failure)`)
      .join("; ")}.`,
  );
}

const staleSources = sources.filter((source) => {
  if (!source.lastSuccessAt) {
    return true;
  }

  const sourceLimitHours = getSourceLagLimitHours(
    source,
    maxSourceLagHours,
    maxSourceLagMultiplier,
    maxSourceLagGraceHours,
  );

  return hoursBetween(now, source.lastSuccessAt) > sourceLimitHours;
});
const actionableStaleSources = staleSources;

if (actionableStaleSources.length) {
  failures.push(
    `Found stale sources: ${actionableStaleSources
      .slice(0, 5)
      .map((source) => {
        const age = source.lastSuccessAt ? formatHours(hoursBetween(now, source.lastSuccessAt)) : "never";
        const limit = formatHours(
          getSourceLagLimitHours(source, maxSourceLagHours, maxSourceLagMultiplier, maxSourceLagGraceHours),
        );
        return `${formatSource(source)} (${age}, limit ${limit})`;
      })
      .join("; ")}.`,
  );
}

if (!recentRefreshRuns.length) {
  failures.push(`No refresh runs found in the last ${sinceHours}h.`);
} else {
  const latestRun = latestFeedRefresh ?? recentRefreshRuns[0];
  const latestRunAt = latestRun.finishedAt ?? latestRun.startedAt;
  const latestRunAge = hoursBetween(now, latestRunAt);

  if (latestRunAge > maxFeedRefreshAgeHours) {
    failures.push(
      `Latest feed refresh is stale: ${formatHours(latestRunAge)} old, limit ${maxFeedRefreshAgeHours}h.`,
    );
  }
}

const failedRefreshRuns = recentRefreshRuns.filter((run) => run.status === "failure");
const partialRefreshRuns = recentRefreshRuns.filter((run) => run.status === "partial_failure");

if (failedRefreshRuns.length) {
  warnings.push(
    `Failed refresh run in the last ${sinceHours}h: ${failedRefreshRuns
      .slice(0, 3)
      .map((run) => {
        const runAt = run.finishedAt ?? run.startedAt;
        const code = run.errorCode ? ` [${run.errorCode}]` : "";
        const message = run.errorMessage ? `: ${run.errorMessage}` : "";
        return `${run.runType} at ${runAt}${code}${message}`;
      })
      .join("; ")}.`,
  );
}

if (partialRefreshRuns.length && recentRuns.some((run) => run.status === "failure")) {
  warnings.push(
    `Partial refresh run in the last ${sinceHours}h: ${partialRefreshRuns
      .slice(0, 3)
      .map((run) => `${run.runType} at ${run.finishedAt ?? run.startedAt} (${run.failures} source failures)`)
      .join("; ")}.`,
  );
}

const recentFailureRuns = recentRuns.filter((run) => run.status === "failure");
const recentFailureGroups = groupFailureRuns(recentFailureRuns);
const currentProblemSourceKeys = new Set(
  [...failingSources, ...repeatedDegradedSources, ...actionableStaleSources].map((source) => getRunSourceKey(source)),
);
const actionableFailureGroups = recentFailureGroups.filter((group) => {
  const latestFailure = group.runs[0];
  return latestFailure && currentProblemSourceKeys.has(getRunSourceKey(latestFailure));
});
const recoveredFailureGroups = recentFailureGroups.filter((group) => !actionableFailureGroups.includes(group));
const actionableRepeatedFailureGroups = actionableFailureGroups.filter((group) => {
  return group.runs.length > maxRecentFailuresPerSource;
});

if (actionableFailureGroups.length > maxRecentFailureSourceCount) {
  failures.push(
    `Found ingestion failures across ${actionableFailureGroups.length} sources in the last ${sinceHours}h, limit ${maxRecentFailureSourceCount}: ${actionableFailureGroups
      .slice(0, 5)
      .map((group) => `${group.label} (${group.runs.length} failures)`)
      .join("; ")}.`,
  );
} else if (actionableRepeatedFailureGroups.length) {
  failures.push(
    `Found repeated ingestion failures for a source in the last ${sinceHours}h: ${actionableRepeatedFailureGroups
      .slice(0, 5)
      .map((group) => `${group.label} (${group.runs.length} failures)`)
      .join("; ")}.`,
  );
} else if (recentFailureRuns.length && actionableFailureGroups.length) {
  warnings.push(
    `Transient ingestion failure in the last ${sinceHours}h: ${actionableFailureGroups
      .map((group) => {
        const latestFailure = group.runs[0];
        const failedAt = latestFailure.finishedAt ?? latestFailure.startedAt;
        const code = latestFailure.errorCode ? ` [${latestFailure.errorCode}]` : "";
        const message = latestFailure.errorMessage ? `: ${latestFailure.errorMessage}` : "";
        return `${group.label} at ${failedAt}${code}${message}`;
      })
      .join("; ")}.`,
  );
}

if (recoveredFailureGroups.length) {
  warnings.push(
    `Recovered ingestion failure in the last ${sinceHours}h: ${recoveredFailureGroups
      .slice(0, 5)
      .map((group) => {
        const latestFailure = group.runs[0];
        const failedAt = latestFailure.finishedAt ?? latestFailure.startedAt;
        const code = latestFailure.errorCode ? ` [${latestFailure.errorCode}]` : "";
        const message = latestFailure.errorMessage ? `: ${latestFailure.errorMessage}` : "";
        return `${group.label} at ${failedAt}${code}${message}`;
      })
      .join("; ")}.`,
  );
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
console.log(`Recent refresh runs: ${recentRefreshRuns.length}`);
if (latestFeedRefresh ?? recentRefreshRuns[0]) {
  const latestRun = latestFeedRefresh ?? recentRefreshRuns[0];
  const latestRunAt = latestRun.finishedAt ?? latestRun.startedAt;
  console.log(`Latest feed refresh: ${latestRunAt} (${formatHours(hoursBetween(now, latestRunAt))} old)`);
}
console.log(`Recent ingestion runs: ${recentRuns.length}`);
console.log(`Recent ingestion failures: ${recentFailureRuns.length}`);

if (warnings.length) {
  console.log("\nProduction freshness warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (failures.length) {
  console.error("\nProduction freshness check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(warnings.length ? "\n[ok] Production freshness checks passed with warnings." : "\n[ok] Production freshness checks passed.");
}
