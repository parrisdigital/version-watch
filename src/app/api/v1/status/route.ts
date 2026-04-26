import { NextResponse } from "next/server";

import { PUBLIC_AGENT_HEADERS, PUBLIC_API_SCHEMA_VERSION } from "@/lib/agent-feed";
import { buildPublicApiStatus } from "@/lib/agent-status";
import { getProductionFreshnessReport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export async function GET() {
  const report = await getProductionFreshnessReport({ sinceHours: 8, eventLimit: 1 });

  return NextResponse.json(
    {
      schema_version: PUBLIC_API_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      ...buildPublicApiStatus(report),
    },
    { headers: PUBLIC_AGENT_HEADERS },
  );
}
