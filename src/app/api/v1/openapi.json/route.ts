import { NextResponse } from "next/server";

import { getPublicBaseUrl, PUBLIC_AGENT_HEADERS } from "@/lib/agent-feed";
import { buildOpenApiDocument } from "@/lib/agent-openapi";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export function GET(request: Request) {
  return NextResponse.json(buildOpenApiDocument(getPublicBaseUrl(request.url)), {
    headers: PUBLIC_AGENT_HEADERS,
  });
}
