import {
  filterEventsForPublicUpdates,
  getPublicBaseUrl,
  parseUpdateFilters,
  PUBLIC_AGENT_HEADERS,
  renderUpdatesMarkdown,
  serializePublicUpdates,
} from "@/lib/agent-feed";
import { getAllPublicEvents } from "@/lib/site-data";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseUpdateFilters(url.searchParams);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400, headers: PUBLIC_AGENT_HEADERS });
  }

  const baseUrl = getPublicBaseUrl(request.url);
  const generatedAt = new Date().toISOString();
  const events = await getAllPublicEvents();
  const updates = serializePublicUpdates(filterEventsForPublicUpdates(events, parsed.filters), baseUrl);

  return new Response(renderUpdatesMarkdown(updates, generatedAt, baseUrl), {
    headers: {
      ...PUBLIC_AGENT_HEADERS,
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
