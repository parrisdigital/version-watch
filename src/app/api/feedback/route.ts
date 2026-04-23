import { fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";

import { api } from "../../../../convex/_generated/api";

const feedbackTypes = new Set([
  "suggest_vendor",
  "missing_update",
  "wrong_signal",
  "incorrect_summary",
  "general",
]);

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function normalizePageUrl(value: string | undefined, requestUrl: string) {
  if (!value?.trim()) return undefined;

  try {
    const url = new URL(value, requestUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid feedback payload." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const type = getString(data.type);
  const message = getString(data.message)?.trim() ?? "";

  if (!type || !feedbackTypes.has(type)) {
    return NextResponse.json({ ok: false, error: "Choose a feedback type." }, { status: 400 });
  }

  if (message.length < 8) {
    return NextResponse.json({ ok: false, error: "Add a little more detail." }, { status: 400 });
  }

  try {
    await fetchMutation(api.feedback.submit, {
      type: type as "suggest_vendor" | "missing_update" | "wrong_signal" | "incorrect_summary" | "general",
      message,
      pageUrl: normalizePageUrl(getString(data.pageUrl), request.url),
      company: getString(data.company),
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Feedback submission failed", error);
    return NextResponse.json({ ok: false, error: "Feedback could not be submitted." }, { status: 500 });
  }
}
