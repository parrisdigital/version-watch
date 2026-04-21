import { SiteHeader } from "@/components/marketing/site-header";
import { getSourceHealth } from "@/lib/site-data";

export const dynamic = "force-dynamic";

const statusStyle: Record<string, { label: string; dot: string; text: string }> = {
  healthy: {
    label: "Healthy",
    dot: "bg-[var(--color-green)]",
    text: "text-[var(--color-green)]",
  },
  degraded: {
    label: "Degraded",
    dot: "bg-[var(--color-signal)]",
    text: "text-[var(--color-signal)]",
  },
  failing: {
    label: "Failing",
    dot: "bg-[var(--color-red)]",
    text: "text-[var(--color-red)]",
  },
};

export default async function OpsHealthPage() {
  const health = await getSourceHealth();
  const counts = {
    healthy: health.filter((e) => e.status === "healthy").length,
    degraded: health.filter((e) => e.status === "degraded").length,
    failing: health.filter((e) => e.status === "failing").length,
  };

  return (
    <main className="vw-page">
      <SiteHeader />

      <section className="border-b border-[var(--color-line)] px-4 pb-10 pt-28 sm:px-6 md:pb-14 md:pt-32">
        <div className="vw-shell">
          <p className="vw-kicker">Operations</p>
          <h1 className="vw-display mt-3 text-4xl md:text-5xl">Source health</h1>
          <p className="vw-copy mt-3 max-w-[58ch] text-pretty text-base">
            Every vendor source is polled on a schedule. When a source fails or falls behind, the public feed
            should surface the gap rather than silently drop updates.
          </p>

          <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)]">
            <HealthStat label="Healthy" value={counts.healthy} status="healthy" />
            <HealthStat label="Degraded" value={counts.degraded} status="degraded" />
            <HealthStat label="Failing" value={counts.failing} status="failing" />
          </dl>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="vw-shell">
          <ul role="list" className="grid gap-2">
            {health.map((entry) => {
              const style = statusStyle[entry.status] ?? statusStyle.healthy;
              return (
                <li
                  key={`${entry.vendorName}-${entry.sourceName}`}
                  className="vw-panel-flat flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[var(--color-ink)]">
                      {entry.vendorName}
                    </span>
                    <span className="text-xs text-[var(--color-ink-muted)]">{entry.sourceName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2">
                      <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
                      <span
                        className={`font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider ${style.text}`}
                      >
                        {style.label}
                      </span>
                    </span>
                    <span className="font-[var(--font-mono)] text-[0.6875rem] tabular-nums text-[var(--color-ink-muted)]">
                      last ok · {entry.lastSuccessLabel}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </main>
  );
}

function HealthStat({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: "healthy" | "degraded" | "failing";
}) {
  const style = statusStyle[status];
  return (
    <div className="bg-[var(--color-canvas)] p-5">
      <dt
        className={`flex items-center gap-2 font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider ${style.text}`}
      >
        <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
        {label}
      </dt>
      <dd className={`mt-3 font-[var(--font-display)] text-3xl font-semibold tabular-nums ${style.text}`}>
        {value}
      </dd>
    </div>
  );
}
