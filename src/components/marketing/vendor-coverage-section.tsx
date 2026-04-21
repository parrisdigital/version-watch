import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VendorGrid } from "@/components/vendor-grid";
import { VendorMark } from "@/components/vendor-mark";
import type { VendorRecord } from "@/lib/mock-data";

type VendorCoverageSectionProps = {
  vendors: VendorRecord[];
};

/**
 * Logo cloud above a full vendor directory link.
 *
 * The cloud highlights the first 12 vendors (alphabetical ordering from the
 * fetch query) and links through to the vendors page — following the
 * logo-clouds rule: distribute evenly, no orphan last row.
 */
export function VendorCoverageSection({ vendors }: VendorCoverageSectionProps) {
  const featured = vendors.slice(0, 12);

  return (
    <section>
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              Coverage
            </p>
            <h2 className="max-w-[22ch] text-balance text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              The platforms Version Watch tracks today.
            </h2>
            <p className="max-w-[58ch] text-pretty text-base text-[var(--muted-foreground)]">
              Frontier AI vendors, deploy platforms, payments, auth, email, search, and mobile
              release surfaces that developer teams actually depend on.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/vendors">
              Browse vendor directory
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* Logo cloud — 12 tiles, 4/6/6 distribution via grid auto-balancing. */}
        <ul
          role="list"
          className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6"
          aria-label="Featured platforms"
        >
          {featured.map((vendor) => (
            <li key={vendor.slug}>
              <Link
                href={`/vendors/${vendor.slug}`}
                className="group flex h-24 flex-col items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--muted)]"
              >
                <VendorMark vendorSlug={vendor.slug} vendorName={vendor.name} size="md" />
                <span className="truncate text-xs text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]">
                  {vendor.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-14">
          <div className="mb-5 flex items-baseline justify-between">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
              Full directory
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">{vendors.length} platforms</p>
          </div>
          <VendorGrid items={vendors} />
        </div>
      </div>
    </section>
  );
}
