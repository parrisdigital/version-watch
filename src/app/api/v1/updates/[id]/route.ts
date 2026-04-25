import { NextResponse } from "next/server";

import { getPublicBaseUrl, serializePublicUpdate } from "@/lib/agent-feed";
import { getEventBySlug } from "@/lib/site-data";

export const dynamic = "force-dynamic";

const publicHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60, s-maxage=300",
};

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export function OPTIONS() {
  return new Response(null, { headers: publicHeaders });
}

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  const event = await getEventBySlug(params.id);

  if (!event) {
    return NextResponse.json({ error: "Update not found." }, { status: 404, headers: publicHeaders });
  }

  return NextResponse.json(
    {
      update: serializePublicUpdate(event, getPublicBaseUrl(request.url)),
    },
    { headers: publicHeaders },
  );
}
