import {
  buildAgentDiscoveryLinks,
  buildApiCatalog,
  getPublicBaseUrl,
  PUBLIC_AGENT_HEADERS,
} from "@/lib/agent-feed";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export function HEAD(request: Request) {
  const baseUrl = getPublicBaseUrl(request.url);

  return new Response(null, {
    headers: {
      ...PUBLIC_AGENT_HEADERS,
      Link: buildAgentDiscoveryLinks(baseUrl),
      "Content-Type": "application/linkset+json; charset=utf-8",
    },
  });
}

export function GET(request: Request) {
  const baseUrl = getPublicBaseUrl(request.url);

  return new Response(JSON.stringify(buildApiCatalog(baseUrl)), {
    headers: {
      ...PUBLIC_AGENT_HEADERS,
      Link: buildAgentDiscoveryLinks(baseUrl),
      "Content-Type": "application/linkset+json; charset=utf-8",
    },
  });
}
