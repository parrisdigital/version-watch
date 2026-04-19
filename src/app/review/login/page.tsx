import { loginAdmin } from "@/app/review/login/actions";

export default async function ReviewLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <section className="w-full max-w-md rounded-[2rem] border border-zinc-800 bg-zinc-950/90 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Protected admin</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-zinc-50">Review Access</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          Enter the admin secret to access the solo review queue and source health pages.
        </p>
        <form action={loginAdmin} className="mt-8">
          <label htmlFor="review-secret" className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Admin secret
          </label>
          <input
            id="review-secret"
            name="secret"
            type="password"
            className="mt-3 w-full rounded-2xl border border-white/12 bg-black/40 px-4 py-3 text-zinc-50"
          />
          {error ? <p className="mt-3 text-sm text-red-300">The supplied admin secret was not accepted.</p> : null}
          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-zinc-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-950"
          >
            Unlock Review Queue
          </button>
        </form>
      </section>
    </main>
  );
}
