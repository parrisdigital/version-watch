import { fetchMutation } from "convex/nextjs";
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

  return Boolean(expectedSecret && suppliedSecret === expectedSecret);
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
  const dryRun = payload.dry_run === true || payload.dryRun === true;
  const limit = typeof payload.limit === "number" && Number.isFinite(payload.limit) ? Math.trunc(payload.limit) : undefined;
  const adminSecret = process.env.ADMIN_SECRET!;

  try {
    const result = await fetchMutation(api.review.rescoreSignalV2, {
      adminSecret,
      dryRun,
      limit,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Signal rescore failed", error);
    return NextResponse.json({ ok: false, error: "Signal rescore could not be completed." }, { status: 500 });
  }
}

