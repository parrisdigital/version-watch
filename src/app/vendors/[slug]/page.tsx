import { notFound } from "next/navigation";

import { EventCard } from "@/components/event-card";
import { SiteNav } from "@/components/site-nav";
import { VendorMark } from "@/components/vendor-mark";
import { getEventsForVendor, getVendorBySlug } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function VendorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);

  if (!vendor) {
    notFound();
  }

  const vendorEvents = await getEventsForVendor(slug);

  return (
    <main className="min-h-dvh isolate overflow-x-hidden bg-zinc-950 pb-24">
      <SiteNav />
      <section className="px-4 pb-16 pt-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="font-mono text-sm uppercase tracking-wide text-zinc-500">Vendor profile</p>
              <div className="mt-4 flex items-center gap-4">
                <VendorMark vendorSlug={vendor.slug} vendorName={vendor.name} size="lg" />
                <h1 className="text-balance text-5xl font-semibold tracking-tight text-zinc-50">{vendor.name}</h1>
              </div>
              <p className="mt-6 max-w-[52ch] text-pretty text-lg text-zinc-400">{vendor.description}</p>
              <div className="mt-8 rounded-[1.75rem] border border-zinc-800 bg-zinc-950/80 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="truncate text-sm text-zinc-400">Tracked events</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums">
                      {vendorEvents.length}
                    </p>
                  </div>
                  <div>
                    <p className="truncate text-sm text-zinc-400">Official sources</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums">
                      {vendor.sources.length}
                    </p>
                  </div>
                </div>
                <ul role="list" className="mt-6 grid gap-3 text-base text-zinc-400">
                  {vendor.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} className="transition-colors hover:text-zinc-100">
                        {source.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="grid gap-6">
              {vendorEvents.map((event) => (
                <EventCard key={event.id} event={event} compact />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
