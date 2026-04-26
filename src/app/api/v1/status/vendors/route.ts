import { NextResponse } from "next/server";

import { PUBLIC_AGENT_HEADERS, PUBLIC_API_SCHEMA_VERSION } from "@/lib/agent-feed";
import { serializeVendorFreshnessStatuses } from "@/lib/agent-status";
import { getVendorFreshnessReport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export async function GET() {
  const report = await getVendorFreshnessReport();
  const vendors = serializeVendorFreshnessStatuses(report.vendors ?? []);

  return NextResponse.json(
    {
      schema_version: PUBLIC_API_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      count: vendors.length,
      vendors,
    },
    { headers: PUBLIC_AGENT_HEADERS },
  );
}
