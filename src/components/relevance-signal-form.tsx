"use client";

import { useState } from "react";

type Signal = "impacted" | "needs_review" | "no_impact";

const SIGNALS: Array<{ value: Signal; label: string }> = [
  { value: "impacted", label: "Impacted us" },
  { value: "needs_review", label: "Needs review" },
  { value: "no_impact", label: "No impact" },
];

const AREAS = [
  ["api", "API"],
  ["auth", "Auth"],
  ["billing", "Billing"],
  ["deployments", "Deployments"],
  ["sdk", "SDK"],
  ["security", "Security"],
  ["mobile", "Mobile"],
  ["ai_agents", "AI agents"],
  ["docs", "Docs"],
  ["other", "Other"],
] as const;

export function RelevanceSignalForm({ eventId }: { eventId: string }) {
  const [area, setArea] = useState("api");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit(signal: Signal) {
    setStatus("saving");
    const response = await fetch("/api/v1/relevance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        signal,
        area,
      }),
    });

    setStatus(response.ok ? "saved" : "error");
  }

  return (
    <section className="vw-panel-flat mt-10 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
            Relevance signal
          </h2>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            Structured feedback helps tune future ranking without adding open-ended comments.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
          Area
          <select
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className="rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] px-2 py-1 text-sm text-[var(--color-ink)]"
          >
            {AREAS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SIGNALS.map((signal) => (
          <button
            key={signal.value}
            type="button"
            onClick={() => submit(signal.value)}
            disabled={status === "saving"}
            className="vw-button vw-button-secondary disabled:cursor-wait disabled:opacity-60"
          >
            {signal.label}
          </button>
        ))}
      </div>

      {status === "saved" ? (
        <p className="mt-3 text-sm text-[var(--color-green)]">Signal recorded.</p>
      ) : null}
      {status === "error" ? (
        <p className="mt-3 text-sm text-[var(--color-red)]">Signal could not be recorded.</p>
      ) : null}
    </section>
  );
}
