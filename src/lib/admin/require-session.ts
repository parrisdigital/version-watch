import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE_NAME, isValidAdminCookieValue } from "@/lib/admin/session";

/**
 * Page-level guard for /admin/* routes. Defense-in-depth alongside the
 * Vercel Routing Middleware in src/proxy.ts so admin pages refuse to render
 * data even if the edge gate is ever misconfigured or skipped.
 *
 * Pass the current path as `fromPath` so login can bounce the user back
 * after sign-in.
 */
export async function requireAdminSession(
  fromPath: string,
  options: { loginPath?: "/admin/login" | "/review/login" } = {},
): Promise<void> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const isValid = await isValidAdminCookieValue(cookieValue);

  if (!isValid) {
    const params = new URLSearchParams({ from: fromPath });
    redirect(`${options.loginPath ?? "/admin/login"}?${params.toString()}`);
  }
}
