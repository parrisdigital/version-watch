import { v } from "convex/values";

export const sourceFreshnessTiers = ["critical", "high", "standard", "long_tail"] as const;

export type SourceFreshnessTier = (typeof sourceFreshnessTiers)[number];

export const sourceFreshnessTierValidator = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("standard"),
  v.literal("long_tail"),
);

export const sourceFreshnessTierMinutes: Record<SourceFreshnessTier, number> = {
  critical: 30,
  high: 60,
  standard: 240,
  long_tail: 720,
};

const criticalVendorSlugs = new Set([
  "openai",
  "anthropic",
  "vercel",
  "github",
  "stripe",
  "cloudflare",
  "supabase",
  "convex",
  "apple-developer",
  "cursor",
  "xai",
  "meta-ai",
  "groq",
]);

const highVendorSlugs = new Set([
  "gemini",
  "augment-code",
  "brave",
  "cline",
  "dia",
  "firebase",
  "firecrawl",
  "exa",
  "clerk",
  "linear",
  "docker",
  "sentry",
  "better-auth",
  "langchain",
  "workos",
  "posthog",
  "resend",
  "vscode",
  "warp",
  "zed",
]);

const machineReadableSourceTypes = new Set(["github_release", "rss", "changelog_page"]);
const slowSourceTypes = new Set(["docs_page", "blog"]);

export function getFreshnessTier(vendorSlug: string, sourceType: string): SourceFreshnessTier {
  if (criticalVendorSlugs.has(vendorSlug)) {
    return machineReadableSourceTypes.has(sourceType) ? "critical" : "high";
  }

  if (highVendorSlugs.has(vendorSlug)) {
    return machineReadableSourceTypes.has(sourceType) ? "high" : "standard";
  }

  return slowSourceTypes.has(sourceType) ? "long_tail" : "standard";
}

export function getEffectiveFreshnessTier(source: { freshnessTier?: string }): SourceFreshnessTier {
  return source.freshnessTier && sourceFreshnessTiers.includes(source.freshnessTier as SourceFreshnessTier)
    ? (source.freshnessTier as SourceFreshnessTier)
    : "standard";
}

export function getPollIntervalMinutesForFreshnessTier(tier: SourceFreshnessTier) {
  return sourceFreshnessTierMinutes[tier];
}

export function getNextDueAt(fromAt: number, tier: SourceFreshnessTier) {
  return fromAt + getPollIntervalMinutesForFreshnessTier(tier) * 60 * 1000;
}

export function compareFreshnessTier(a: SourceFreshnessTier, b: SourceFreshnessTier) {
  return sourceFreshnessTiers.indexOf(a) - sourceFreshnessTiers.indexOf(b);
}

export function getHighestPriorityFreshnessTier(tiers: SourceFreshnessTier[]) {
  return tiers.length
    ? tiers.slice().sort(compareFreshnessTier)[0]!
    : "standard";
}
