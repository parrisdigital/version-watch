import { NextResponse } from "next/server";

import { serializePublicVendor } from "@/lib/agent-feed";
import { getVendors } from "@/lib/site-data";

export const dynamic = "force-dynamic";

const publicHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300, s-maxage=600",
};

export function OPTIONS() {
  return new Response(null, { headers: publicHeaders });
}

export async function GET() {
  const vendors = (await getVendors()).map(serializePublicVendor);

  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      count: vendors.length,
      vendors,
    },
    { headers: publicHeaders },
  );
}
