import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "version-watch-admin";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function digest(value: string) {
  const data = new TextEncoder().encode(value);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

export async function getExpectedAdminCookieValue() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;
  return digest(secret);
}

export async function createAdminSession() {
  const expected = await getExpectedAdminCookieValue();
  if (!expected) return;

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function isValidAdminCookieValue(value?: string) {
  if (!value) return false;
  const expected = await getExpectedAdminCookieValue();
  return expected !== null && value === expected;
}
