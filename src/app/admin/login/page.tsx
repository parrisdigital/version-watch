import { loginAdmin } from "@/app/admin/login/actions";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { error, from } = await searchParams;

  return (
    <main className="vw-page flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <p className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]">
            Admin
          </p>
          <h1 className="vw-title mt-2 text-2xl">Sign in</h1>
        </div>

        <section className="vw-panel p-6">
          <form action={loginAdmin} className="grid gap-4">
            {from ? <input type="hidden" name="from" value={from} /> : null}
            <div className="grid gap-2">
              <label
                htmlFor="admin-secret"
                className="font-[var(--font-mono)] text-[0.6875rem] uppercase tracking-wider text-[var(--muted-foreground)]"
              >
                Admin secret
              </label>
              <input
                id="admin-secret"
                name="secret"
                type="password"
                autoComplete="current-password"
                required
                className="vw-input vw-input-lg"
              />
              {error ? (
                <p className="text-xs text-[var(--color-red)]">Secret was not accepted.</p>
              ) : null}
            </div>
            <button type="submit" className="vw-button vw-button-primary vw-button-lg w-full">
              Sign in
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
