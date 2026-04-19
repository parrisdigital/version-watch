import Link from "next/link";

import { getReviewQueue } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const queue = await getReviewQueue();

  return (
    <main className="min-h-dvh bg-zinc-950 px-4 py-12 text-zinc-50 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="font-mono text-sm uppercase tracking-wide text-zinc-500">Admin</p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight">Review Queue</h1>
          </div>
          <Link href="/ops/health" className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-zinc-100">
            Source Health
          </Link>
        </div>
        <div className="mt-10 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950/80">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 text-zinc-500">
              <tr>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Published</th>
                <th className="px-6 py-4">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((candidate) => (
                <tr key={candidate.id} className="border-b border-zinc-900 last:border-b-0">
                  <td className="px-6 py-4 text-zinc-200">{candidate.vendorName}</td>
                  <td className="px-6 py-4">
                    <Link href={`/review/${candidate.id}`} className="text-zinc-50 transition-colors hover:text-amber-200">
                      {candidate.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 uppercase tracking-[0.14em] text-zinc-400">{candidate.sourceType}</td>
                  <td className="px-6 py-4 text-zinc-400">{candidate.publishedDateLabel}</td>
                  <td className="px-6 py-4 uppercase tracking-[0.14em] text-zinc-400">{candidate.parseConfidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
