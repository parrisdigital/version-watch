import Link from "next/link";
import { format } from "date-fns";

import { VendorMark } from "@/components/vendor-mark";
import type { MockEvent } from "@/lib/mock-data";

type EventCardProps = {
  event: MockEvent & { computedScore?: number };
  compact?: boolean;
};

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-300">
      {children}
    </span>
  );
}

export function EventCard({ event, compact = false }: EventCardProps) {
  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 transition-transform duration-500 hover:-translate-y-1">
      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
        <span className="flex items-center gap-3">
          <VendorMark vendorSlug={event.vendorSlug} vendorName={event.vendorName} size="sm" />
          <span className="font-mono uppercase tracking-wide text-emerald-300/80">{event.vendorName}</span>
        </span>
        <span>{format(new Date(event.publishedAt), "MMM d, yyyy")}</span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-200">{event.importanceBand}</span>
        <span className="rounded-full border border-white/10 px-3 py-1 tabular-nums text-zinc-500">
          score {event.computedScore ?? 0}
        </span>
      </div>

      <h3 className="mt-5 max-w-[22ch] text-balance text-3xl font-semibold tracking-tight text-zinc-50">
        <Link href={`/events/${event.slug}`}>{event.title}</Link>
      </h3>

      <p className="mt-4 max-w-[64ch] text-pretty text-base text-zinc-300">{event.summary}</p>
      {event.sourceTitle && event.sourceTitle !== event.title ? (
        <p className="mt-3 max-w-[68ch] text-pretty text-sm text-zinc-500">
          Official entry: {event.sourceTitle}
        </p>
      ) : null}

      {!compact ? (
        <div className="mt-8 grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm font-semibold text-zinc-50">Why it matters</p>
            <p className="mt-3 text-base text-zinc-400">{event.whyItMatters}</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm font-semibold text-zinc-50">Who should care</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {event.whoShouldCare.map((role) => (
                <MetaPill key={role}>{role}</MetaPill>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {event.categories.map((category) => (
          <MetaPill key={category}>{category}</MetaPill>
        ))}
        {event.affectedStack.map((stack) => (
          <MetaPill key={stack}>{stack}</MetaPill>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={event.sourceUrl}
          className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/20 hover:text-zinc-50"
        >
          Official source
        </Link>
        {event.githubUrl ? (
          <Link
            href={event.githubUrl}
            className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/20 hover:text-zinc-50"
          >
            GitHub link
          </Link>
        ) : null}
      </div>
    </article>
  );
}
