import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VendorMark } from "@/components/vendor-mark";
import type { VendorRecord } from "@/lib/mock-data";

type VendorCoverageSectionProps = {
  vendors: VendorRecord[];
};

/**
 * Logo cloud finish to the homepage. Twelve tiles only; the full directory
 * lives at /vendors. Ends the page on momentum, not exhaustion.
 */
export function VendorCoverageSection({ vendors }: VendorCoverageSectionProps) {
  const featured = vendors.slice(0, 12);

  return (
    <section>
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              Coverage · {vendors.length} platforms
            </p>
            <h2 className="max-w-[22ch] text-balance text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Frontier AI, hosting, payments, auth, and mobile.
            </h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/vendors">
              Browse the directory
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

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
      </div>
    </section>
  );
}
