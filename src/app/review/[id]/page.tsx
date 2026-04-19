import { notFound } from "next/navigation";

import { getReviewCandidateById } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function ReviewCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await getReviewCandidateById(id);

  if (!candidate) {
    notFound();
  }

  return (
    <main className="min-h-dvh bg-zinc-950 px-4 py-12 text-zinc-50 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-sm uppercase tracking-wide text-zinc-500">Candidate detail</p>
        <h1 className="mt-4 max-w-[16ch] text-balance text-4xl font-semibold tracking-tight">{candidate.title}</h1>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950/80 p-6">
            <h2 className="font-mono text-sm uppercase tracking-wide text-zinc-500">Raw candidate</h2>
            <p className="mt-4 text-base text-zinc-300">{candidate.rawBody}</p>
          </section>
          <section className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950/80 p-6">
            <h2 className="font-mono text-sm uppercase tracking-wide text-zinc-500">Review actions</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="rounded-full bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-950">Approve</button>
              <button type="button" className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-zinc-100">Edit & Publish</button>
              <button type="button" className="rounded-full border border-red-400/35 px-4 py-2 text-sm font-semibold text-red-200">Reject</button>
              <button type="button" className="rounded-full border border-amber-300/35 px-4 py-2 text-sm font-semibold text-amber-200">Suppress</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
