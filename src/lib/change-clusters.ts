import {
  deriveSignalMetadata,
  getReleaseFamily,
  releaseClassLabel,
  type ReleaseClass,
} from "@/lib/classification/signal";
import type { MockEvent } from "@/lib/mock-data";

export type ClusterableEvent = MockEvent & { computedScore?: number };

export type ChangeCluster = {
  id: string;
  kind: "single" | "cluster";
  vendorSlug: string;
  vendorName: string;
  sourceUrl: string;
  releaseFamily: string;
  releaseClass: ReleaseClass;
  title: string;
  summary: string;
  latestPublishedAt: string;
  earliestPublishedAt: string;
  updateCount: number;
  signalScore: number;
  events: ClusterableEvent[];
};

function eventTime(event: ClusterableEvent) {
  return Date.parse(event.publishedAt);
}

function clusterNoun(releaseClass: ReleaseClass) {
  if (releaseClass === "beta_release") return "beta releases";
  if (releaseClass === "cli_patch") return "CLI patches";
  if (releaseClass === "sdk_release") return "SDK releases";
  if (releaseClass === "routine_release") return "routine releases";
  return `${releaseClassLabel(releaseClass).toLowerCase()} updates`;
}

function getClusterKey(event: ClusterableEvent, releaseClass: ReleaseClass) {
  return `${event.vendorSlug}:${event.sourceUrl}:${getReleaseFamily(event, releaseClass)}`;
}

function signalScoreForEvent(event: ClusterableEvent) {
  const signal = deriveSignalMetadata(event);
  return event.scoreVersion === "v2" && typeof event.computedScore === "number" ? event.computedScore : signal.signalScore;
}

function singleCluster(event: ClusterableEvent): ChangeCluster {
  const signal = deriveSignalMetadata(event);

  return {
    id: `single_${event.slug}`,
    kind: "single",
    vendorSlug: event.vendorSlug,
    vendorName: event.vendorName,
    sourceUrl: event.sourceUrl,
    releaseFamily: getReleaseFamily(event, event.releaseClass ?? signal.releaseClass),
    releaseClass: event.releaseClass ?? signal.releaseClass,
    title: event.title,
    summary: event.summary,
    latestPublishedAt: event.publishedAt,
    earliestPublishedAt: event.publishedAt,
    updateCount: 1,
    signalScore: signalScoreForEvent(event),
    events: [event],
  };
}

function groupedCluster(events: ClusterableEvent[], windowHours: number): ChangeCluster {
  const sorted = events.slice().sort((a, b) => eventTime(b) - eventTime(a));
  const latest = sorted[0]!;
  const earliest = sorted[sorted.length - 1]!;
  const signal = deriveSignalMetadata(latest);
  const releaseClass = latest.releaseClass ?? signal.releaseClass;
  const score = Math.max(...sorted.map(signalScoreForEvent));

  return {
    id: `cluster_${latest.vendorSlug}_${getReleaseFamily(latest, releaseClass).replace(/[^a-z0-9_-]+/gi, "_")}_${Date.parse(latest.publishedAt)}`,
    kind: "cluster",
    vendorSlug: latest.vendorSlug,
    vendorName: latest.vendorName,
    sourceUrl: latest.sourceUrl,
    releaseFamily: getReleaseFamily(latest, releaseClass),
    releaseClass,
    title: `${latest.vendorName} shipped ${sorted.length} ${clusterNoun(releaseClass)} in ${windowHours} hours`,
    summary: `${latest.vendorName} published ${sorted.length} related updates from the same official source. Latest: ${latest.title}.`,
    latestPublishedAt: latest.publishedAt,
    earliestPublishedAt: earliest.publishedAt,
    updateCount: sorted.length,
    signalScore: score,
    events: sorted,
  };
}

export function clusterChangeEvents(
  events: ClusterableEvent[],
  options: { windowHours?: number; minClusterSize?: number } = {},
) {
  const windowHours = options.windowHours ?? 24;
  const minClusterSize = options.minClusterSize ?? 3;
  const windowMs = windowHours * 60 * 60 * 1000;
  const sorted = events.slice().sort((a, b) => eventTime(b) - eventTime(a));
  const groups: ClusterableEvent[][] = [];

  for (const event of sorted) {
    const signal = deriveSignalMetadata(event);
    const key = getClusterKey(event, event.releaseClass ?? signal.releaseClass);
    const published = eventTime(event);
    const group = groups.find((candidate) => {
      const latest = candidate[0]!;
      const latestSignal = deriveSignalMetadata(latest);
      return (
        getClusterKey(latest, latest.releaseClass ?? latestSignal.releaseClass) === key &&
        Math.abs(eventTime(latest) - published) <= windowMs
      );
    });

    if (group) {
      group.push(event);
    } else {
      groups.push([event]);
    }
  }

  return groups
    .flatMap((group) => {
      return group.length >= minClusterSize ? [groupedCluster(group, windowHours)] : group.map(singleCluster);
    })
    .sort((a, b) => Date.parse(b.latestPublishedAt) - Date.parse(a.latestPublishedAt));
}
