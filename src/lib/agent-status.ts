export type PublicApiStatus = {
  status: "healthy" | "degraded" | "stale";
  latest_refresh_at: string | null;
  latest_refresh_age_minutes: number | null;
  latest_event_at: string | null;
  active_source_count: number;
  degraded_source_count: number;
  failing_source_count: number;
  stale_source_count: number;
  recent_refresh_failures: number;
  coverage: {
    active_vendors: number;
    paused_vendors: number;
    unsupported_vendors: number;
  };
};

export type PublicVendorFreshnessStatus = {
  vendor: string;
  vendor_slug: string;
  lifecycle_state: "active" | "degraded" | "paused" | "unsupported";
  freshness_tier: "critical" | "high" | "standard" | "long_tail";
  latest_attempt_at: string | null;
  latest_success_at: string | null;
  latest_failure_at: string | null;
  next_due_at: string | null;
  backoff_until: string | null;
  active_source_count: number;
  degraded_source_count: number;
  failing_source_count: number;
  stale_source_count: number;
  paused_source_count: number;
  unsupported_source_count: number;
  queued_refresh: boolean;
};

export const MAX_EXPECTED_REFRESH_AGE_MINUTES = 5 * 60;
const STALE_SOURCE_GRACE_MINUTES = 60;
const unsupportedSourceUrls = new Set([
  "https://railway.com/changelog",
  "https://windsurf.com/changelog",
  "https://antigravity.google/changelog",
  "https://docs.x.ai/developers/release-notes",
]);

function minutesBetween(now: number, isoTimestamp: string | null | undefined) {
  if (!isoTimestamp) return null;

  const parsed = Date.parse(isoTimestamp);
  if (!Number.isFinite(parsed)) return null;

  return Math.max(0, Math.round((now - parsed) / (60 * 1000)));
}

function getLatestRefresh(report: any) {
  return (
    report.latestFeedRefresh ??
    report.recentRefreshRuns?.find((run: any) => run.finishedAt || run.startedAt) ??
    null
  );
}

function getSourceLagLimitMinutes(source: any) {
  const pollInterval = source.pollIntervalMinutes;
  if (!Number.isFinite(pollInterval) || pollInterval <= 0) {
    return MAX_EXPECTED_REFRESH_AGE_MINUTES + STALE_SOURCE_GRACE_MINUTES;
  }

  return Math.max(MAX_EXPECTED_REFRESH_AGE_MINUTES, pollInterval + STALE_SOURCE_GRACE_MINUTES);
}

function isMonitoredSource(source: any) {
  const state = source.lifecycleState ?? source.lifecycle_state;
  const sourceUrl = source.sourceUrl ?? source.source_url;
  return state !== "paused" && state !== "unsupported" && !unsupportedSourceUrls.has(sourceUrl);
}

export function buildPublicApiStatus(report: any, now = Date.now()): PublicApiStatus {
  const sources = (report.sources ?? []).filter(isMonitoredSource);
  const fallbackActiveVendorCount = new Set(
    sources.map((source: any) => source.vendorSlug ?? source.vendor_slug ?? source.vendorName).filter(Boolean),
  ).size;
  const latestRefresh = getLatestRefresh(report);
  const latestRefreshAt = latestRefresh?.finishedAt ?? latestRefresh?.startedAt ?? null;
  const latestRefreshAgeMinutes = minutesBetween(now, latestRefreshAt);
  const latestEventAt = report.latestEvents?.[0]?.publishedAt ?? null;
  const degradedSources = sources.filter((source: any) => source.status === "degraded");
  const failingSources = sources.filter((source: any) => source.status === "failing");
  const staleSources = sources.filter((source: any) => {
    const ageMinutes = minutesBetween(now, source.lastSuccessAt);
    return ageMinutes === null || ageMinutes > getSourceLagLimitMinutes(source);
  });
  const recentMonitoredSourceFailures = (report.recentRuns ?? []).filter((run: any) => {
    return run.status === "failure" && isMonitoredSource(run);
  });
  const hasMonitoredSourceDebt =
    recentMonitoredSourceFailures.length > 0 ||
    degradedSources.length > 0 ||
    failingSources.length > 0 ||
    staleSources.length > 0;
  const recentRefreshFailures = (report.recentRefreshRuns ?? []).filter((run: any) => {
    return run.status === "failure" || (run.status === "partial_failure" && hasMonitoredSourceDebt);
  }).length;

  let status: PublicApiStatus["status"] = "healthy";
  if (latestRefreshAgeMinutes === null || latestRefreshAgeMinutes > MAX_EXPECTED_REFRESH_AGE_MINUTES) {
    status = "stale";
  } else if (degradedSources.length || failingSources.length || staleSources.length || recentRefreshFailures) {
    status = "degraded";
  }

  return {
    status,
    latest_refresh_at: latestRefreshAt,
    latest_refresh_age_minutes: latestRefreshAgeMinutes,
    latest_event_at: latestEventAt,
    active_source_count: sources.length,
    degraded_source_count: degradedSources.length,
    failing_source_count: failingSources.length,
    stale_source_count: staleSources.length,
    recent_refresh_failures: recentRefreshFailures,
    coverage: {
      active_vendors:
        report.coverage?.activeVendorCount ??
        report.activeVendorCount ??
        report.activeVendors ??
        fallbackActiveVendorCount,
      paused_vendors: report.coverage?.pausedVendorCount ?? report.pausedVendorCount ?? 0,
      unsupported_vendors: report.coverage?.unsupportedVendorCount ?? report.unsupportedVendorCount ?? 0,
    },
  };
}

function normalizeLifecycleState(value: unknown): PublicVendorFreshnessStatus["lifecycle_state"] {
  return value === "active" || value === "degraded" || value === "paused" || value === "unsupported"
    ? value
    : "unsupported";
}

function normalizeFreshnessTier(value: unknown): PublicVendorFreshnessStatus["freshness_tier"] {
  return value === "critical" || value === "high" || value === "standard" || value === "long_tail"
    ? value
    : "standard";
}

export function serializeVendorFreshnessStatus(record: any): PublicVendorFreshnessStatus {
  return {
    vendor: record.vendor,
    vendor_slug: record.vendorSlug,
    lifecycle_state: normalizeLifecycleState(record.lifecycleState),
    freshness_tier: normalizeFreshnessTier(record.freshnessTier),
    latest_attempt_at: record.latestAttemptAt ?? null,
    latest_success_at: record.latestSuccessAt ?? null,
    latest_failure_at: record.latestFailureAt ?? null,
    next_due_at: record.nextDueAt ?? null,
    backoff_until: record.backoffUntil ?? null,
    active_source_count: record.activeSourceCount ?? 0,
    degraded_source_count: record.degradedSourceCount ?? 0,
    failing_source_count: record.failingSourceCount ?? 0,
    stale_source_count: record.staleSourceCount ?? 0,
    paused_source_count: record.pausedSourceCount ?? 0,
    unsupported_source_count: record.unsupportedSourceCount ?? 0,
    queued_refresh: Boolean(record.queuedRefresh),
  };
}

export function serializeVendorFreshnessStatuses(records: any[]) {
  return records.map((record) => serializeVendorFreshnessStatus(record));
}
