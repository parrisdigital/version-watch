import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { VendorDirectory } from "@/components/vendor-directory";
import { getVendors } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const vendors = await getVendors();
  const totalSources = vendors.reduce((sum, vendor) => sum + vendor.sources.length, 0);

  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="px-4 pb-8 pt-28 sm:px-6 md:pt-32">
        <div className="vw-shell">
          <p className="vw-kicker">Vendor directory</p>
          <h1 className="vw-display mt-4 text-balance text-4xl sm:text-5xl md:text-6xl">
            The platforms Version Watch watches.
          </h1>
          <p className="vw-copy mt-6 max-w-[68ch] text-lg">
            {vendors.length} vendors, {totalSources} official release surfaces. Filter by name, browse by
            category, or open any vendor for the full feed of recent changes.
          </p>
        </div>
      </section>

      <section className="px-4 pb-20 pt-4 sm:px-6 md:pt-8">
        <div className="vw-shell">
          <VendorDirectory vendors={vendors} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
