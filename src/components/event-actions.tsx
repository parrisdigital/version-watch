"use client";

import { Check, Copy, FileJson, TriangleAlert } from "lucide-react";
import { useState } from "react";

type EventActionsProps = {
  citation: string;
  jsonUrl: string;
};

export function CopyCitation({ citation }: { citation: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function onCopy() {
    if (!navigator.clipboard) {
      setState("error");
      return;
    }

    try {
      await navigator.clipboard.writeText(citation);
      setState("copied");
      setTimeout(() => setState("idle"), 1600);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1600);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="vw-button vw-button-utility h-9 w-full px-3 text-xs sm:w-auto"
      aria-live="polite"
      title="Copy citation"
    >
      {state === "copied" ? (
        <Check className="size-4" aria-hidden="true" />
      ) : state === "error" ? (
        <TriangleAlert className="size-4" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      <span>
        {state === "copied"
          ? "Copied"
          : state === "error"
            ? "Copy failed"
            : "Copy"}
      </span>
    </button>
  );
}

export function EventActions({ citation, jsonUrl }: EventActionsProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center md:justify-end" aria-label="Event tools">
      <span className="font-[var(--font-mono)] text-[0.625rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)] sm:mr-1">
        Tools
      </span>
      <CopyCitation citation={citation} />
      <a
        href={jsonUrl}
        className="vw-button vw-button-utility h-9 w-full px-3 text-xs sm:w-auto"
        target="_blank"
        rel="noreferrer"
        title="View structured JSON"
      >
        <FileJson className="size-4" aria-hidden="true" />
        <span>JSON</span>
      </a>
    </div>
  );
}
