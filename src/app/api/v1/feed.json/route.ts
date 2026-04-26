import { NextResponse } from "next/server";

import {
  getPublicBaseUrl,
  paginateEventsForPublicUpdates,
  parseUpdateFilters,
  PUBLIC_API_SCHEMA_VERSION,
  PUBLIC_AGENT_HEADERS,
  serializePublicUpdates,
} from "@/lib/agent-feed";
import { getAllPublicEvents } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseUpdateFilters(url.searchParams);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: PUBLIC_AGENT_HEADERS });
  }

  const baseUrl = getPublicBaseUrl(request.url);
  const events = await getAllPublicEvents();
  const page = paginateEventsForPublicUpdates(events, parsed.filters);
  const updates = serializePublicUpdates(page.events, baseUrl);

  return NextResponse.json(
    {
      schema_version: PUBLIC_API_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      feed_url: new URL("/api/v1/feed.json", baseUrl).toString(),
      count: updates.length,
      total_count: page.total_count,
      next_cursor: page.next_cursor,
      updates,
    },
    { headers: PUBLIC_AGENT_HEADERS },
  );
}
