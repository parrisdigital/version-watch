"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Latest" },
  { href: "/vendors", label: "Vendors" },
  { href: "/search", label: "Search" },
  { href: "/about", label: "About" },
];

function NavLink({
  href,
  label,
  currentPath,
  onClick,
}: {
  href: string;
  label: string;
  currentPath: string;
  onClick?: () => void;
}) {
  const isActive = href === "/" ? currentPath === "/" : currentPath.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm transition-colors ${
        isActive ? "bg-white/[0.06] text-zinc-50" : "text-zinc-300 hover:text-zinc-50"
      }`}
    >
      {label}
    </Link>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-[1.75rem] border border-white/10 bg-zinc-950/85 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-base font-semibold tracking-tight text-zinc-100">
            Version Watch
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} currentPath={pathname} />
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/vendors"
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/20 hover:text-zinc-50"
            >
              Browse Vendors
            </Link>
            <Link
              href="/search"
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/20 hover:text-zinc-50"
            >
              Search feed
            </Link>
          </div>

          <button
            type="button"
            aria-expanded={isOpen}
            aria-label="Toggle navigation menu"
            onClick={() => setIsOpen((value) => !value)}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-100 lg:hidden"
          >
            Menu
          </button>
        </div>

        {isOpen ? (
          <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 lg:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                currentPath={pathname}
                onClick={() => setIsOpen(false)}
              />
            ))}
            <Link
              href="/vendors"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-100"
            >
              Browse Vendors
            </Link>
            <Link
              href="/search"
              onClick={() => setIsOpen(false)}
              className="mt-2 rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-100"
            >
              Open search explorer
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
