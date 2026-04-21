import { loginAdmin } from "@/app/review/login/actions";

export default async function ReviewLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="vw-page flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span
            aria-hidden="true"
            className="inline-flex size-10 items-center justify-center rounded-md border border-[var(--color-line)] bg-[var(--color-surface-raised)]"
          >
            <svg viewBox="0 0 16 16" className="size-5" aria-hidden="true">
              <path
                d="M2 4.5 L7 13 L9 13 L14 4.5 L11.5 4.5 L8 11 L4.5 4.5 Z"
                fill="var(--color-signal)"
              />
              <circle cx="8" cy="2.5" r="1" fill="var(--color-ink)" />
            </svg>
          </span>
          <p className="mt-4 font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-signal)]">
            Protected admin
          </p>
          <h1 className="vw-title mt-2 text-3xl">Review access</h1>
          <p className="vw-copy mt-3 text-sm">
            Enter the admin secret to access the solo review queue and source health pages.
          </p>
        </div>

        <section className="vw-panel p-6">
          <form action={loginAdmin} className="grid gap-4">
            <div className="grid gap-2">
              <label
                htmlFor="review-secret"
                className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)]"
              >
                Admin secret
              </label>
              <input
                id="review-secret"
                name="secret"
                type="password"
                autoComplete="current-password"
                className="vw-input vw-input-lg"
              />
              {error ? (
                <p className="text-xs text-[var(--color-red)]">
                  The supplied admin secret was not accepted.
                </p>
              ) : null}
            </div>
            <button type="submit" className="vw-button vw-button-primary vw-button-lg w-full">
              Unlock review queue
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
