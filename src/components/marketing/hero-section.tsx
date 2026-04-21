import Link from "next/link";
import { format } from "date-fns";
import { ArrowDown, ArrowRight, Search as SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeroShader } from "@/components/shader/hero-shader";

type HeroSectionProps = {
  vendorCount: number;
  lastPublishedAt?: string;
};

/**
 * Full-viewport scrolling hero.
 *
 * Shader occupies the full hero; content is vertically centered with a scroll
 * affordance at the bottom. In dark mode a subtle blue "splash" ring sits
 * around the primary CTA — that's the only place accent chroma enters the
 * hero so it stays restrained.
 */
export function HeroSection({ vendorCount, lastPublishedAt }: HeroSectionProps) {
  const lastUpdatedLabel = lastPublishedAt
    ? format(new Date(lastPublishedAt), "MMM d · HH:mm 'UTC'")
    : "just now";

  return (
    <section className="relative isolate flex min-h-dvh w-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <HeroShader />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-linear-to-b from-transparent to-[var(--background)]" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
        <div className="flex max-w-full flex-col gap-8">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklch,var(--card)_70%,transparent)] px-3 py-1 text-xs text-[var(--muted-foreground)] backdrop-blur-md">
            <span
              className="size-1.5 rounded-full bg-[var(--splash)] shadow-[0_0_12px_var(--splash)]"
              aria-hidden="true"
            />
            <span className="tabular-nums">
              Ingesting {vendorCount} platforms · Last update {lastUpdatedLabel}
            </span>
          </p>

          <h1 className="max-w-[20ch] text-balance text-5xl font-semibold tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-7xl xl:text-8xl">
            Every platform change, ranked. Source attached.
          </h1>

          <p className="max-w-[58ch] text-pretty text-lg text-[var(--muted-foreground)] sm:text-xl">
            Version Watch watches the official changelogs, release notes, and docs pages of the
            developer platforms your stack actually runs on — OpenAI, Stripe, Vercel, Cloudflare,
            GitHub, Apple, and more — then compresses each update into one decision-ready record
            with the original source one click away.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/search">
                <SearchIcon className="size-4" aria-hidden="true" />
                Search the feed
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/vendors">
                Browse {vendorCount} vendors
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="#how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
      </div>

      <a
        href="#latest"
        aria-label="Scroll to feed"
        className="absolute inset-x-0 bottom-8 mx-auto flex w-fit flex-col items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <span>Scroll</span>
        <span className="flex size-8 items-center justify-center rounded-full border border-[var(--border)] bg-[color-mix(in_oklch,var(--card)_60%,transparent)] backdrop-blur-md">
          <ArrowDown className="size-3.5 animate-[vw-bounce_2s_ease-in-out_infinite]" aria-hidden="true" />
        </span>
      </a>
    </section>
  );
}
