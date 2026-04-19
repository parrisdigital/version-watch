"use server";

import { redirect } from "next/navigation";

import { createAdminSession } from "@/lib/admin/session";

export async function loginAdmin(formData: FormData) {
  const suppliedSecret = String(formData.get("secret") ?? "");
  const adminSecret = process.env.ADMIN_SECRET ?? "";

  if (!adminSecret || suppliedSecret !== adminSecret) {
    redirect("/review/login?error=1");
  }

  await createAdminSession();
  redirect("/review");
}
