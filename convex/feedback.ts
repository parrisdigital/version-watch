"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

type FeedbackType =
  | "suggest_vendor"
  | "missing_update"
  | "wrong_signal"
  | "incorrect_summary"
  | "general";

const feedbackTypeLabels: Record<FeedbackType, string> = {
  suggest_vendor: "Suggest vendor",
  missing_update: "Report missing update",
  wrong_signal: "Wrong signal",
  incorrect_summary: "Incorrect summary",
  general: "General feedback",
};

function clampText(value: string | undefined, maxLength: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeEmail(value: string | undefined) {
  const email = clampText(value, 240).toLowerCase();
  if (!email) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

function normalizeUrl(value: string | undefined) {
  const url = clampText(value, 1000);
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function buildFeedbackEmail(args: {
  type: FeedbackType;
  message: string;
  email?: string;
  pageUrl?: string;
  userAgent?: string;
}) {
  const lines = [
    `Type: ${feedbackTypeLabels[args.type]}`,
    `Reply email: ${args.email ?? "Not provided"}`,
    `Page: ${args.pageUrl ?? "Not captured"}`,
    "",
    "Message:",
    args.message,
  ];

  if (args.userAgent) {
    lines.push("", `User agent: ${args.userAgent}`);
  }

  return {
    subject: `Version Watch feedback: ${feedbackTypeLabels[args.type]}`,
    text: lines.join("\n"),
  };
}

async function sendFeedbackEmail(args: {
  type: FeedbackType;
  message: string;
  email?: string;
  pageUrl?: string;
  userAgent?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;

  if (!apiKey || !to) {
    return { status: "email_skipped" as const };
  }

  const from = process.env.FEEDBACK_FROM_EMAIL ?? "Version Watch <onboarding@resend.dev>";
  const email = buildFeedbackEmail(args);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: args.email,
      subject: email.subject,
      text: email.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      status: "email_failed" as const,
      error: `Resend returned ${response.status}: ${body.slice(0, 500)}`,
    };
  }

  return { status: "emailed" as const };
}

export const submit = action({
  args: {
    type: v.union(
      v.literal("suggest_vendor"),
      v.literal("missing_update"),
      v.literal("wrong_signal"),
      v.literal("incorrect_summary"),
      v.literal("general"),
    ),
    message: v.string(),
    email: v.optional(v.string()),
    pageUrl: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    if (clampText(args.company, 200)) {
      return { ok: true };
    }

    const message = clampText(args.message, 4000);
    if (message.length < 8) {
      throw new Error("Feedback message is too short.");
    }

    const payload = {
      type: args.type,
      message,
      email: normalizeEmail(args.email),
      pageUrl: normalizeUrl(args.pageUrl),
      userAgent: clampText(args.userAgent, 500) || undefined,
    };

    const feedbackId = await ctx.runMutation(internal.feedbackState.store, payload);
    const notification = await sendFeedbackEmail(payload);

    await ctx.runMutation(internal.feedbackState.markNotificationResult, {
      feedbackId,
      status: notification.status,
      notificationError: notification.error,
    });

    return { ok: true };
  },
});
