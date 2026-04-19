import Link from "next/link";

export function HomepageHero({
  eventCount,
  highSignalCount,
  vendorCount,
}: {
  eventCount: number;
  highSignalCount: number;
  vendorCount: number;
}) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 md:pb-24 md:pt-14">
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-emerald-500/12 blur-3xl" />
        <div className="absolute right-0 top-12 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.18fr_0.82fr] lg:items-end">
        <div>
          <p className="font-mono text-sm uppercase tracking-wide text-emerald-300/80">
            Change intelligence for developers
          </p>
          <h1 className="mt-4 max-w-[12ch] text-balance text-5xl font-semibold tracking-tight text-zinc-50 sm:text-7xl">
            Version Watch tracks platform changes with actual operational signal.
          </h1>
          <p className="mt-6 max-w-[60ch] text-pretty text-lg text-zinc-300">
            Version Watch ranks changelog events by impact, keeps the official source attached, and shows who should
            care before a vendor update quietly turns into engineering drag.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-zinc-950/70 p-5">
              <p className="truncate text-sm text-zinc-400">Tracked updates</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums">{eventCount}</p>
              <p className="mt-2 text-base text-zinc-500">Seeded public events across launch coverage.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-zinc-950/70 p-5">
              <p className="truncate text-sm text-zinc-400">High-signal items</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums">{highSignalCount}</p>
              <p className="mt-2 text-base text-zinc-500">Critical and high-priority changes at a glance.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-zinc-950/70 p-5">
              <p className="truncate text-sm text-zinc-400">Tracked vendors</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums">{vendorCount}</p>
              <p className="mt-2 text-base text-zinc-500">AI, infra, auth, payments, email, and mobile.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
          <p className="font-mono text-sm uppercase tracking-wide text-zinc-500">Search the feed</p>
          <form action="/search" className="mt-4">
            <label htmlFor="hero-query" className="sr-only">
              Search updates
            </label>
            <input
              id="hero-query"
              name="query"
              type="text"
              placeholder="Search OpenAI, Stripe, auth, payments, mobile, or CI"
              className="w-full rounded-[1.5rem] ring-1 ring-white/10 bg-white/[0.03] px-5 py-4 text-base text-zinc-100 outline-none placeholder:text-zinc-500 max-sm:text-base"
            />
            <button
              type="submit"
              className="mt-4 w-full rounded-full bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950"
            >
              Open search explorer
            </button>
          </form>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/search?category=breaking"
              className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-base text-zinc-200 transition-colors hover:border-white/20 hover:text-zinc-50"
            >
              Breaking changes
            </Link>
            <Link
              href="/search?stack=payments"
              className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-base text-zinc-200 transition-colors hover:border-white/20 hover:text-zinc-50"
            >
              Payments changes
            </Link>
            <Link
              href="/search?stack=agents"
              className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-base text-zinc-200 transition-colors hover:border-white/20 hover:text-zinc-50"
            >
              Agent tooling
            </Link>
            <Link
              href="/search?stack=mobile"
              className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-base text-zinc-200 transition-colors hover:border-white/20 hover:text-zinc-50"
            >
              Mobile platform changes
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
