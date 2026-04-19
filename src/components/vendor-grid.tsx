import Link from "next/link";

import { VendorMark } from "@/components/vendor-mark";
import type { VendorRecord } from "@/lib/mock-data";

export function VendorGrid({ items }: { items: VendorRecord[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((vendor) => (
        <Link
          key={vendor.slug}
          href={`/vendors/${vendor.slug}`}
          className="group overflow-hidden rounded-[1.75rem] border border-zinc-800 bg-zinc-950/80 p-5 transition-transform duration-700 hover:-translate-y-1"
        >
          <div className="flex items-center gap-4">
            <VendorMark vendorSlug={vendor.slug} vendorName={vendor.name} />
            <h3 className="text-xl font-semibold tracking-[-0.04em] text-zinc-50">{vendor.name}</h3>
          </div>
          <p className="mt-4 text-base text-zinc-400">{vendor.description}</p>
          <div className="mt-6 text-sm font-medium text-amber-200 transition-colors group-hover:text-amber-100">
            Open vendor page
          </div>
        </Link>
      ))}
    </div>
  );
}
