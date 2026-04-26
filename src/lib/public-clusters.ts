import {
  encodeUpdateCursor,
  serializePublicUpdate,
  type PublicUpdate,
  type UpdateCursor,
} from "@/lib/agent-feed";
import { type ChangeCluster } from "@/lib/change-clusters";
import { getImportanceBand } from "@/lib/classification/signal";

export type PublicUpdateCluster = {
  id: string;
  kind: "single" | "cluster";
  vendor: string;
  vendor_slug: string;
  title: string;
  release_class: PublicUpdate["release_class"];
  severity: PublicUpdate["severity"];
  signal_score: number;
  update_count: number;
  latest_published_at: string;
  earliest_published_at: string;
  tags: string[];
  summary: string;
  why_it_matters: string;
  recommended_action: string;
  updates: PublicUpdate[];
};

export function comparePublicClusters(a: ChangeCluster, b: ChangeCluster) {
  const publishedDiff = Date.parse(b.latestPublishedAt) - Date.parse(a.latestPublishedAt);
  if (publishedDiff !== 0) return publishedDiff;
  return a.id.localeCompare(b.id);
}

export function isPublicClusterAfterCursor(cluster: ChangeCluster, cursor: UpdateCursor) {
  const publishedDiff = Date.parse(cursor.publishedAt) - Date.parse(cluster.latestPublishedAt);
  if (publishedDiff !== 0) return publishedDiff > 0;
  return cluster.id.localeCompare(cursor.id) > 0;
}

export function cursorForPublicCluster(cluster: ChangeCluster): UpdateCursor {
  return {
    publishedAt: new Date(Date.parse(cluster.latestPublishedAt)).toISOString(),
    id: cluster.id,
  };
}

export function nextCursorForPublicCluster(cluster: ChangeCluster) {
  return encodeUpdateCursor(cursorForPublicCluster(cluster));
}

export function serializePublicCluster(cluster: ChangeCluster, baseUrl: string): PublicUpdateCluster {
  const updates = cluster.events.map((event) => serializePublicUpdate(event, baseUrl));
  const tags = Array.from(new Set(updates.flatMap((update) => update.tags))).sort((a, b) => a.localeCompare(b));
  const primary = updates[0]!;

  return {
    id: cluster.id,
    kind: cluster.kind,
    vendor: cluster.vendorName,
    vendor_slug: cluster.vendorSlug,
    title: cluster.title,
    release_class: cluster.releaseClass,
    severity: getImportanceBand(cluster.signalScore),
    signal_score: cluster.signalScore,
    update_count: cluster.updateCount,
    latest_published_at: cluster.latestPublishedAt,
    earliest_published_at: cluster.earliestPublishedAt,
    tags,
    summary: cluster.summary,
    why_it_matters: primary.why_it_matters,
    recommended_action: primary.recommended_action,
    updates,
  };
}
