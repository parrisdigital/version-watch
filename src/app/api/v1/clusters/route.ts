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
import { getPublicUpdatesPage } from "@/lib/site-data";

export const dynamic = "force-dynamic";

const CLUSTER_EVENT_WINDOW_MULTIPLIER = 5;
const CLUSTER_EVENT_WINDOW_MIN = 50;
const CLUSTER_EVENT_WINDOW_MAX = 100;

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

function getClusterEventWindowLimit(limit: number) {
  return Math.min(
    CLUSTER_EVENT_WINDOW_MAX,
    Math.max(CLUSTER_EVENT_WINDOW_MIN, limit * CLUSTER_EVENT_WINDOW_MULTIPLIER),
  );
}

function cursorForClusterWindow(filters: UpdateFilters) {
  if (!filters.cursorPosition) {
    return undefined;
  }

  if (filters.cursorPosition.id.startsWith("single_")) {
    return {
      publishedAt: filters.cursorPosition.publishedAt,
      id: filters.cursorPosition.id.slice("single_".length),
    };
  }

  return {
    publishedAt: filters.cursorPosition.publishedAt,
    id: "\uffff",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseUpdateFilters(searchParams);

  if (!parsed.ok) {
    return NextResponse.json(parsed.error, { status: 400, headers: PUBLIC_AGENT_HEADERS });
  }

  const baseUrl = getPublicBaseUrl(request.url);
  const eventPage = await getPublicUpdatesPage({
    ...parsed.filters,
    cursorPosition: cursorForClusterWindow(parsed.filters),
    limit: getClusterEventWindowLimit(parsed.filters.limit),
  });
  const events = eventPage.events;
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
      next_cursor:
        lastCluster && (eligible.length > page.length || eventPage.next_cursor) ? nextCursorForPublicCluster(lastCluster) : null,
      filters: responseFilters(parsed.filters),
      clusters: page.map((cluster) => serializePublicCluster(cluster, baseUrl)),
    },
    { headers: PUBLIC_AGENT_HEADERS },
  );
}
