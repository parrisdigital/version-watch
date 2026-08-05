import { AgentSurfaceSection } from "@/components/marketing/agent-surface-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { LatestUpdatesSection } from "@/components/marketing/latest-updates-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { StatsStrip } from "@/components/marketing/stats-strip";
import { VendorCoverageSection } from "@/components/marketing/vendor-coverage-section";
import { getFreshnessSummary, getHomepageEvents, getPublicEventStats, getVendors } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [events, stats, vendors, freshnessSummary] = await Promise.all([
    getHomepageEvents(),
    getPublicEventStats(),
    getVendors(),
    getFreshnessSummary(),
  ]);

  return (
    <div className="isolate flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <HeroSection vendorCount={vendors.length} freshnessSummary={freshnessSummary} />

        <StatsStrip
          eventCount={stats.eventCount}
          highSignalCount={stats.highSignalCount}
          vendorCount={vendors.length}
        />

        <LatestUpdatesSection events={events} />

        <AgentSurfaceSection />

        <VendorCoverageSection vendors={vendors} />
      </main>

      <SiteFooter />
    </div>
  );
}
