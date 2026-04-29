export type PublicApiStatus = {
  status: "healthy" | "degraded" | "stale";
  checked_at: string;
  latest_event: {
    id: string;
    vendor: string;
    title: string;
    published_at: string;
    age_hours: number;
  } | null;
  latest_feed_refresh_at: string | null;
  latest_feed_refresh_age_hours: number | null;
  active_source_count: number;
  degraded_source_count: number;
  failing_source_count: number;
  stale_source_count: number;
  recent_refresh_count: number;
  recent_refresh_failure_count: number;
  recent_ingestion_failure_count: number;
  max_expected_refresh_age_hours: number;
  stale_sources: PublicSourceStatus[];
  degraded_sources: PublicSourceStatus[];
  failing_sources: PublicSourceStatus[];
};

type PublicSourceStatus = {
  vendor: string;
  source: string;
  source_url: string | null;
  status: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  poll_interval_minutes: number | null;
  age_hours: number | null;
};

const DEFAULT_MAX_REFRESH_AGE_HOURS = 5;
const DEFAULT_SOURCE_GRACE_HOURS = 1;

function roundHours(value: number) {
  return Math.round(value * 10) / 10;
}

function ageHours(now: number, isoTimestamp: string | null | undefined) {
  if (!isoTimestamp) {
    return null;
  }

  const parsed = Date.parse(isoTimestamp);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return roundHours((now - parsed) / (60 * 60 * 1000));
}

function getSourceLagLimitHours(source: any) {
  if (!source.pollIntervalMinutes) {
    return DEFAULT_MAX_REFRESH_AGE_HOURS;
  }

  return Math.max(DEFAULT_MAX_REFRESH_AGE_HOURS, source.pollIntervalMinutes / 60 + DEFAULT_SOURCE_GRACE_HOURS);
}

function toPublicSourceStatus(source: any, now: number): PublicSourceStatus {
  return {
    vendor: source.vendorName ?? "Unknown vendor",
    source: source.sourceName ?? "Unknown source",
    source_url: source.sourceUrl ?? null,
    status: source.status ?? "unknown",
    last_success_at: source.lastSuccessAt ?? null,
    last_failure_at: source.lastFailureAt ?? null,
    consecutive_failures: source.consecutiveFailures ?? 0,
    poll_interval_minutes: source.pollIntervalMinutes ?? null,
    age_hours: ageHours(now, source.lastSuccessAt ?? null),
  };
}

export function buildPublicApiStatus(report: any, now = Date.now()): PublicApiStatus {
  const sources = report.sources ?? [];
  const latestEvent = report.latestEvents?.[0] ?? null;
  const latestRefresh = report.latestFeedRefresh ?? report.recentRefreshRuns?.[0] ?? null;
  const latestRefreshAt = latestRefresh?.finishedAt ?? latestRefresh?.startedAt ?? null;
  const latestFeedRefreshAge = ageHours(now, latestRefreshAt);
  const staleSources = sources.filter((source: any) => {
    const sourceAge = ageHours(now, source.lastSuccessAt ?? null);
    return sourceAge === null || sourceAge > getSourceLagLimitHours(source);
  });
  const degradedSources = sources.filter((source: any) => source.status === "degraded");
  const failingSources = sources.filter((source: any) => source.status === "failing");
  const recentRefreshRuns = report.recentRefreshRuns ?? [];
  const recentRuns = report.recentRuns ?? [];
  const recentRefreshFailures = recentRefreshRuns.filter((run: any) => run.status === "failure").length;
  const recentIngestionFailures = recentRuns.filter((run: any) => run.status === "failure").length;

  let status: PublicApiStatus["status"] = "healthy";
  if (latestFeedRefreshAge === null || latestFeedRefreshAge > DEFAULT_MAX_REFRESH_AGE_HOURS) {
    status = "stale";
  } else if (failingSources.length || staleSources.length || recentRefreshFailures) {
    status = "degraded";
  }

  return {
    status,
    checked_at: report.checkedAt ?? new Date(now).toISOString(),
    latest_event: latestEvent
      ? {
          id: latestEvent.slug ?? latestEvent.id,
          vendor: latestEvent.vendorName,
          title: latestEvent.title,
          published_at: latestEvent.publishedAt,
          age_hours: ageHours(now, latestEvent.publishedAt) ?? 0,
        }
      : null,
    latest_feed_refresh_at: latestRefreshAt,
    latest_feed_refresh_age_hours: latestFeedRefreshAge,
    active_source_count: sources.length,
    degraded_source_count: degradedSources.length,
    failing_source_count: failingSources.length,
    stale_source_count: staleSources.length,
    recent_refresh_count: recentRefreshRuns.length,
    recent_refresh_failure_count: recentRefreshFailures,
    recent_ingestion_failure_count: recentIngestionFailures,
    max_expected_refresh_age_hours: DEFAULT_MAX_REFRESH_AGE_HOURS,
    stale_sources: staleSources.map((source: any) => toPublicSourceStatus(source, now)),
    degraded_sources: degradedSources.map((source: any) => toPublicSourceStatus(source, now)),
    failing_sources: failingSources.map((source: any) => toPublicSourceStatus(source, now)),
  };
}
