import { clusterChangeEvents } from "@/lib/change-clusters";
import {
  deriveSignalMetadata,
  type ImpactConfidence,
  type ReleaseClass,
} from "@/lib/classification/signal";
import type { ImportanceBand, MockEvent } from "@/lib/mock-data";

type SignalEvent = MockEvent & { computedScore?: number };

type CountRow<T extends string = string> = {
  value: T;
  count: number;
};

export type SignalQualityReport = {
  total_events: number;
  score_version: {
    v2_rows: number;
    legacy_rows: number;
    stored_mismatch_rows: number;
  };
  release_classes: CountRow<ReleaseClass>[];
  severities: CountRow<ImportanceBand>[];
  impact_confidences: CountRow<ImpactConfidence>[];
  repeat_decay_count: number;
  low_confidence_count: number;
  weak_rationale_count: number;
  clustered_noise_groups: number;
  top_vendors: Array<{
    vendor_slug: string;
    vendor: string;
    total_count: number;
    high_or_critical_count: number;
    low_confidence_count: number;
  }>;
  watchlist_ready: {
    high_or_critical_count: number;
    breaking_or_security_count: number;
    routine_or_patch_count: number;
  };
  examples: {
    low_confidence: Array<{ id: string; vendor: string; title: string; release_class: ReleaseClass }>;
    repeat_decay: Array<{ id: string; vendor: string; title: string; signal_reasons: string[] }>;
    stored_mismatch: Array<{ id: string; vendor: string; stored_score: number | null; derived_score: number }>;
  };
};

function increment<T extends string>(map: Map<T, number>, key: T) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toRows<T extends string>(map: Map<T, number>) {
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function isWeakRationale(value: string) {
  return /review the official entry/i.test(value) || /updated .+ semantics/i.test(value);
}

function isStoredMismatch(event: SignalEvent, derivedScore: number, derivedBand: ImportanceBand) {
  if (event.scoreVersion !== "v2") return true;
  if (typeof event.computedScore === "number" && event.computedScore !== derivedScore) return true;
  return event.importanceBand !== derivedBand;
}

export function buildSignalQualityReport(events: SignalEvent[]): SignalQualityReport {
  const releaseClasses = new Map<ReleaseClass, number>();
  const severities = new Map<ImportanceBand, number>();
  const confidences = new Map<ImpactConfidence, number>();
  const vendorStats = new Map<
    string,
    {
      vendor_slug: string;
      vendor: string;
      total_count: number;
      high_or_critical_count: number;
      low_confidence_count: number;
    }
  >();
  const examples: SignalQualityReport["examples"] = {
    low_confidence: [],
    repeat_decay: [],
    stored_mismatch: [],
  };

  let v2Rows = 0;
  let legacyRows = 0;
  let storedMismatchRows = 0;
  let repeatDecayCount = 0;
  let lowConfidenceCount = 0;
  let weakRationaleCount = 0;
  let highOrCriticalCount = 0;
  let breakingOrSecurityCount = 0;
  let routineOrPatchCount = 0;

  for (const event of events) {
    const metadata = deriveSignalMetadata(event);
    const releaseClass = event.scoreVersion === "v2" && event.releaseClass ? event.releaseClass : metadata.releaseClass;
    const impactConfidence =
      event.scoreVersion === "v2" && event.impactConfidence ? event.impactConfidence : metadata.impactConfidence;
    const signalReasons =
      event.scoreVersion === "v2" && event.signalReasons?.length ? event.signalReasons : metadata.signalReasons;
    const severity = event.scoreVersion === "v2" ? event.importanceBand : metadata.importanceBand;

    increment(releaseClasses, releaseClass);
    increment(severities, severity);
    increment(confidences, impactConfidence);

    if (event.scoreVersion === "v2") {
      v2Rows += 1;
    } else {
      legacyRows += 1;
    }

    if (isStoredMismatch(event, metadata.signalScore, metadata.importanceBand)) {
      storedMismatchRows += 1;
      if (examples.stored_mismatch.length < 6) {
        examples.stored_mismatch.push({
          id: event.slug,
          vendor: event.vendorName,
          stored_score: typeof event.computedScore === "number" ? event.computedScore : null,
          derived_score: metadata.signalScore,
        });
      }
    }

    if (signalReasons.some((reason) => reason.startsWith("repeat_decay:"))) {
      repeatDecayCount += 1;
      if (examples.repeat_decay.length < 6) {
        examples.repeat_decay.push({
          id: event.slug,
          vendor: event.vendorName,
          title: event.title,
          signal_reasons: signalReasons,
        });
      }
    }

    if (impactConfidence === "low") {
      lowConfidenceCount += 1;
      if (examples.low_confidence.length < 6) {
        examples.low_confidence.push({
          id: event.slug,
          vendor: event.vendorName,
          title: event.title,
          release_class: releaseClass,
        });
      }
    }

    if (isWeakRationale(event.whyItMatters)) {
      weakRationaleCount += 1;
    }

    const isHighOrCritical = severity === "critical" || severity === "high";
    if (isHighOrCritical) highOrCriticalCount += 1;
    if (releaseClass === "breaking" || releaseClass === "security") breakingOrSecurityCount += 1;
    if (releaseClass === "cli_patch" || releaseClass === "beta_release" || releaseClass === "routine_release") {
      routineOrPatchCount += 1;
    }

    const vendor = vendorStats.get(event.vendorSlug) ?? {
      vendor_slug: event.vendorSlug,
      vendor: event.vendorName,
      total_count: 0,
      high_or_critical_count: 0,
      low_confidence_count: 0,
    };
    vendor.total_count += 1;
    if (isHighOrCritical) vendor.high_or_critical_count += 1;
    if (impactConfidence === "low") vendor.low_confidence_count += 1;
    vendorStats.set(event.vendorSlug, vendor);
  }

  const clusteredNoiseGroups = clusterChangeEvents(events, { minClusterSize: 2, windowHours: 24 }).filter(
    (cluster) => cluster.kind === "cluster",
  ).length;

  return {
    total_events: events.length,
    score_version: {
      v2_rows: v2Rows,
      legacy_rows: legacyRows,
      stored_mismatch_rows: storedMismatchRows,
    },
    release_classes: toRows(releaseClasses),
    severities: toRows(severities),
    impact_confidences: toRows(confidences),
    repeat_decay_count: repeatDecayCount,
    low_confidence_count: lowConfidenceCount,
    weak_rationale_count: weakRationaleCount,
    clustered_noise_groups: clusteredNoiseGroups,
    top_vendors: Array.from(vendorStats.values())
      .sort((a, b) => b.high_or_critical_count - a.high_or_critical_count || b.total_count - a.total_count)
      .slice(0, 10),
    watchlist_ready: {
      high_or_critical_count: highOrCriticalCount,
      breaking_or_security_count: breakingOrSecurityCount,
      routine_or_patch_count: routineOrPatchCount,
    },
    examples,
  };
}
