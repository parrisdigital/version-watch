"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  code: string;
  title?: string;
  language?: string;
  className?: string;
};

export function CodeBlock({ code, title, language = "text", className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("min-w-0 overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border bg-muted/45 px-4">
        <div className="min-w-0">
          {title ? (
            <p className="truncate font-mono text-xs text-muted-foreground">{title}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 shrink-0 rounded-md px-2"
          aria-label={copied ? "Copied code" : "Copy code"}
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <pre className="max-w-full overflow-x-auto p-4 text-sm leading-6">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}
