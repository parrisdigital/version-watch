import { NextResponse } from "next/server";

import {
  buildAgentDiscoveryLinks,
  buildAgentSkillsManifest,
  getPublicBaseUrl,
  PUBLIC_AGENT_HEADERS,
} from "@/lib/agent-feed";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export function GET(request: Request) {
  const baseUrl = getPublicBaseUrl(request.url);

  return NextResponse.json(buildAgentSkillsManifest(baseUrl), {
    headers: {
      ...PUBLIC_AGENT_HEADERS,
      Link: buildAgentDiscoveryLinks(baseUrl),
    },
  });
}
