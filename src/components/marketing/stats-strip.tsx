type Stat = {
  label: string;
  value: string;
  hint: string;
};

type StatsStripProps = {
  eventCount: number;
  highSignalCount: number;
  vendorCount: number;
};

export function StatsStrip({ eventCount, highSignalCount, vendorCount }: StatsStripProps) {
  const stats: Stat[] = [
    {
      label: "Tracked updates",
      value: eventCount.toLocaleString(),
      hint: "Public, source-linked, scannable",
    },
    {
      label: "Worth your attention",
      value: highSignalCount.toLocaleString(),
      hint: "Tagged critical or high",
    },
    {
      label: "Platforms watched",
      value: vendorCount.toLocaleString(),
      hint: "AI, infra, payments, auth, mobile",
    },
  ];

  return (
    <section aria-label="Platform metrics" className="border-y border-[var(--border)] bg-[var(--background)]">
      <dl className="mx-auto grid max-w-7xl grid-cols-1 divide-[var(--border)] px-4 sm:grid-cols-3 sm:divide-x sm:px-6 lg:px-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-2 px-0 py-6 first:pl-0 last:pr-0 sm:px-6 sm:py-8"
          >
            <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              {stat.label}
            </dt>
            <dd className="text-3xl font-semibold tracking-tight tabular-nums text-[var(--foreground)] sm:text-4xl">
              {stat.value}
            </dd>
            <p className="text-xs text-[var(--muted-foreground)] sm:text-sm">{stat.hint}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}
