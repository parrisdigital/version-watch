import { NextResponse } from "next/server";

import { buildPublicTaxonomy, PUBLIC_API_SCHEMA_VERSION, PUBLIC_AGENT_HEADERS } from "@/lib/agent-feed";
import { getAllPublicEvents, getVendors } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export async function GET() {
  const [events, vendors] = await Promise.all([getAllPublicEvents(), getVendors()]);

  return NextResponse.json(
    {
      schema_version: PUBLIC_API_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      taxonomy: buildPublicTaxonomy(events, vendors),
    },
    { headers: PUBLIC_AGENT_HEADERS },
  );
}
