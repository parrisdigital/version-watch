import {
  filterEventsForPublicUpdates,
  getPublicBaseUrl,
  parseUpdateFilters,
  renderUpdatesMarkdown,
  serializePublicUpdates,
} from "@/lib/agent-feed";
import { getAllPublicEvents } from "@/lib/site-data";

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
    return Response.json({ error: parsed.error }, { status: 400, headers: publicHeaders });
  }

  const baseUrl = getPublicBaseUrl(request.url);
  const generatedAt = new Date().toISOString();
  const events = await getAllPublicEvents();
  const updates = serializePublicUpdates(filterEventsForPublicUpdates(events, parsed.filters), baseUrl);

  return new Response(renderUpdatesMarkdown(updates, generatedAt, baseUrl), {
    headers: {
      ...publicHeaders,
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
