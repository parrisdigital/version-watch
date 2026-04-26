import { fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";

import { api } from "../../../../../convex/_generated/api";
import { PUBLIC_AGENT_HEADERS, PUBLIC_API_SCHEMA_VERSION, publicApiError } from "@/lib/agent-feed";

const convexApi = api as any;

const signals = new Set(["impacted", "needs_review", "no_impact"]);
const areas = new Set(["api", "auth", "billing", "deployments", "sdk", "security", "mobile", "ai_agents", "docs", "other"]);

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

export function OPTIONS() {
  return new Response(null, { headers: PUBLIC_AGENT_HEADERS });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      publicApiError("invalid_filter", "Invalid JSON body."),
      { status: 400, headers: PUBLIC_AGENT_HEADERS },
    );
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const eventSlug = getString(payload.event_id ?? payload.event_slug ?? payload.eventSlug);
  const signal = getString(payload.signal);
  const area = getString(payload.area);
  const note = getString(payload.note);
  const company = getString(payload.company);

  if (!eventSlug) {
    return NextResponse.json(
      publicApiError("invalid_filter", "event_id is required."),
      { status: 400, headers: PUBLIC_AGENT_HEADERS },
    );
  }

  if (!signal || !signals.has(signal)) {
    return NextResponse.json(
      publicApiError("invalid_filter", "signal must be impacted, needs_review, or no_impact."),
      { status: 400, headers: PUBLIC_AGENT_HEADERS },
    );
  }

  if (!area || !areas.has(area)) {
    return NextResponse.json(
      publicApiError("invalid_filter", "area is invalid."),
      { status: 400, headers: PUBLIC_AGENT_HEADERS },
    );
  }

  try {
    await fetchMutation(convexApi.relevance.submit, {
      eventSlug,
      signal,
      area,
      note,
      company,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json(
      { schema_version: PUBLIC_API_SCHEMA_VERSION, ok: true },
      { headers: PUBLIC_AGENT_HEADERS },
    );
  } catch (error) {
    console.error("Relevance signal failed", error);
    return NextResponse.json(
      publicApiError("server_error", "Relevance signal could not be recorded."),
      { status: 500, headers: PUBLIC_AGENT_HEADERS },
    );
  }
}
