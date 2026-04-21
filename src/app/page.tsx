import { HeroSection } from "@/components/marketing/hero-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { LatestUpdatesSection } from "@/components/marketing/latest-updates-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { StatsStrip } from "@/components/marketing/stats-strip";
import { VendorCoverageSection } from "@/components/marketing/vendor-coverage-section";
import { getHomepageEvents, getVendors } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [events, vendors] = await Promise.all([getHomepageEvents(), getVendors()]);

  const highSignalCount = events.filter(
    (event) => event.importanceBand === "critical" || event.importanceBand === "high",
  ).length;

  const latest = events[0];

  return (
    <div className="isolate flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <HeroSection vendorCount={vendors.length} lastPublishedAt={latest?.publishedAt} />

        <StatsStrip
          eventCount={events.length}
          highSignalCount={highSignalCount}
          vendorCount={vendors.length}
        />

        <LatestUpdatesSection events={events} />

        <HowItWorksSection />

        <VendorCoverageSection vendors={vendors} />
      </main>

      <SiteFooter />
    </div>
  );
}
