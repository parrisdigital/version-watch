"use client";

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
      className="vw-button vw-button-ghost"
      aria-live="polite"
    >
      {state === "copied"
        ? "Copied"
        : state === "error"
          ? "Copy failed"
          : "Copy citation"}
    </button>
  );
}

export function EventActions({ citation, jsonUrl }: EventActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CopyCitation citation={citation} />
      <a href={jsonUrl} className="vw-button vw-button-ghost" target="_blank" rel="noreferrer">
        View JSON
      </a>
    </div>
  );
}
