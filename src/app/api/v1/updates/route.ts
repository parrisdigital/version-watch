import { NextResponse } from "next/server";

import {
  getPublicBaseUrl,
  parseUpdateFilters,
  PUBLIC_API_SCHEMA_VERSION,
  PUBLIC_AGENT_HEADERS,
  serializePublicUpdates,
} from "@/lib/agent-feed";
import { getPublicUpdatesPage } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseUpdateFilters(url.searchParams);

  if (!parsed.ok) {
    return NextResponse.json(parsed.error, { status: 400, headers: PUBLIC_AGENT_HEADERS });
  }

  const baseUrl = getPublicBaseUrl(request.url);
  const page = await getPublicUpdatesPage(parsed.filters);
  const updates = serializePublicUpdates(page.events, baseUrl);

  return NextResponse.json(
    {
      schema_version: PUBLIC_API_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      status_url: new URL("/api/v1/status", baseUrl).toString(),
      count: updates.length,
      total_count: page.total_count,
      next_cursor: page.next_cursor,
      filters: {
        since: parsed.filters.since ?? null,
        vendor: parsed.filters.vendor ?? null,
        severity: parsed.filters.severity ?? null,
        release_class: parsed.filters.releaseClass ?? null,
        audience: parsed.filters.audience ?? null,
        tag: parsed.filters.tag ?? null,
        cursor: parsed.filters.cursor ?? null,
        limit: parsed.filters.limit,
      },
      updates,
    },
    { headers: PUBLIC_AGENT_HEADERS },
  );
}
