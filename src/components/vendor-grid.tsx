import Link from "next/link";

import { VendorMark } from "@/components/vendor-mark";
import type { VendorRecord } from "@/lib/mock-data";

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8 H12.5 M8.5 4 L12.5 8 L8.5 12" />
    </svg>
  );
}

export function VendorGrid({ items }: { items: VendorRecord[] }) {
  return (
    <ul role="list" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((vendor) => (
        <li key={vendor.slug}>
          <Link
            href={`/vendors/${vendor.slug}`}
            className="group vw-panel-flat flex h-full flex-col p-5 transition-colors hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-raised)]"
          >
            <div className="flex items-center gap-3">
              <VendorMark vendorSlug={vendor.slug} vendorName={vendor.name} size="md" />
              <div className="flex min-w-0 flex-col leading-tight">
                <h3 className="font-[var(--font-display)] text-base font-semibold tracking-tight text-[var(--color-ink)]">
                  {vendor.name}
                </h3>
                <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
                  {vendor.sources.length} source{vendor.sources.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <p className="vw-copy mt-4 flex-1 text-sm">{vendor.description}</p>

            <div className="mt-4 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-signal)]">
              Open vendor <ArrowIcon />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
