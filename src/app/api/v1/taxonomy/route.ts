import { NextResponse } from "next/server";

import { PUBLIC_API_SCHEMA_VERSION, PUBLIC_AGENT_HEADERS, PUBLIC_SEVERITIES } from "@/lib/agent-feed";
import { IMPACT_CONFIDENCES, RELEASE_CLASSES } from "@/lib/classification/signal";
import { getPublicTaxonomyStats, getVendors } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export async function GET() {
  const [stats, vendors] = await Promise.all([getPublicTaxonomyStats(), getVendors()]);

  return NextResponse.json(
    {
      schema_version: PUBLIC_API_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      taxonomy: {
        severities: [...PUBLIC_SEVERITIES],
        release_classes: [...RELEASE_CLASSES],
        impact_confidences: [...IMPACT_CONFIDENCES],
        audiences: stats.audiences,
        tags: stats.tags,
        source_types: stats.sourceTypes,
        vendors: vendors.map((vendor) => ({ slug: vendor.slug, name: vendor.name })),
      },
    },
    { headers: PUBLIC_AGENT_HEADERS },
  );
}
