import { SearchExplorer } from "@/components/search-explorer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getAllPublicEvents, getFreshnessSummary, getVendors } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string;
    vendor?: string;
    category?: string;
    stack?: string;
    importance?: "critical" | "high" | "medium" | "low";
  }>;
}) {
  const params = await searchParams;
  const [events, vendors, freshnessSummary] = await Promise.all([
    getAllPublicEvents(),
    getVendors(),
    getFreshnessSummary(),
  ]);

  return (
    <main className="vw-page pb-24 pt-28 md:pt-32">
      <SiteHeader />
      <SearchExplorer
        events={events}
        vendors={vendors}
        freshnessSummary={freshnessSummary}
        initialFilters={{
          query: params.query ?? "",
          vendor: params.vendor ?? "",
          category: params.category ?? "",
          stack: params.stack ?? "",
          importance: params.importance ?? "",
        }}
      />
    </main>
  );
}
