import { AgentSurfaceSection } from "@/components/marketing/agent-surface-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { LatestUpdatesSection } from "@/components/marketing/latest-updates-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { StatsStrip } from "@/components/marketing/stats-strip";
import { VendorCoverageSection } from "@/components/marketing/vendor-coverage-section";
import { getAllPublicEvents, getFreshnessSummary, getHomepageEvents, getVendors } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [events, allEvents, vendors, freshnessSummary] = await Promise.all([
    getHomepageEvents(),
    getAllPublicEvents(),
    getVendors(),
    getFreshnessSummary(),
  ]);

  const highSignalCount = allEvents.filter(
    (event) => event.importanceBand === "critical" || event.importanceBand === "high",
  ).length;

  const latest = events[0];

  return (
    <div className="isolate flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <HeroSection
          vendorCount={vendors.length}
          lastPublishedAt={latest?.publishedAt}
          freshnessSummary={freshnessSummary}
        />

        <StatsStrip
          eventCount={allEvents.length}
          highSignalCount={highSignalCount}
          vendorCount={vendors.length}
        />

        <LatestUpdatesSection events={events} />

        <AgentSurfaceSection />

        <HowItWorksSection />

        <VendorCoverageSection vendors={vendors} />
      </main>

      <SiteFooter />
    </div>
  );
}
