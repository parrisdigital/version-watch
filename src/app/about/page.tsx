import { SiteNav } from "@/components/site-nav";

export default function AboutPage() {
  return (
    <main className="min-h-dvh isolate overflow-x-hidden bg-zinc-950 pb-24">
      <SiteNav />
      <section className="px-4 pb-20 pt-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-sm uppercase tracking-wide text-zinc-500">About Version Watch</p>
          <h1 className="mt-4 max-w-[14ch] text-balance text-5xl font-semibold tracking-tight text-zinc-50">
            A public utility for high-signal developer change tracking.
          </h1>
          <div className="mt-8 space-y-6 text-pretty text-lg text-zinc-300">
            <p>
              Version Watch tracks official release notes, changelogs, and documentation changes across the biggest developer platforms, then compresses them into a source-linked public record.
            </p>
            <p>
              Every public event is intended to answer four questions quickly: what changed, why it matters, who should care, and which part of the stack is affected.
            </p>
            <p>
              This is not a newsroom, a social feed, or a monetized growth product. It is a practical developer utility designed to reduce release-note noise without hiding the original source.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
