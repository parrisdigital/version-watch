import Link from "next/link";
import { ArrowDown, Search as SearchIcon } from "lucide-react";

import { FreshnessSummaryBadge } from "@/components/freshness-summary";
import { Button } from "@/components/ui/button";
import { HeroShader } from "@/components/shader/hero-shader";
import type { FreshnessSummary } from "@/lib/site-data";

type HeroSectionProps = {
  vendorCount: number;
  freshnessSummary?: FreshnessSummary;
};

/**
 * Cinematic hero. Single primary CTA, freshness chip promoted to live element.
 * Subhead names three concrete vendors instead of describing the product.
 */
export function HeroSection({ vendorCount, freshnessSummary }: HeroSectionProps) {
  return (
    <section className="relative isolate flex min-h-dvh w-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <HeroShader />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-linear-to-b from-transparent to-[var(--background)]" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
        <div className="flex max-w-full flex-col gap-9">
          {freshnessSummary ? (
            <FreshnessSummaryBadge
              summary={freshnessSummary}
              prominent
              className="bg-[var(--hero-chip-background)] text-[var(--hero-chip-foreground)]"
            />
          ) : null}

          <h1 className="max-w-[20ch] text-balance text-5xl font-semibold tracking-tight text-[var(--hero-foreground)] sm:text-6xl lg:text-7xl xl:text-8xl">
            Every platform change, ranked. Source attached.
          </h1>

          <p className="max-w-[58ch] text-pretty text-lg font-medium leading-relaxed text-[var(--hero-copy)] sm:text-xl">
            OpenAI ships an API change. Stripe writes a blog post. Apple drops a PDF. Version Watch reads them all, ranks what matters, and keeps the source one click away.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg" className="vw-hero-primary-cta">
              <Link href="/search">
                <SearchIcon className="size-4" aria-hidden="true" />
                Open the feed
              </Link>
            </Button>
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--hero-muted)]">
              {vendorCount} platforms tracked
            </p>
          </div>
        </div>
      </div>

      <a
        href="#latest"
        aria-label="Scroll to feed"
        className="absolute inset-x-0 bottom-8 mx-auto flex w-fit flex-col items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--hero-muted)] hover:text-[var(--hero-foreground)]"
      >
        <span>Scroll</span>
        <span className="flex size-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--hero-chip-background)] backdrop-blur-md">
          <ArrowDown className="size-3.5 animate-[vw-bounce_2s_ease-in-out_infinite]" aria-hidden="true" />
        </span>
      </a>
    </section>
  );
}
