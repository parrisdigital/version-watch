import { NextResponse } from "next/server";

import { getPublicBaseUrl, PUBLIC_API_SCHEMA_VERSION, PUBLIC_AGENT_HEADERS, serializePublicUpdate } from "@/lib/agent-feed";
import { getEventBySlug } from "@/lib/site-data";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  const event = await getEventBySlug(params.id);

  if (!event) {
    return NextResponse.json({ error: "Update not found." }, { status: 404, headers: PUBLIC_AGENT_HEADERS });
  }

  return NextResponse.json(
    {
      schema_version: PUBLIC_API_SCHEMA_VERSION,
      update: serializePublicUpdate(event, getPublicBaseUrl(request.url)),
    },
    { headers: PUBLIC_AGENT_HEADERS },
  );
}
