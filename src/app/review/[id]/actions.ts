"use server";

import { fetchMutation } from "convex/nextjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE_NAME, isValidAdminCookieValue } from "@/lib/admin/session";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

async function requireAdminSecret() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const isValid = await isValidAdminCookieValue(cookieValue);

  if (!isValid) {
    redirect("/review/login");
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    throw new Error("ADMIN_SECRET is required for review actions.");
  }

  return adminSecret;
}

function getRawCandidateId(formData: FormData) {
  const rawCandidateId = String(formData.get("rawCandidateId") ?? "");
  if (!rawCandidateId) {
    throw new Error("rawCandidateId is required.");
  }

  return rawCandidateId as Id<"rawCandidates">;
}

export async function approveCandidate(formData: FormData) {
  const adminSecret = await requireAdminSecret();
  const rawCandidateId = getRawCandidateId(formData);

  await fetchMutation(api.review.approve, {
    rawCandidateId,
    performedBy: "admin",
    adminSecret,
  });

  revalidatePath("/review");
  redirect("/review");
}

export async function rejectCandidate(formData: FormData) {
  const adminSecret = await requireAdminSecret();
  const rawCandidateId = getRawCandidateId(formData);

  await fetchMutation(api.review.reject, {
    rawCandidateId,
    performedBy: "admin",
    adminSecret,
  });

  revalidatePath("/review");
  redirect("/review");
}

export async function suppressCandidate(formData: FormData) {
  const adminSecret = await requireAdminSecret();
  const rawCandidateId = getRawCandidateId(formData);

  await fetchMutation(api.review.suppress, {
    rawCandidateId,
    performedBy: "admin",
    adminSecret,
  });

  revalidatePath("/review");
  redirect("/review");
}
