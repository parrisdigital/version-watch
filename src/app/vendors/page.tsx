import { SiteNav } from "@/components/site-nav";
import { VendorGrid } from "@/components/vendor-grid";
import { getVendors } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const vendors = await getVendors();

  return (
    <main className="min-h-dvh isolate overflow-x-hidden bg-zinc-950 pb-24">
      <SiteNav />
      <section className="px-4 pb-20 pt-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-sm uppercase tracking-wide text-zinc-500">Vendor Directory</p>
          <h1 className="mt-4 max-w-[14ch] text-balance text-5xl font-semibold tracking-tight text-zinc-50">
            Browse the platforms Version Watch tracks from one source-first index.
          </h1>
          <p className="mt-6 max-w-[56ch] text-pretty text-lg text-zinc-400">
            Each vendor page keeps the official sources attached and collects the most important recent changes in one place.
          </p>
          <div className="mt-12">
            <VendorGrid items={vendors} />
          </div>
        </div>
      </section>
    </main>
  );
}
