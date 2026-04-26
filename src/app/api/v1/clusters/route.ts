import { NextResponse } from "next/server";

import {
  encodeUpdateCursor,
  filterEventsForPublicUpdateMatches,
  getPublicBaseUrl,
  parseUpdateFilters,
  PUBLIC_AGENT_HEADERS,
  PUBLIC_API_SCHEMA_VERSION,
  serializePublicUpdate,
  type UpdateCursor,
  type UpdateFilters,
} from "@/lib/agent-feed";
import { clusterChangeEvents, type ChangeCluster } from "@/lib/change-clusters";
import { getImportanceBand } from "@/lib/classification/signal";
import { getAllPublicEvents, requestVendorRefreshIfStale } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

function compareClusters(a: ChangeCluster, b: ChangeCluster) {
  const publishedDiff = Date.parse(b.latestPublishedAt) - Date.parse(a.latestPublishedAt);
  if (publishedDiff !== 0) return publishedDiff;
  return a.id.localeCompare(b.id);
}

function isClusterAfterCursor(cluster: ChangeCluster, cursor: UpdateCursor) {
  const publishedDiff = Date.parse(cursor.publishedAt) - Date.parse(cluster.latestPublishedAt);
  if (publishedDiff !== 0) return publishedDiff > 0;
  return cluster.id.localeCompare(cursor.id) > 0;
}

function cursorForCluster(cluster: ChangeCluster): UpdateCursor {
  return {
    publishedAt: new Date(Date.parse(cluster.latestPublishedAt)).toISOString(),
    id: cluster.id,
  };
}

function serializeCluster(cluster: ChangeCluster, baseUrl: string) {
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

function responseFilters(filters: UpdateFilters) {
  return {
    since: filters.since ?? null,
    vendor: filters.vendor ?? null,
    severity: filters.severity ?? null,
    audience: filters.audience ?? null,
    tag: filters.tag ?? null,
    cursor: filters.cursor ?? null,
    limit: filters.limit,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseUpdateFilters(searchParams);

  if (!parsed.ok) {
    return NextResponse.json(parsed.error, { status: 400, headers: PUBLIC_AGENT_HEADERS });
  }

  if (parsed.filters.vendor) {
    await requestVendorRefreshIfStale(parsed.filters.vendor);
  }

  const baseUrl = getPublicBaseUrl(request.url);
  const events = await getAllPublicEvents();
  const matches = filterEventsForPublicUpdateMatches(events, parsed.filters);
  const clusters = clusterChangeEvents(matches, { minClusterSize: 2, windowHours: 24 }).sort(compareClusters);
  const eligible = parsed.filters.cursorPosition
    ? clusters.filter((cluster) => isClusterAfterCursor(cluster, parsed.filters.cursorPosition!))
    : clusters;
  const page = eligible.slice(0, parsed.filters.limit);
  const lastCluster = page[page.length - 1];

  return NextResponse.json(
    {
      schema_version: PUBLIC_API_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      status_url: new URL("/api/v1/status", baseUrl).toString(),
      count: page.length,
      total_count: clusters.length,
      next_cursor: lastCluster && eligible.length > page.length ? encodeUpdateCursor(cursorForCluster(lastCluster)) : null,
      filters: responseFilters(parsed.filters),
      clusters: page.map((cluster) => serializeCluster(cluster, baseUrl)),
    },
    { headers: PUBLIC_AGENT_HEADERS },
  );
}

