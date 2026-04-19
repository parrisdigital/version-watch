import { notFound } from "next/navigation";
import { format } from "date-fns";

import { SiteNav } from "@/components/site-nav";
import { VendorMark } from "@/components/vendor-mark";
import { getEventBySlug } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-dvh isolate overflow-x-hidden bg-zinc-950 pb-24">
      <SiteNav />
      <section className="px-4 pb-20 pt-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
            <span className="flex items-center gap-3">
              <VendorMark vendorSlug={event.vendorSlug} vendorName={event.vendorName} size="sm" />
              <span className="font-mono uppercase tracking-wide text-emerald-300/80">{event.vendorName}</span>
            </span>
            <span>{format(new Date(event.publishedAt), "MMM d, yyyy")}</span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-200">{event.importanceBand}</span>
            <span className="rounded-full border border-white/10 px-3 py-1 tabular-nums text-zinc-400">
              score {event.computedScore ?? 0}
            </span>
          </div>
          <h1 className="mt-6 max-w-[15ch] text-balance text-5xl font-semibold tracking-tight text-zinc-50">
            {event.title}
          </h1>
          <p className="mt-6 max-w-[56ch] text-pretty text-xl text-zinc-300">{event.summary}</p>
          <div className="mt-8 rounded-[1.75rem] border border-zinc-800 bg-zinc-950/80 p-6">
            <p className="font-mono text-sm uppercase tracking-wide text-zinc-500">Official source entry</p>
            <p className="mt-4 max-w-[50ch] text-pretty text-2xl font-semibold tracking-tight text-zinc-100">
              {event.sourceTitle ?? event.title}
            </p>
            <p className="mt-3 text-base text-zinc-400">
              {event.sourceName ?? "Official release surface"} attached directly to the public record so the simplified
              summary can be checked against the original wording.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <section className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950/80 p-6">
              <h2 className="font-mono text-sm uppercase tracking-wide text-zinc-500">What changed</h2>
              <p className="mt-4 text-base text-zinc-200">{event.whatChanged}</p>
            </section>
            <section className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950/80 p-6">
              <h2 className="font-mono text-sm uppercase tracking-wide text-zinc-500">Why it matters</h2>
              <p className="mt-4 text-base text-zinc-200">{event.whyItMatters}</p>
            </section>
            <section className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950/80 p-6">
              <h2 className="font-mono text-sm uppercase tracking-wide text-zinc-500">Who should care</h2>
              <ul role="list" className="mt-4 flex flex-wrap gap-2">
                {event.whoShouldCare.map((role) => (
                  <li key={role} className="rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-300">
                    {role}
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950/80 p-6">
              <h2 className="font-mono text-sm uppercase tracking-wide text-zinc-500">Affected stack</h2>
              <ul role="list" className="mt-4 flex flex-wrap gap-2">
                {event.affectedStack.map((stack) => (
                  <li key={stack} className="rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-300">
                    {stack}
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={event.sourceUrl} className="rounded-full bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-950">
              Official Source
            </a>
            {event.githubUrl ? (
              <a href={event.githubUrl} className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-zinc-100">
                GitHub Link
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
