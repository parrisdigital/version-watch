import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";

import { SeverityPill } from "@/components/severity-pill";
import { VendorMark } from "@/components/vendor-mark";
import type { MockEvent } from "@/lib/mock-data";

type EventCardProps = {
  event: MockEvent & { computedScore?: number };
  compact?: boolean;
  eventHref?: string;
};

const sourceTypeLabel: Record<MockEvent["sourceType"], string> = {
  github_release: "GitHub release",
  changelog_page: "Changelog",
  docs_page: "Docs",
  blog: "Blog",
  rss: "RSS",
};

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8 H12.5 M8.5 4 L12.5 8 L8.5 12" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 9 C5.5 10.5 5.5 12.5 7 14 C8.5 15.5 10.5 15.5 12 14 L14 12 C15.5 10.5 15.5 8.5 14 7" />
      <path d="M9 7 C10.5 5.5 10.5 3.5 9 2 C7.5 0.5 5.5 0.5 4 2 L2 4 C0.5 5.5 0.5 7.5 2 9" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-3.5 shrink-0"
      fill="currentColor"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function EventCard({ event, compact = false, eventHref }: EventCardProps) {
  const publishedDate = new Date(event.publishedAt);
  const relative = formatDistanceToNowStrict(publishedDate, { addSuffix: true });
  const absolute = format(publishedDate, "MMM d, yyyy");
  const href = eventHref ?? `/events/${event.slug}`;

  return (
    <article className="group vw-panel relative overflow-hidden p-6 transition-[border-color,background-color] duration-300 hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-raised)] md:p-7">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex items-center gap-3">
          <VendorMark vendorSlug={event.vendorSlug} vendorName={event.vendorName} size="sm" />
          <span className="flex flex-col leading-tight">
            <span className="font-[var(--font-display)] text-sm font-semibold text-[var(--color-ink)]">
              {event.vendorName}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">
              {sourceTypeLabel[event.sourceType]}
            </span>
          </span>
        </span>

        <span className="ml-auto flex flex-wrap items-center gap-3">
          <SeverityPill band={event.importanceBand} />
          <span
            className="text-xs tabular-nums text-[var(--color-ink-muted)]"
            title={absolute}
          >
            {relative}
          </span>
        </span>
      </div>

      <h3 className="vw-title mt-6 text-[1.5rem] leading-[1.15] md:text-[1.75rem]">
        <Link
          href={href}
          className="vw-stretched-link text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-signal)]"
        >
          {event.title}
        </Link>
      </h3>

      <p className="vw-copy mt-4 text-[0.9375rem] leading-[1.6] md:text-base">{event.summary}</p>

      {!compact ? (
        <dl className="mt-6 grid gap-4 md:grid-cols-[auto_1fr] md:gap-x-8 md:gap-y-3">
          <dt className="text-xs uppercase tracking-[0.14em] text-[var(--color-signal)]">
            Why it matters
          </dt>
          <dd className="text-[0.9375rem] leading-[1.65] text-[var(--color-ink-soft)]">
            {event.whyItMatters}
          </dd>

          <dt className="text-xs uppercase tracking-[0.14em] text-[var(--color-signal)]">
            Who should care
          </dt>
          <dd className="flex flex-wrap gap-1.5">
            {event.whoShouldCare.map((role) => (
              <span key={role} className="vw-tag vw-tag-mono">
                {role}
              </span>
            ))}
          </dd>
        </dl>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {event.categories.map((category) => (
          <span key={category} className="vw-tag vw-tag-mono">
            {category}
          </span>
        ))}
        {event.affectedStack.slice(0, compact ? 2 : 4).map((stack) => (
          <span key={stack} className="vw-tag vw-tag-mono">
            {stack}
          </span>
        ))}
        <span
          className="ml-auto font-[var(--font-mono)] text-[0.6875rem] tabular-nums text-[var(--color-ink-muted)]"
          title="Version Watch signal score"
        >
          {event.computedScore ?? 0}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--color-line-quiet)] pt-5">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-ink-soft)] transition-colors group-hover:text-[var(--color-signal)]">
          Read event <ArrowIcon />
        </span>

        {/* Interactive children sit above the stretched-link overlay (z-10 > ::after z-1). */}
        <span className="relative z-10 ml-auto flex flex-wrap gap-2">
          <a
            href={event.sourceUrl}
            className="vw-button vw-button-ghost"
            target="_blank"
            rel="noreferrer"
          >
            <LinkIcon />
            Official source
          </a>
          {event.githubUrl ? (
            <a
              href={event.githubUrl}
              className="vw-button vw-button-ghost"
              target="_blank"
              rel="noreferrer"
            >
              <GithubIcon />
              GitHub
            </a>
          ) : null}
        </span>
      </div>
    </article>
  );
}
