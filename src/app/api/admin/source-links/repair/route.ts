import { fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";

import { api } from "../../../../../../convex/_generated/api";

function getAdminSecret(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer || request.headers.get("x-admin-secret")?.trim() || undefined;
}

function requireAdminSecret(request: Request) {
  const expectedSecret = process.env.ADMIN_SECRET;
  const suppliedSecret = getAdminSecret(request);

  return Boolean(expectedSecret && suppliedSecret === expectedSecret);
}

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parsePrefixes(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
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
  const vendorSlug = getOptionalString(payload.vendor_slug ?? payload.vendorSlug);
  const prefixes = parsePrefixes(payload.prefixes ?? payload.blocked_prefixes ?? payload.blockedPrefixes);
  const dryRun = payload.dry_run !== false && payload.dryRun !== false;
  const limit = typeof payload.limit === "number" && Number.isFinite(payload.limit) ? Math.trunc(payload.limit) : undefined;

  if (!vendorSlug) {
    return NextResponse.json({ ok: false, error: "vendor_slug is required." }, { status: 400 });
  }

  if (!prefixes.length) {
    return NextResponse.json({ ok: false, error: "At least one prefix is required." }, { status: 400 });
  }

  try {
    const result = await fetchMutation(api.review.suppressSourceUrlPrefixes, {
      adminSecret: process.env.ADMIN_SECRET!,
      vendorSlug,
      prefixes,
      dryRun,
      limit,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Source link repair failed", error);
    return NextResponse.json({ ok: false, error: "Source link repair could not be completed." }, { status: 500 });
  }
}
