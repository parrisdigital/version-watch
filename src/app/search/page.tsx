import { SearchExplorer } from "@/components/search-explorer";
import { SiteNav } from "@/components/site-nav";
import { getAllPublicEvents, getVendors } from "@/lib/site-data";

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
  const [events, vendors] = await Promise.all([getAllPublicEvents(), getVendors()]);

  return (
    <main className="min-h-dvh isolate overflow-x-hidden bg-zinc-950 pb-24">
      <SiteNav />
      <SearchExplorer
        events={events}
        vendors={vendors}
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
