"use server";

import { redirect } from "next/navigation";

import { createAdminSession } from "@/lib/admin/session";

export async function loginAdmin(formData: FormData) {
  const suppliedSecret = String(formData.get("secret") ?? "");
  const fromRaw = String(formData.get("from") ?? "");
  const adminSecret = process.env.ADMIN_SECRET ?? "";

  if (!adminSecret || suppliedSecret !== adminSecret) {
    redirect("/admin/login?error=1");
  }

  await createAdminSession();

  // Only follow internal admin paths to prevent open-redirect.
  const safeFrom = fromRaw.startsWith("/admin/") || fromRaw === "/admin" ? fromRaw : "/admin";
  redirect(safeFrom);
}
