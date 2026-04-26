import { format, formatDistanceToNowStrict } from "date-fns";

import { normalizePublicSourceType, serializePublicUpdates } from "@/lib/agent-feed";
import { auditSourceLinks, normalizedUrlWithoutHash, type SourceLinkFinding } from "@/lib/source-link-audit";
import type { SiteEvent } from "@/lib/site-data";
import type { SourceType, VendorRecord } from "@/lib/mock-data";

type SourceHealthRecord = {
  vendorName?: string;
  vendorSlug?: string;
  sourceName?: string;
  sourceUrl?: string;
  lifecycleState?: string;
  status?: string;
  lastAttemptAt?: string | null;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  freshnessTier?: string;
  nextDueAt?: string | null;
  backoffUntil?: string | null;
  consecutiveFailures?: number;
};

export type SourceLinkQualityRow = {
  vendor_name: string;
  vendor_slug: string;
  source_name: string;
  source_url: string;
  source_type: SourceType | string;
  audit_status: "ok" | "warning" | "error" | "inactive";
  parser_confidence: "high" | "medium" | "low";
  warning_count: number;
  error_count: number;
  update_count: number;
  lifecycle_state: string;
  health_status: string;
  freshness_tier: string;
  last_checked_at: string | null;
  last_checked_label: string;
  last_success_at: string | null;
  last_success_label: string;
  last_error_code: string | null;
  last_error_message: string | null;
  findings: SourceLinkFinding[];
};

export type SourceLinkQualityReport = {
  checked_at: string;
  checked_updates: number;
  checked_vendors: number;
  checked_sources: number;
  ok_count: number;
  warning_count: number;
  error_count: number;
  inactive_count: number;
  findings: SourceLinkFinding[];
  rows: SourceLinkQualityRow[];
};

function sourceKey(value: string) {
  return normalizedUrlWithoutHash(value);
}

function formatDateLabel(value: string | null | undefined, checkedAt: string) {
  if (!value) return "Never";

  try {
    return `${formatDistanceToNowStrict(new Date(value), { addSuffix: true })} · ${format(new Date(value), "MMM d, HH:mm")}`;
  } catch {
    return checkedAt;
  }
}

function getHealthKey(sourceUrl: string) {
  return sourceKey(sourceUrl);
}

function getAuditStatus(args: {
  errorCount: number;
  warningCount: number;
  healthStatus: string;
  lifecycleState: string;
}) {
  if (args.errorCount > 0) return "error" as const;
  if (args.lifecycleState === "paused" || args.lifecycleState === "unsupported") return "inactive" as const;
  if (args.warningCount > 0 || args.healthStatus === "degraded" || args.healthStatus === "failing") return "warning" as const;
  return "ok" as const;
}

function getParserConfidence(args: {
  auditStatus: SourceLinkQualityRow["audit_status"];
  updateCount: number;
  warningCount: number;
  errorCount: number;
  healthStatus: string;
}) {
  if (args.errorCount > 0 || args.healthStatus === "failing") return "low" as const;
  if (args.warningCount > 0 || args.auditStatus === "inactive" || args.healthStatus === "degraded") return "medium" as const;
  if (args.updateCount === 0) return "medium" as const;
  return "high" as const;
}

export function buildSourceLinkQualityReport({
  vendors,
  events,
  freshnessReport,
  generatedAt = new Date().toISOString(),
}: {
  vendors: VendorRecord[];
  events: SiteEvent[];
  freshnessReport?: any;
  generatedAt?: string;
}): SourceLinkQualityReport {
  const updates = serializePublicUpdates(events).map((update) => ({
    id: update.id,
    vendor_slug: update.vendor_slug,
    title: update.title,
    source_url: update.source_url,
    source_detail_url: update.source_detail_url,
    source_surface_url: update.source_surface_url,
  }));
  const audit = auditSourceLinks({ vendors, updates });
  const checkedAt = freshnessReport?.checkedAt ?? generatedAt;
  const healthBySource = new Map<string, SourceHealthRecord>();
  const updatesBySource = new Map<string, number>();
  const findingsBySource = new Map<string, SourceLinkFinding[]>();

  for (const source of freshnessReport?.sources ?? []) {
    if (source.sourceUrl) {
      healthBySource.set(getHealthKey(source.sourceUrl), source);
    }
  }

  for (const update of updates) {
    const key = sourceKey(update.source_surface_url ?? update.source_detail_url ?? update.source_url ?? "");
    updatesBySource.set(key, (updatesBySource.get(key) ?? 0) + 1);
  }

  for (const finding of audit.findings) {
    const key = sourceKey(finding.source_surface_url ?? finding.source_url);
    const findings = findingsBySource.get(key) ?? [];
    findings.push(finding);
    findingsBySource.set(key, findings);
  }

  const rows = vendors
    .flatMap((vendor) =>
      vendor.sources.map((source) => {
        const key = sourceKey(source.url);
        const health = healthBySource.get(key);
        const findings = findingsBySource.get(key) ?? [];
        const warningCount = findings.filter((finding) => finding.level === "warning").length;
        const errorCount = findings.filter((finding) => finding.level === "error").length;
        const lifecycleState = health?.lifecycleState ?? "unmonitored";
        const healthStatus = health?.status ?? (lifecycleState === "unmonitored" ? "inactive" : "unknown");
        const auditStatus = getAuditStatus({
          errorCount,
          warningCount,
          healthStatus,
          lifecycleState,
        });
        const updateCount = updatesBySource.get(key) ?? 0;
        const lastCheckedAt = health?.lastAttemptAt ?? health?.lastSuccessAt ?? null;
        const sourceType = normalizePublicSourceType(source.url, source.type);

        return {
          vendor_name: vendor.name,
          vendor_slug: vendor.slug,
          source_name: source.name,
          source_url: source.url,
          source_type: sourceType,
          audit_status: auditStatus,
          parser_confidence: getParserConfidence({
            auditStatus,
            updateCount,
            warningCount,
            errorCount,
            healthStatus,
          }),
          warning_count: warningCount,
          error_count: errorCount,
          update_count: updateCount,
          lifecycle_state: lifecycleState,
          health_status: healthStatus,
          freshness_tier: health?.freshnessTier ?? "unknown",
          last_checked_at: lastCheckedAt,
          last_checked_label: formatDateLabel(lastCheckedAt, checkedAt),
          last_success_at: health?.lastSuccessAt ?? null,
          last_success_label: formatDateLabel(health?.lastSuccessAt, checkedAt),
          last_error_code: health?.lastErrorCode ?? null,
          last_error_message: health?.lastErrorMessage ?? null,
          findings,
        } satisfies SourceLinkQualityRow;
      }),
    )
    .sort((a, b) => {
      const statusRank = { error: 0, warning: 1, inactive: 2, ok: 3 };
      const statusDiff = statusRank[a.audit_status] - statusRank[b.audit_status];
      if (statusDiff !== 0) return statusDiff;
      return a.vendor_name.localeCompare(b.vendor_name) || a.source_name.localeCompare(b.source_name);
    });

  return {
    checked_at: checkedAt,
    checked_updates: audit.checked_updates,
    checked_vendors: audit.checked_vendors,
    checked_sources: rows.length,
    ok_count: rows.filter((row) => row.audit_status === "ok").length,
    warning_count: rows.filter((row) => row.audit_status === "warning").length,
    error_count: rows.filter((row) => row.audit_status === "error").length,
    inactive_count: rows.filter((row) => row.audit_status === "inactive").length,
    findings: audit.findings,
    rows,
  };
}
