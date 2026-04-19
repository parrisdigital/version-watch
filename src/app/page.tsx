import Link from "next/link";

import { EventCard } from "@/components/event-card";
import { HomepageExplainer } from "@/components/homepage-explainer";
import { HomepageHero } from "@/components/homepage-hero";
import { SiteNav } from "@/components/site-nav";
import { VendorGrid } from "@/components/vendor-grid";
import { getHomepageEvents, getVendors } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [homepageEvents, vendorItems] = await Promise.all([getHomepageEvents(), getVendors()]);
  const highSignalCount = homepageEvents.filter((event) => {
    return event.importanceBand === "critical" || event.importanceBand === "high";
  }).length;

  return (
    <main className="min-h-dvh isolate overflow-x-hidden bg-zinc-950 pb-24">
      <SiteNav />
      <HomepageHero
        eventCount={homepageEvents.length}
        highSignalCount={highSignalCount}
        vendorCount={vendorItems.length}
      />

      <section className="px-4 py-10 sm:px-6 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-sm uppercase tracking-wide text-zinc-500">Most important now</p>
              <h2 className="mt-4 max-w-[14ch] text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
                The changes most likely to create real follow-up work.
              </h2>
            </div>
            <Link
              href="/search"
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/20 hover:text-zinc-50"
            >
              Open search explorer
            </Link>
          </div>

          <div className="mt-8 grid gap-6">
            {homepageEvents.slice(0, 6).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>

      <HomepageExplainer />

      <section className="px-4 py-14 sm:px-6 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-sm uppercase tracking-wide text-zinc-500">Coverage</p>
              <h2 className="mt-4 max-w-[14ch] text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
                Follow the biggest developer platforms from one source-first index.
              </h2>
            </div>
            <p className="max-w-[48ch] text-pretty text-lg text-zinc-400">
              Version Watch starts with frontier AI vendors, deploy platforms, payments, auth, email, search, and
              mobile release surfaces that developers actually depend on.
            </p>
          </div>

          <div className="mt-10">
            <VendorGrid items={vendorItems} />
          </div>
        </div>
      </section>
    </main>
  );
}
