"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Menu, Search as SearchIcon, X } from "lucide-react";

import { GithubMark } from "@/components/icons/github-mark";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const REPO_URL = "https://github.com/parrisdigital/version-watch";

const NAV_LINKS = [
  { href: "/", label: "Latest" },
  { href: "/vendors", label: "Vendors" },
  { href: "/agent-access", label: "API" },
  { href: "/search", label: "Search" },
  { href: "/about", label: "About" },
] as const;

function subscribeScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}

function getScrolled() {
  return window.scrollY > 8;
}

function getServerScrolled() {
  return false;
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function BrandMark() {
  return (
    <Link href="/" aria-label="Homepage" className="flex items-center gap-2.5 pl-1">
      <span aria-hidden="true" className="relative size-7 shrink-0 overflow-hidden rounded-full">
        <Image
          src="/brand/version-watch-icon.png"
          alt=""
          fill
          sizes="28px"
          className="object-contain"
          priority
        />
      </span>
      <span className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
        Version Watch
      </span>
    </Link>
  );
}

function PillNavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "relative rounded-full px-3 py-1.5 text-[0.8125rem]",
        active
          ? "bg-[var(--secondary)] text-[var(--foreground)]"
          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
      )}
    >
      {label}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const scrolled = useSyncExternalStore(subscribeScroll, getScrolled, getServerScrolled);

  return (
    <div className="fixed inset-x-0 top-3 z-40 isolate px-3 sm:top-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div
          data-scrolled={scrolled}
          className={cn(
            "flex items-center gap-3 rounded-full border border-[var(--border)] px-2 py-1.5 backdrop-blur-xl",
            "bg-[color-mix(in_oklch,var(--card)_82%,transparent)]",
            "shadow-[0_1px_0_color-mix(in_oklch,white_8%,transparent)_inset,0_24px_50px_-28px_color-mix(in_oklch,black_60%,transparent)]",
            "transition-[padding,border-color,box-shadow] duration-200",
            scrolled && "border-[var(--border-strong)] py-1",
          )}
        >
          <div className="flex flex-1 items-center gap-3">
            <BrandMark />
            <span
              aria-hidden="true"
              className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--secondary)] px-2 py-0.5 lg:inline-flex"
            >
              <span className="vw-live-dot" />
              <span className="font-mono text-[0.625rem] uppercase tracking-wider text-[var(--foreground)]">
                Live
              </span>
            </span>
          </div>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {NAV_LINKS.map((item) => (
              <PillNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={isActive(pathname, item.href)}
              />
            ))}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-1">
            <Button asChild variant="outline" size="sm" className="hidden rounded-full lg:inline-flex">
              <Link href="/search">
                <SearchIcon className="size-3.5" aria-hidden="true" />
                Search feed
              </Link>
            </Button>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Version Watch on GitHub"
              className="hidden size-9 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] lg:inline-flex"
            >
              <GithubMark className="size-4" />
            </a>
            <ThemeToggle className="size-9 rounded-full" />
            <Button
              variant="ghost"
              size="icon"
              aria-expanded={isOpen}
              aria-label="Toggle navigation menu"
              onClick={() => setIsOpen((v) => !v)}
              className="rounded-full lg:hidden"
            >
              {isOpen ? (
                <X className="size-4" aria-hidden="true" />
              ) : (
                <Menu className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {isOpen ? (
          <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-md lg:hidden">
            <nav className="grid gap-1" aria-label="Mobile">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    isActive(pathname, item.href)
                      ? "bg-[var(--secondary)] text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
      </div>
    </div>
  );
}
