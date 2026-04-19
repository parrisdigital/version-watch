import { getSourceHealth } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function OpsHealthPage() {
  const health = await getSourceHealth();

  return (
    <main className="min-h-dvh bg-zinc-950 px-4 py-12 text-zinc-50 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-sm uppercase tracking-wide text-zinc-500">Operations</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight">Source Health</h1>
        <div className="mt-10 grid gap-4">
          {health.map((entry) => (
            <article key={`${entry.vendorName}-${entry.sourceName}`} className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-50">{entry.vendorName}</h2>
                  <p className="mt-2 text-base text-zinc-400">{entry.sourceName}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-mono text-sm uppercase tracking-wide ${
                      entry.status === "healthy"
                        ? "text-emerald-300"
                        : entry.status === "degraded"
                          ? "text-amber-300"
                          : "text-rose-300"
                    }`}
                  >
                    {entry.status}
                  </p>
                  <p className="mt-2 text-base text-zinc-500">{entry.lastSuccessLabel}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
