import { NextResponse } from "next/server";

import { PUBLIC_AGENT_HEADERS, PUBLIC_API_SCHEMA_VERSION, publicApiError } from "@/lib/agent-feed";
import { serializeVendorFreshnessStatus } from "@/lib/agent-status";
import { getVendorFreshnessReport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const report = await getVendorFreshnessReport(slug);
  const vendor = report.vendors?.[0];

  if (!vendor) {
    return NextResponse.json(publicApiError("not_found", "Vendor freshness status not found."), {
      status: 404,
      headers: PUBLIC_AGENT_HEADERS,
    });
  }

  return NextResponse.json(
    {
      schema_version: PUBLIC_API_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      vendor: serializeVendorFreshnessStatus(vendor),
    },
    { headers: PUBLIC_AGENT_HEADERS },
  );
}
