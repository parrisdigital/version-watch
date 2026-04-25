import { NextResponse } from "next/server";

import {
  filterEventsForPublicUpdates,
  getPublicBaseUrl,
  parseUpdateFilters,
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

  const events = await getAllPublicEvents();
  const filtered = filterEventsForPublicUpdates(events, parsed.filters);
  const updates = serializePublicUpdates(filtered, getPublicBaseUrl(request.url));

  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      count: updates.length,
      filters: {
        since: parsed.filters.since ?? null,
        vendor: parsed.filters.vendor ?? null,
        severity: parsed.filters.severity ?? null,
        audience: parsed.filters.audience ?? null,
        tag: parsed.filters.tag ?? null,
        limit: parsed.filters.limit,
      },
      updates,
    },
    { headers: PUBLIC_AGENT_HEADERS },
  );
}
