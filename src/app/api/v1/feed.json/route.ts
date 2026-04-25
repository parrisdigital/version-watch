import { NextResponse } from "next/server";

import {
  filterEventsForPublicUpdates,
  getPublicBaseUrl,
  parseUpdateFilters,
  serializePublicUpdates,
} from "@/lib/agent-feed";
import { getAllPublicEvents } from "@/lib/site-data";

export const dynamic = "force-dynamic";

const publicHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60, s-maxage=300",
};

export function OPTIONS() {
  return new Response(null, { headers: publicHeaders });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseUpdateFilters(url.searchParams);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: publicHeaders });
  }

  const baseUrl = getPublicBaseUrl(request.url);
  const events = await getAllPublicEvents();
  const updates = serializePublicUpdates(filterEventsForPublicUpdates(events, parsed.filters), baseUrl);

  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      feed_url: new URL("/api/v1/feed.json", baseUrl).toString(),
      count: updates.length,
      updates,
    },
    { headers: publicHeaders },
  );
}
