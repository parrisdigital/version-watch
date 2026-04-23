import Link from "next/link";

import { Separator } from "@/components/ui/separator";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/vendors", label: "Vendors" },
  { href: "/search", label: "Search" },
  { href: "/feedback", label: "Feedback" },
  { href: "/ops/health", label: "Source health" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
          Version Watch · Change intelligence for developers
        </p>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" aria-label="Footer">
          {FOOTER_LINKS.map((link, index) => (
            <span key={link.href} className="flex items-center gap-x-6">
              <Link
                href={link.href}
                className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                {link.label}
              </Link>
              {index < FOOTER_LINKS.length - 1 ? (
                <Separator orientation="vertical" className="h-4" aria-hidden="true" />
              ) : null}
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}
