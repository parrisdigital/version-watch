"use client";

import { type FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

const feedbackOptions = [
  { value: "suggest_vendor", label: "Suggest vendor" },
  { value: "missing_update", label: "Report missing update" },
  { value: "wrong_signal", label: "Wrong signal" },
  { value: "incorrect_summary", label: "Incorrect summary" },
  { value: "general", label: "General feedback" },
] as const;

type FeedbackType = (typeof feedbackOptions)[number]["value"];

type FeedbackFormProps = {
  initialType?: string;
  initialPageUrl?: string;
};

function normalizeType(value: string | undefined): FeedbackType {
  return feedbackOptions.some((option) => option.value === value) ? (value as FeedbackType) : "general";
}

function sameOriginReferrer() {
  if (!document.referrer) return "";

  try {
    const referrer = new URL(document.referrer);
    return referrer.origin === window.location.origin ? referrer.toString() : "";
  } catch {
    return "";
  }
}

export function FeedbackForm({ initialType, initialPageUrl }: FeedbackFormProps) {
  const [type, setType] = useState<FeedbackType>(() => normalizeType(initialType));
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const pageUrl = initialPageUrl ?? "";
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const selectedLabel = useMemo(
    () => feedbackOptions.find((option) => option.value === type)?.label ?? "General feedback",
    [type],
  );

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");
    const resolvedPageUrl = pageUrl || sameOriginReferrer();

    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        message,
        pageUrl: resolvedPageUrl,
        company,
      }),
    });

    const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

    if (!response.ok || !result?.ok) {
      setStatus("error");
      setError(result?.error ?? "Feedback could not be submitted.");
      return;
    }

    setStatus("success");
    setMessage("");
    setCompany("");
  }

  return (
    <form onSubmit={submitFeedback} className="vw-panel p-5 md:p-6">
      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="vw-kicker vw-kicker-muted">Feedback type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as FeedbackType)}
            className="vw-input"
          >
            {feedbackOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="vw-kicker vw-kicker-muted">Message</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            minLength={8}
            maxLength={4000}
            rows={7}
            required
            placeholder={
              type === "suggest_vendor"
                ? "Which vendor should Version Watch track next?"
                : "What should I know?"
            }
            className="vw-input resize-y"
          />
        </label>

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
          <p className="break-all text-xs text-[var(--muted-foreground)]">
            Captured page: {pageUrl.replace(/^https?:\/\/[^/]+/, "") || pageUrl}
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
          <Button type="submit" disabled={status === "submitting" || message.trim().length < 8}>
            <Send aria-hidden="true" className="size-4" />
            {status === "submitting" ? "Sending..." : `Send ${selectedLabel.toLowerCase()}`}
          </Button>
        </div>
      </div>
    </form>
  );
}
