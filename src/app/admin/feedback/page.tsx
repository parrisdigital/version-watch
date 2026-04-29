import Link from "next/link";

import { SiteHeader } from "@/components/marketing/site-header";
import { getFeedbackSubmissions } from "@/lib/site-data";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  suggest_vendor: "Suggest vendor",
  missing_update: "Missing update",
  wrong_signal: "Wrong signal",
  incorrect_summary: "Incorrect summary",
  general: "General",
};

const TYPE_COLOR: Record<string, string> = {
  suggest_vendor: "text-[var(--color-medium)]",
  missing_update: "text-[var(--color-high)]",
  wrong_signal: "text-[var(--color-critical)]",
  incorrect_summary: "text-[var(--color-critical)]",
  general: "text-[var(--muted-foreground)]",
};

const HEADER_KEYS = ["bug", "reporter", "vendor", "vendor-url", "event", "where"] as const;
type HeaderKey = (typeof HEADER_KEYS)[number];

type ParsedMessage = {
  headers: Partial<Record<HeaderKey, string>>;
  isBug: boolean;
  body: string;
};

function parseMessage(raw: string): ParsedMessage {
  const headers: Partial<Record<HeaderKey, string>> = {};
  let isBug = false;
  const lines = raw.split("\n");

  let cursor = 0;
  while (cursor < lines.length) {
    const line = lines[cursor];
    const trimmed = line?.trim() ?? "";

    if (!trimmed) {
      cursor += 1;
      break;
    }

    const match = trimmed.match(/^\[([a-z][a-z-]*)\](?:\s+(.*))?$/i);
    if (!match) break;

    const key = match[1].toLowerCase() as HeaderKey;
    const value = match[2]?.trim() ?? "";

    if (key === "bug") {
      isBug = true;
    } else if ((HEADER_KEYS as readonly string[]).includes(key)) {
      headers[key] = value;
    }

    cursor += 1;
  }

  const body = lines.slice(cursor).join("\n").trim();
  return { headers, isBug, body: body || raw.trim() };
}

function formatTimestamp(value: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

function safePathname(value?: string) {
  if (!value) return null;
  try {
    return new URL(value).pathname;
  } catch {
    return value.length > 64 ? value.slice(0, 64) + "…" : value;
  }
}

function HeaderRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
      <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </span>
      <span className="text-[var(--foreground)]">{children}</span>
    </div>
  );
}

export default async function AdminFeedbackPage() {
  const feedback = await getFeedbackSubmissions();

  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="border-b border-[var(--color-line)] px-4 pb-10 pt-28 sm:px-6 md:pb-14 md:pt-32">
        <div className="vw-shell flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="vw-kicker">Admin · Feedback inbox</p>
            <h1 className="vw-display mt-3 text-4xl md:text-5xl">Feedback inbox</h1>
            <p className="vw-copy mt-3 max-w-[58ch] text-pretty text-base">
              {feedback.length} {feedback.length === 1 ? "submission" : "submissions"}, newest first.
            </p>
          </div>
          <Link href="/admin" className="vw-button vw-button-ghost">
            ← Dashboard
          </Link>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="vw-shell">
          {feedback.length === 0 ? (
            <p className="vw-panel p-10 text-center font-mono text-[0.75rem] uppercase tracking-wider text-[var(--muted-foreground)]">
              Inbox is empty.
            </p>
          ) : (
            <ul role="list" className="grid gap-2">
              {feedback.map((entry) => {
                const path = safePathname(entry.pageUrl);
                const parsed = parseMessage(entry.message ?? "");
                const typeLabel = parsed.isBug ? "Bug" : TYPE_LABEL[entry.type] ?? entry.type;
                const typeColor = parsed.isBug
                  ? "text-[var(--color-critical)]"
                  : TYPE_COLOR[entry.type] ?? "text-[var(--muted-foreground)]";

                return (
                  <li key={entry._id} className="vw-panel-flat p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`font-mono text-[0.6875rem] uppercase tracking-wider ${typeColor}`}
                      >
                        {typeLabel}
                      </span>
                      <span className="font-mono text-[0.6875rem] tabular-nums text-[var(--muted-foreground)]">
                        {formatTimestamp(entry.createdAt)}
                      </span>
                      {path ? (
                        entry.pageUrl ? (
                          <a
                            href={entry.pageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-auto font-mono text-[0.6875rem] tabular-nums text-[var(--color-ink-muted)] hover:text-[var(--foreground)]"
                          >
                            {path}
                          </a>
                        ) : null
                      ) : null}
                    </div>

                    {Object.keys(parsed.headers).length > 0 ? (
                      <div className="mt-4 grid gap-1.5 rounded-md border border-[var(--color-line-quiet)] bg-[var(--color-surface-raised)] p-3">
                        {parsed.headers.reporter ? (
                          <HeaderRow label="Reporter">
                            {parsed.headers.reporter.startsWith("@") ||
                            !parsed.headers.reporter.includes("@")
                              ? parsed.headers.reporter
                              : (
                                <a
                                  href={`mailto:${parsed.headers.reporter}`}
                                  className="underline-offset-4 hover:underline"
                                >
                                  {parsed.headers.reporter}
                                </a>
                              )}
                          </HeaderRow>
                        ) : null}
                        {parsed.headers.vendor ? (
                          <HeaderRow label="Vendor">{parsed.headers.vendor}</HeaderRow>
                        ) : null}
                        {parsed.headers["vendor-url"] ? (
                          <HeaderRow label="Source URL">
                            <a
                              href={parsed.headers["vendor-url"]}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all underline-offset-4 hover:underline"
                            >
                              {parsed.headers["vendor-url"]}
                            </a>
                          </HeaderRow>
                        ) : null}
                        {parsed.headers.event ? (
                          <HeaderRow label="Event">{parsed.headers.event}</HeaderRow>
                        ) : null}
                        {parsed.headers.where ? (
                          <HeaderRow label="Where">{parsed.headers.where}</HeaderRow>
                        ) : null}
                      </div>
                    ) : null}

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink-soft)]">
                      {parsed.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
