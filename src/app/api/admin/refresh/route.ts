import { fetchAction } from "convex/nextjs";
import { NextResponse } from "next/server";

import { api } from "../../../../../convex/_generated/api";

function getAdminSecret(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer || request.headers.get("x-admin-secret")?.trim() || undefined;
}

function requireAdminSecret(request: Request) {
  const expectedSecret = process.env.ADMIN_SECRET;
  const suppliedSecret = getAdminSecret(request);

  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    return false;
  }

  return true;
}

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function POST(request: Request) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const vendorSlug = getOptionalString(payload.vendor ?? payload.vendor_slug);
  const sourceUrl = getOptionalString(payload.source_url ?? payload.sourceUrl);
  const force = payload.force === true;
  const adminSecret = process.env.ADMIN_SECRET!;

  try {
    const result = await fetchAction(api.ingest.runManualIngestion, {
      adminSecret,
      force,
      vendorSlug,
      sourceUrl,
    });

    return NextResponse.json({
      ok: true,
      refresh: {
        scope: sourceUrl ? "source" : vendorSlug ? "vendor" : "due_sources",
        vendor_slug: vendorSlug ?? null,
        source_url: sourceUrl ?? null,
        force,
        ...result,
      },
    });
  } catch (error) {
    console.error("Admin refresh failed", error);
    return NextResponse.json({ ok: false, error: "Refresh could not be started." }, { status: 500 });
  }
}
