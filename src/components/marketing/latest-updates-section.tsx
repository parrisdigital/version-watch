import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/event-card";
import type { SiteEvent } from "@/lib/site-data";

type LatestUpdatesSectionProps = {
  events: SiteEvent[];
};

export function LatestUpdatesSection({ events }: LatestUpdatesSectionProps) {
  const visible = events.slice(0, 12);

  return (
    <section id="latest" className="scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
            Most recent · ranked by signal
          </p>
          <Link
            href="/search"
            className="font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            Open search →
          </Link>
        </div>

        <ul role="list" className="mt-8 grid gap-3">
          {visible.map((event) => (
            <li key={event.id}>
              <EventCard event={event} compact />
            </li>
          ))}
        </ul>

        {events.length > visible.length ? (
          <div className="mt-10 flex justify-center">
            <Button asChild variant="outline">
              <Link href="/search">See all {events.length} tracked updates</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
