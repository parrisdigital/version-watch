import { NextResponse } from "next/server";

import {
  filterEventsForPublicUpdateMatches,
  getPublicBaseUrl,
  parseUpdateFilters,
  PUBLIC_AGENT_HEADERS,
  PUBLIC_API_SCHEMA_VERSION,
  type UpdateFilters,
} from "@/lib/agent-feed";
import { clusterChangeEvents } from "@/lib/change-clusters";
import {
  comparePublicClusters,
  isPublicClusterAfterCursor,
  nextCursorForPublicCluster,
  serializePublicCluster,
} from "@/lib/public-clusters";
import { getAllPublicEvents, requestVendorRefreshIfStale } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

function responseFilters(filters: UpdateFilters) {
  return {
    since: filters.since ?? null,
    vendor: filters.vendor ?? null,
    severity: filters.severity ?? null,
    release_class: filters.releaseClass ?? null,
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
  const clusters = clusterChangeEvents(matches, { minClusterSize: 2, windowHours: 24 }).sort(comparePublicClusters);
  const eligible = parsed.filters.cursorPosition
    ? clusters.filter((cluster) => isPublicClusterAfterCursor(cluster, parsed.filters.cursorPosition!))
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
      next_cursor: lastCluster && eligible.length > page.length ? nextCursorForPublicCluster(lastCluster) : null,
      filters: responseFilters(parsed.filters),
      clusters: page.map((cluster) => serializePublicCluster(cluster, baseUrl)),
    },
    { headers: PUBLIC_AGENT_HEADERS },
  );
}
