"use client";

import { type FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

const FEEDBACK_OPTIONS = [
  { value: "suggest_vendor", label: "Suggest a vendor" },
  { value: "missing_update", label: "Report a missing update" },
  { value: "wrong_signal", label: "Wrong signal on an event" },
  { value: "incorrect_summary", label: "Incorrect summary on an event" },
  { value: "bug", label: "Bug or site broken" },
  { value: "general", label: "General feedback" },
] as const;

type FeedbackType = (typeof FEEDBACK_OPTIONS)[number]["value"];

/** Backend types are fixed; "bug" piggybacks on "general" with a [bug] prefix. */
type SubmitType = "suggest_vendor" | "missing_update" | "wrong_signal" | "incorrect_summary" | "general";

type FeedbackFormProps = {
  initialType?: string;
  initialPageUrl?: string;
};

function normalizeType(value: string | undefined): FeedbackType {
  return FEEDBACK_OPTIONS.some((option) => option.value === value)
    ? (value as FeedbackType)
    : "general";
}

function sameOriginReferrer() {
  if (typeof document === "undefined" || !document.referrer) return "";

  try {
    const referrer = new URL(document.referrer);
    return referrer.origin === window.location.origin ? referrer.toString() : "";
  } catch {
    return "";
  }
}

function toSubmitType(type: FeedbackType): SubmitType {
  return type === "bug" ? "general" : type;
}

type FormState = {
  type: FeedbackType;
  reporter: string;
  vendorName: string;
  vendorUrl: string;
  eventRef: string;
  whereInApp: string;
  message: string;
};

function composeMessage(state: FormState): string {
  const headers: string[] = [];
  if (state.type === "bug") headers.push("[bug]");
  if (state.reporter.trim()) headers.push(`[reporter] ${state.reporter.trim()}`);
  if (state.vendorName.trim()) headers.push(`[vendor] ${state.vendorName.trim()}`);
  if (state.vendorUrl.trim()) headers.push(`[vendor-url] ${state.vendorUrl.trim()}`);
  if (state.eventRef.trim()) headers.push(`[event] ${state.eventRef.trim()}`);
  if (state.whereInApp.trim()) headers.push(`[where] ${state.whereInApp.trim()}`);

  const body = state.message.trim();
  if (!headers.length) return body;
  return [...headers, "", body].join("\n");
}

const TYPE_PLACEHOLDERS: Record<FeedbackType, string> = {
  suggest_vendor: "Why this vendor matters and what kind of changes you would expect from them.",
  missing_update: "What was published and where Version Watch should have caught it.",
  wrong_signal: "What signal you would have expected and why this one feels off.",
  incorrect_summary: "What the summary got wrong, and a more accurate read in plain language.",
  bug: "What you tried to do, what you saw, and what you expected.",
  general: "What should I know?",
};

export function FeedbackForm({ initialType, initialPageUrl }: FeedbackFormProps) {
  const [state, setState] = useState<FormState>(() => ({
    type: normalizeType(initialType),
    reporter: "",
    vendorName: "",
    vendorUrl: "",
    eventRef: "",
    whereInApp: "",
    message: "",
  }));
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const pageUrl = initialPageUrl ?? "";

  const selectedLabel = useMemo(
    () => FEEDBACK_OPTIONS.find((option) => option.value === state.type)?.label ?? "General feedback",
    [state.type],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");

    const composedMessage = composeMessage(state);
    const resolvedPageUrl = pageUrl || sameOriginReferrer();

    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: toSubmitType(state.type),
        message: composedMessage,
        pageUrl: resolvedPageUrl,
        company,
      }),
    });

    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !result?.ok) {
      setStatus("error");
      setError(result?.error ?? "Feedback could not be submitted.");
      return;
    }

    setStatus("success");
    setState((prev) => ({
      ...prev,
      reporter: "",
      vendorName: "",
      vendorUrl: "",
      eventRef: "",
      whereInApp: "",
      message: "",
    }));
    setCompany("");
  }

  const messageBody = state.message.trim();
  const canSubmit = status !== "submitting" && messageBody.length >= 8;

  return (
    <form onSubmit={submitFeedback} className="vw-panel p-5 md:p-6">
      <div className="grid gap-5">
        <Field label="What is this about?">
          <select
            value={state.type}
            onChange={(event) => update("type", event.target.value as FeedbackType)}
            className="vw-input"
          >
            {FEEDBACK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        {state.type === "suggest_vendor" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vendor name" hint="The platform or service you want tracked">
              <input
                type="text"
                value={state.vendorName}
                onChange={(event) => update("vendorName", event.target.value)}
                placeholder="e.g. Datadog"
                className="vw-input"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Official changelog or release page"
              hint="Where their updates ship"
            >
              <input
                type="url"
                value={state.vendorUrl}
                onChange={(event) => update("vendorUrl", event.target.value)}
                placeholder="https://"
                className="vw-input"
                autoComplete="off"
                inputMode="url"
              />
            </Field>
          </div>
        ) : null}

        {state.type === "missing_update" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vendor" hint="Which vendor missed it">
              <input
                type="text"
                value={state.vendorName}
                onChange={(event) => update("vendorName", event.target.value)}
                placeholder="e.g. Stripe"
                className="vw-input"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Source URL of the missing update"
              hint="The official post or release page"
            >
              <input
                type="url"
                value={state.vendorUrl}
                onChange={(event) => update("vendorUrl", event.target.value)}
                placeholder="https://"
                className="vw-input"
                autoComplete="off"
                inputMode="url"
              />
            </Field>
          </div>
        ) : null}

        {state.type === "wrong_signal" || state.type === "incorrect_summary" ? (
          <Field
            label="Event URL or slug"
            hint="Paste the Version Watch event URL, or the slug after /events/"
          >
            <input
              type="text"
              value={state.eventRef}
              onChange={(event) => update("eventRef", event.target.value)}
              placeholder="/events/openai-... or full URL"
              className="vw-input"
              autoComplete="off"
            />
          </Field>
        ) : null}

        {state.type === "bug" ? (
          <Field
            label="Where in the site"
            hint="Page, feature, or URL where you hit it"
          >
            <input
              type="text"
              value={state.whereInApp}
              onChange={(event) => update("whereInApp", event.target.value)}
              placeholder="e.g. /search filter dropdown, mobile Safari"
              className="vw-input"
              autoComplete="off"
            />
          </Field>
        ) : null}

        <Field
          label="Reporter"
          hint="Email or GitHub handle. Optional, used only if I need to follow up."
          optional
        >
          <input
            type="text"
            value={state.reporter}
            onChange={(event) => update("reporter", event.target.value)}
            placeholder="you@example.com or @username"
            className="vw-input"
            autoComplete="email"
          />
        </Field>

        <Field label="Message">
          <textarea
            value={state.message}
            onChange={(event) => update("message", event.target.value)}
            minLength={8}
            maxLength={4000}
            rows={6}
            required
            placeholder={TYPE_PLACEHOLDERS[state.type]}
            className="vw-input resize-y"
          />
        </Field>

        <label className="hidden" aria-hidden="true">
          Company
          <input
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>

        {pageUrl ? (
          <p className="break-all font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
            Captured page · {pageUrl.replace(/^https?:\/\/[^/]+/, "") || pageUrl}
          </p>
        ) : null}

        {status === "error" ? (
          <p role="alert" className="text-sm text-[var(--color-critical)]">
            {error}
          </p>
        ) : null}

        {status === "success" ? (
          <p role="status" className="flex items-center gap-2 text-sm text-[var(--color-green)]">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Feedback sent. Thank you.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!canSubmit}>
            <Send aria-hidden="true" className="size-4" />
            {status === "submitting" ? "Sending..." : `Send: ${selectedLabel.toLowerCase()}`}
          </Button>
          <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
            {messageBody.length}/4000
          </p>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-baseline justify-between gap-2">
        <span className="vw-kicker vw-kicker-muted">
          {label}
          {optional ? <span className="ml-2 normal-case tracking-normal">optional</span> : null}
        </span>
        {hint ? (
          <span className="text-xs font-normal normal-case tracking-normal text-[var(--muted-foreground)]">
            {hint}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}
