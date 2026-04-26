import { fetchMutation, fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";

import { api } from "../../../../../convex/_generated/api";

const convexApi = api as any;

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

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

async function readBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const watchlists = await fetchQuery(convexApi.watchlists.list, {
      adminSecret: process.env.ADMIN_SECRET!,
    });
    return NextResponse.json({ ok: true, watchlists });
  } catch (error) {
    console.error("Could not list watchlists", error);
    return NextResponse.json({ ok: false, error: "Watchlists could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = await readBody(request);
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const webhookType = stringValue(payload.webhook_type) ?? stringValue(payload.webhookType);
  const webhookUrl = stringValue(payload.webhook_url) ?? stringValue(payload.webhookUrl);

  if (!webhookType || !["discord", "slack", "generic"].includes(webhookType)) {
    return NextResponse.json(
      { ok: false, error: "webhook_type must be discord, slack, or generic." },
      { status: 400 },
    );
  }

  try {
    const result = await fetchMutation(convexApi.watchlists.upsert, {
      adminSecret: process.env.ADMIN_SECRET!,
      id: typeof payload.id === "string" ? payload.id : undefined,
      name: typeof payload.name === "string" ? payload.name : "",
      description: typeof payload.description === "string" ? payload.description : undefined,
      isActive: typeof payload.is_active === "boolean" ? payload.is_active : undefined,
      vendorSlugs: arrayOfStrings(payload.vendor_slugs ?? payload.vendorSlugs),
      severities: arrayOfStrings(payload.severities),
      audiences: arrayOfStrings(payload.audiences),
      tags: arrayOfStrings(payload.tags),
      releaseClasses: arrayOfStrings(payload.release_classes ?? payload.releaseClasses),
      webhookType,
      webhookUrl,
    });

    return NextResponse.json({ ok: true, watchlist: result });
  } catch (error) {
    console.error("Could not save watchlist", error);
    return NextResponse.json({ ok: false, error: "Watchlist could not be saved." }, { status: 400 });
  }
}
