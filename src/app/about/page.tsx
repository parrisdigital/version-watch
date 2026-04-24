import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  ExternalLink,
  Layers3,
  Radar,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const VALUE_POINTS = [
  {
    icon: Radar,
    title: "One place to scan",
    body: "Platform updates are scattered across vendor sites, docs, blogs, RSS feeds, and GitHub releases. Version Watch brings the important ones into one developer-focused view.",
  },
  {
    icon: ScanLine,
    title: "Built for quick decisions",
    body: "Each update is shaped for scanning: what changed, why it matters, who should care, affected stack, signal level, and the official source.",
  },
  {
    icon: Layers3,
    title: "Signal stays visible",
    body: "Freshness drives the feed order, while critical, high, medium, and low labels help developers decide what deserves attention now.",
  },
];

const TRUST_POINTS = [
  "Every item links back to the official source.",
  "The feed is designed around recent developer-impacting changes.",
  "Signal labels help separate urgent work from general awareness.",
  "Vendor pages keep each platform's latest updates easy to review.",
];

const USE_CASES = [
  "Morning platform scan",
  "Release-risk review",
  "Vendor monitoring",
  "Engineering standup context",
  "DevRel and support awareness",
  "Founder and product planning",
];

const PRODUCT_SHAPE = [
  {
    label: "It is",
    items: [
      "A high-level changelog feed for developers.",
      "A fast way to spot fresh, source-linked platform changes.",
      "A directory of official vendor update surfaces.",
      "A lightweight signal layer on top of the original source.",
    ],
  },
  {
    label: "It is not",
    items: [
      "A replacement for reading the source when details matter.",
      "A social feed sorted by popularity.",
      "A newsroom with commentary or opinion.",
      "A place for hidden summaries without attribution.",
    ],
  },
];

export default function AboutPage() {
  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:pb-20">
        <div className="vw-shell grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">About Version Watch</Badge>
              <Badge variant="secondary">Source attached</Badge>
            </div>
            <div className="flex flex-col gap-5">
              <h1 className="vw-display max-w-[14ch] text-balance text-4xl sm:text-5xl md:text-6xl">
                A faster way to keep up with platform changes.
              </h1>
              <p className="vw-copy max-w-[66ch] text-lg md:text-xl">
                Version Watch helps developers stay aware of important changelogs and release notes
                across the platforms their stack depends on. It turns scattered vendor updates into
                one clear, recent, source-linked feed.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/search">
                  Explore the feed
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/vendors">Browse vendors</Link>
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant="muted">Developer scan</Badge>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  fresh first
                </span>
              </div>
              <CardTitle className="text-2xl">What matters changed. See it quickly.</CardTitle>
              <CardDescription>
                A compact view that keeps recency, signal, and source attribution in the same place.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-6">
              <SampleRow
                icon={Clock3}
                label="Freshness"
                title="Newest updates stay at the top"
                detail="The feed is ordered by publish date so the latest news is the first thing a developer sees."
              />
              <Separator />
              <SampleRow
                icon={BadgeCheck}
                label="Signal"
                title="Critical, high, medium, low"
                detail="The label stays visible so urgent changes do not blend into routine release notes."
              />
              <Separator />
              <SampleRow
                icon={ExternalLink}
                label="Trust"
                title="Official source one click away"
                detail="Every record points back to the vendor page, changelog, release note, or GitHub release."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-border px-4 py-16 sm:px-6 md:py-20">
        <div className="vw-shell">
          <div className="flex max-w-3xl flex-col gap-4">
            <p className="vw-kicker">Why it exists</p>
            <h2 className="vw-title text-balance text-3xl md:text-4xl">
              Developers should not need to check dozens of vendor pages to stay current.
            </h2>
            <p className="vw-copy text-base md:text-lg">
              The point is simple: make platform awareness easier. Version Watch is for developers,
              founders, engineering teams, and product builders who want a quick read on what changed
              across the tools they already use.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {VALUE_POINTS.map((point) => (
              <Card key={point.title}>
                <CardHeader>
                  <point.icon className="size-5 text-foreground" aria-hidden="true" />
                  <CardTitle>{point.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{point.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-4 py-16 sm:px-6 md:py-20">
        <div className="vw-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div className="flex flex-col gap-4">
            <p className="vw-kicker">How to use it</p>
            <h2 className="vw-title text-balance text-3xl md:text-4xl">
              Scan first. Open the source when the update matters.
            </h2>
            <p className="vw-copy text-base">
              Version Watch is meant to be a starting point, not the final word. It helps you find the
              updates worth reading, then sends you straight to the original source for the full detail.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {TRUST_POINTS.map((item) => (
              <Card key={item}>
                <CardContent className="flex gap-3 pt-6">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden="true" />
                  <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-4 py-16 sm:px-6 md:py-20">
        <div className="vw-shell">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex max-w-2xl flex-col gap-4">
              <p className="vw-kicker">Where it helps</p>
              <h2 className="vw-title text-balance text-3xl md:text-4xl">
                A practical feed for day-to-day developer awareness.
              </h2>
            </div>
            <p className="vw-copy max-w-[44ch] text-sm md:text-base">
              Use it when you want context fast, without turning changelog review into a separate job.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {USE_CASES.map((item) => (
              <Badge key={item} variant="outline" className="px-3 py-1 text-sm">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-4 py-16 sm:px-6 md:py-20">
        <div className="vw-shell">
          <div className="grid gap-4 md:grid-cols-2">
            {PRODUCT_SHAPE.map((group) => (
              <Card key={group.label}>
                <CardHeader>
                  <CardTitle>{group.label}</CardTitle>
                  <CardDescription>
                    {group.label === "It is"
                      ? "The product promise in plain language."
                      : "The boundaries that keep the feed focused."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-3">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/">
                See latest updates
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/vendors">View vendor directory</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function SampleRow({
  icon: Icon,
  label,
  title,
  detail,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[2.25rem_1fr]">
      <span className="flex size-9 items-center justify-center rounded-md border border-border bg-muted">
        <Icon className="size-4 text-foreground" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
