import type { ImportanceBand, SourceType } from "@/lib/mock-data";

export const SCORE_VERSION = "v2";

export const RELEASE_CLASSES = [
  "breaking",
  "security",
  "model_launch",
  "pricing",
  "policy",
  "api_change",
  "sdk_release",
  "cli_patch",
  "beta_release",
  "docs_update",
  "routine_release",
] as const;

export const IMPACT_CONFIDENCES = ["high", "medium", "low"] as const;

export type ReleaseClass = (typeof RELEASE_CLASSES)[number];
export type ImpactConfidence = (typeof IMPACT_CONFIDENCES)[number];

export type SignalInput = {
  id?: string;
  slug?: string;
  vendorSlug: string;
  vendorName?: string;
  title: string;
  summary?: string;
  whatChanged?: string;
  whyItMatters?: string;
  categories: string[];
  affectedStack: string[];
  publishedAt: string;
  sourceUrl: string;
  sourceType: SourceType;
  sourceName?: string;
  sourceTitle?: string;
  githubUrl?: string;
  whoShouldCare?: string[];
};

export type SignalMetadata = {
  releaseClass: ReleaseClass;
  impactConfidence: ImpactConfidence;
  signalReasons: string[];
  topicTags: string[];
  scoreVersion: typeof SCORE_VERSION;
  signalScore: number;
  importanceBand: ImportanceBand;
  displayTitle: string;
  whyItMatters: string;
};

const releaseClassBaseScores: Record<ReleaseClass, number> = {
  security: 86,
  breaking: 82,
  pricing: 72,
  policy: 68,
  model_launch: 66,
  api_change: 52,
  sdk_release: 42,
  cli_patch: 30,
  beta_release: 28,
  routine_release: 24,
  docs_update: 18,
};

const sourceTypeWeights: Record<SourceType, number> = {
  github_release: 4,
  changelog_page: 4,
  docs_page: 2,
  blog: 2,
  rss: 2,
};

const lowImpactClasses = new Set<ReleaseClass>([
  "cli_patch",
  "beta_release",
  "routine_release",
  "docs_update",
]);

function cleanText(value: string | undefined) {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function normalize(value: string | undefined) {
  return cleanText(value).toLowerCase();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasCategory(input: SignalInput, category: string) {
  return input.categories.includes(category);
}

function combinedText(input: SignalInput) {
  return normalize(
    [
      input.title,
      input.summary,
      input.whatChanged,
      input.whyItMatters,
      input.sourceName,
      input.sourceTitle,
      input.categories.join(" "),
      input.affectedStack.join(" "),
    ].join(" "),
  );
}

function hasSemverPatch(value: string) {
  return /\bv?\d+\.\d+\.\d+(?:[-+][a-z0-9._-]+)?\b/i.test(value);
}

function isCliPatch(input: SignalInput, text = combinedText(input)) {
  return (
    hasSemverPatch(text) &&
    (/\bcli\b|\bcommand line\b|\bcodex cli\b/i.test(text) ||
      /cli|command line/i.test(input.sourceName ?? "") ||
      /^codex cli\s+\d+\.\d+\.\d+/i.test(input.title))
  );
}

function isBetaRelease(text: string) {
  return /\b(beta|alpha|rc|preview|canary|nightly)\b/i.test(text) || /\b\d+\.\d+\.\d+-(?:beta|alpha|rc)/i.test(text);
}

function hasBreakingEvidence(input: SignalInput, text = combinedText(input)) {
  return hasCategory(input, "breaking") || /breaking|deprecat|sunset|retir|remove|migration|default|behavior change/i.test(text);
}

function hasApiContractEvidence(text: string) {
  return /\b(api|endpoint|parameter|request|response|schema|contract|tool call|webhook|v\d+\/)\b/i.test(text);
}

function hasModelLaunchEvidence(text: string) {
  return (
    /\b(released|launch|new|available|introduced|frontier|state-of-the-art)\b/i.test(text) &&
    /\b(gpt|claude|gemini|model|reasoning|sora|image generation|audio snapshot)\b/i.test(text)
  );
}

function hasPricingEvidence(input: SignalInput, text: string) {
  if (hasCategory(input, "pricing")) return true;

  return (
    /\b(pricing|price|priced|metered|usage-based pricing|cost|credits?|quota|invoice|plan limit|paid tier)\b/i.test(text) ||
    (/\bbilling\b/i.test(text) && /\b(price|pricing|invoice|cost|credits?|usage-based|subscription plan)\b/i.test(text))
  );
}

export function classifyReleaseClass(input: SignalInput): ReleaseClass {
  const text = combinedText(input);

  if (hasCategory(input, "security") || /security|vulnerability|cve|token leak|credential/i.test(text)) {
    return "security";
  }

  if (hasBreakingEvidence(input, text)) {
    return "breaking";
  }

  if (hasCategory(input, "policy") || /policy|compliance|review requirement|terms|governance/i.test(text)) {
    return "policy";
  }

  if (isCliPatch(input, text)) {
    return "cli_patch";
  }

  if (isBetaRelease(text)) {
    return "beta_release";
  }

  if (hasModelLaunchEvidence(text)) {
    return "model_launch";
  }

  if (hasPricingEvidence(input, text)) {
    return "pricing";
  }

  if (hasCategory(input, "sdk") || /\b(sdk|library|client|package)\b/i.test(text)) {
    return "sdk_release";
  }

  if (hasCategory(input, "api") && hasApiContractEvidence(text)) {
    return "api_change";
  }

  if (hasCategory(input, "docs") || input.sourceType === "docs_page") {
    return "docs_update";
  }

  return "routine_release";
}

function getFreshnessScore(publishedAt: string, now: number) {
  const published = Date.parse(publishedAt);
  if (!Number.isFinite(published)) return 0;

  const ageMs = now - published;
  const dayMs = 24 * 60 * 60 * 1000;

  if (ageMs <= dayMs) return 5;
  if (ageMs <= dayMs * 3) return 3;
  if (ageMs <= dayMs * 7) return 1;
  return 0;
}

export function getImportanceBand(score: number): ImportanceBand {
  if (score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function classifyImpactConfidence(input: SignalInput, releaseClass: ReleaseClass): ImpactConfidence {
  if (releaseClass === "security" || releaseClass === "breaking" || releaseClass === "pricing") {
    return "high";
  }

  if (releaseClass === "model_launch" && /frontier|state-of-the-art|responses api|chat completions|production/i.test(combinedText(input))) {
    return "high";
  }

  if (releaseClass === "api_change" || releaseClass === "sdk_release" || releaseClass === "policy") {
    return "medium";
  }

  return "low";
}

function buildTopicTags(input: SignalInput, releaseClass: ReleaseClass) {
  const text = combinedText(input);
  const tags = new Set<string>();

  if (releaseClass === "model_launch") tags.add("frontier-model");
  if (releaseClass === "cli_patch") {
    tags.add("cli-release");
    tags.add("patch-release");
  }
  if (releaseClass === "beta_release") tags.add("beta-release");
  if (releaseClass === "sdk_release") tags.add("sdk-update");
  if (releaseClass === "api_change" || (releaseClass === "breaking" && hasApiContractEvidence(text))) {
    tags.add("api-contract");
  }
  if (releaseClass === "pricing") tags.add("pricing-change");
  if (releaseClass === "policy") tags.add("policy-change");
  if (releaseClass === "docs_update") tags.add("docs-update");
  if (hasCategory(input, "deprecation") || /deprecat|sunset|retir/i.test(text)) tags.add("deprecation");
  if (releaseClass === "security") tags.add("security-change");

  return [...tags];
}

function buildSignalReasons(input: SignalInput, releaseClass: ReleaseClass, confidence: ImpactConfidence) {
  const reasons = [`release_class:${releaseClass}`, `impact_confidence:${confidence}`];

  if (input.sourceType === "github_release" || input.sourceType === "changelog_page") {
    reasons.push(`source:${input.sourceType}`);
  }

  if (input.githubUrl) reasons.push("evidence:github");
  if (lowImpactClasses.has(releaseClass)) reasons.push("low_operational_impact");
  if (classifyReleaseClass(input) === "cli_patch") reasons.push("semver_cli_patch");

  return unique(reasons);
}

function capScoreForReleaseClass(score: number, releaseClass: ReleaseClass) {
  if (releaseClass === "cli_patch") return Math.min(score, 42);
  if (releaseClass === "beta_release") return Math.min(score, 40);
  if (releaseClass === "routine_release") return Math.min(score, 36);
  if (releaseClass === "docs_update") return Math.min(score, 28);
  return score;
}

function baseScore(input: SignalInput, releaseClass: ReleaseClass, confidence: ImpactConfidence, now: number) {
  const confidenceScore = confidence === "high" ? 4 : confidence === "low" ? -4 : 0;
  const score =
    releaseClassBaseScores[releaseClass] +
    (sourceTypeWeights[input.sourceType] ?? 0) +
    getFreshnessScore(input.publishedAt, now) +
    (input.githubUrl ? 2 : 0) +
    confidenceScore;

  return capScoreForReleaseClass(score, releaseClass);
}

function truncateTitle(value: string, maxLength = 96) {
  const clean = cleanText(value);
  if (clean.length <= maxLength) return clean;

  const sliced = clean.slice(0, maxLength - 3);
  const boundary = sliced.lastIndexOf(" ");
  return `${sliced.slice(0, boundary > 48 ? boundary : sliced.length).trim()}...`;
}

export function buildDisplayTitle(input: SignalInput) {
  const title = cleanText(input.title);

  if (/^codex cli\s+\d+\.\d+\.\d+/i.test(title) || /^[a-z0-9._/-]+[@ ]+v?\d+\.\d+\.\d+/i.test(title)) {
    return title;
  }

  if (/^updated the agents sdk with/i.test(title)) {
    return "Agents SDK updated";
  }

  if (/released gpt-5\.5/i.test(title)) {
    return /gpt-5\.5 pro/i.test(title) ? "GPT-5.5 and GPT-5.5 pro released" : "GPT-5.5 released";
  }

  if (/released gpt image 2/i.test(title)) {
    return "GPT Image 2 released";
  }

  const releasedMatch = title.match(/^Released\s+([^,.]+)[,.]/i);
  if (releasedMatch?.[1] && releasedMatch[1].length <= 48) {
    return `${releasedMatch[1].trim()} released`;
  }

  const updatedMatch = title.match(/^Updated\s+(?:the\s+)?([^,.]+?)(?:\s+with|\s+to|[,.]|$)/i);
  if (updatedMatch?.[1] && updatedMatch[1].length <= 56) {
    return `${updatedMatch[1].trim()} updated`;
  }

  return truncateTitle(title);
}

function stackLabel(input: SignalInput) {
  return input.affectedStack.slice(0, 2).join(" and ") || "application";
}

export function buildSignalWhyItMatters(input: SignalInput, releaseClass: ReleaseClass, confidence: ImpactConfidence) {
  const vendor = input.vendorName ?? input.vendorSlug;
  const stack = stackLabel(input);

  if (releaseClass === "security") {
    return `${vendor} shipped a security-sensitive change for ${stack}. Teams using this surface should verify affected auth, secret, or dependency paths before the next release.`;
  }

  if (releaseClass === "breaking") {
    return `${vendor} changed or deprecated behavior that can affect ${stack}. Teams using this surface should plan migration or compatibility checks before upgrading.`;
  }

  if (releaseClass === "pricing") {
    return `${vendor} changed pricing or billing-relevant behavior for ${stack}. Product and engineering teams should review usage exposure before costs surprise customers or internal budgets.`;
  }

  if (releaseClass === "policy") {
    return `${vendor} updated policy or compliance expectations for ${stack}. Teams should check whether release, review, or governance workflows need adjustment.`;
  }

  if (releaseClass === "model_launch") {
    return `${vendor} changed model availability or behavior for ${stack}. AI teams should run targeted evals for quality, latency, cost, and tool behavior before production rollout.`;
  }

  if (releaseClass === "api_change") {
    return `${vendor} changed an API-facing surface for ${stack}. Teams with integrations should confirm request, response, webhook, and permission assumptions still hold.`;
  }

  if (releaseClass === "sdk_release") {
    return `${vendor} shipped SDK or client-library changes for ${stack}. Teams should review compatibility before changing pinned versions.`;
  }

  if (releaseClass === "cli_patch") {
    return `${vendor} shipped a CLI patch for ${stack}. This is usually routine unless your project depends on that CLI in local development, CI, or agent workflows.`;
  }

  if (releaseClass === "beta_release") {
    return `${vendor} shipped a beta or prerelease update for ${stack}. Track it if you test prereleases, but avoid treating it like production-impacting change by default.`;
  }

  if (releaseClass === "docs_update") {
    return `${vendor} updated official documentation for ${stack}. This is worth reviewing when that area is already in active development.`;
  }

  return confidence === "low"
    ? `${vendor} published a routine official update for ${stack}. Treat it as awareness unless this vendor is already part of active work.`
    : `${vendor} published an official update for ${stack}. Teams using this platform area should check whether any follow-up work is needed.`;
}

export function releaseClassLabel(releaseClass: ReleaseClass) {
  return releaseClass
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function productFamilyFromTitle(title: string, fallback: string) {
  const clean = normalize(title)
    .replace(/\b(v?\d+\.\d+\.\d+(?:[-+][a-z0-9._-]+)?)\b/g, " ")
    .replace(/\b\d{4}\.\d+\.\d+(?:[-+][a-z0-9._-]+)?\b/g, " ")
    .replace(/\b(beta|alpha|rc|preview|canary|nightly)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const words = clean.split(/\s+/).filter(Boolean).slice(0, 4).join("-");
  return words || fallback;
}

export function getReleaseFamily(input: SignalInput, releaseClass = classifyReleaseClass(input)) {
  if (releaseClass === "cli_patch") {
    return `${input.vendorSlug}:cli:${productFamilyFromTitle(input.title, "cli")}`;
  }

  if (releaseClass === "beta_release") {
    return `${input.vendorSlug}:beta:${productFamilyFromTitle(input.title, "beta")}`;
  }

  if (releaseClass === "model_launch") {
    const model = normalize(input.title).match(/\b(gpt[- ]?[a-z0-9.]+(?:\s+pro)?|gpt image \d+|claude [a-z0-9.]+|gemini [a-z0-9.]+|sora[- ]?[a-z0-9.]*)\b/i)?.[1];
    return `${input.vendorSlug}:model:${model ? model.replace(/\s+/g, "-") : productFamilyFromTitle(input.title, "model")}`;
  }

  return `${input.vendorSlug}:${releaseClass}:${productFamilyFromTitle(input.title, releaseClass)}`;
}

export function deriveSignalMetadata(
  input: SignalInput,
  options: { now?: number; repeatDecay?: number } = {},
): SignalMetadata {
  const now = options.now ?? Date.now();
  const releaseClass = classifyReleaseClass(input);
  const impactConfidence = classifyImpactConfidence(input, releaseClass);
  const repeatDecay = Math.max(0, options.repeatDecay ?? 0);
  const score = Math.max(0, baseScore(input, releaseClass, impactConfidence, now) - repeatDecay);
  const signalReasons = buildSignalReasons(input, releaseClass, impactConfidence);

  if (repeatDecay > 0) {
    signalReasons.push(`repeat_decay:-${repeatDecay}`);
  }

  return {
    releaseClass,
    impactConfidence,
    signalReasons: unique(signalReasons),
    topicTags: buildTopicTags(input, releaseClass),
    scoreVersion: SCORE_VERSION,
    signalScore: score,
    importanceBand: getImportanceBand(score),
    displayTitle: buildDisplayTitle(input),
    whyItMatters: buildSignalWhyItMatters(input, releaseClass, impactConfidence),
  };
}

function canRepeatDecay(releaseClass: ReleaseClass) {
  return releaseClass === "cli_patch" || releaseClass === "beta_release" || releaseClass === "routine_release" || releaseClass === "sdk_release";
}

export function deriveSignalMetadataForEvents<T extends SignalInput>(
  events: T[],
  options: { now?: number } = {},
) {
  const sorted = events
    .map((event, index) => ({ event, index, metadata: deriveSignalMetadata(event, options) }))
    .sort((a, b) => Date.parse(b.event.publishedAt) - Date.parse(a.event.publishedAt));
  const seenByFamily = new Map<string, number[]>();
  const byIndex = new Map<number, SignalMetadata>();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const item of sorted) {
    const family = `${item.event.vendorSlug}:${item.event.sourceUrl}:${getReleaseFamily(item.event, item.metadata.releaseClass)}`;
    const published = Date.parse(item.event.publishedAt);
    const recent = (seenByFamily.get(family) ?? []).filter((timestamp) => Math.abs(timestamp - published) <= dayMs);
    let metadata = item.metadata;

    if (canRepeatDecay(metadata.releaseClass) && recent.length > 0) {
      const decay = Math.min(30, recent.length === 1 ? 10 : recent.length === 2 ? 18 : 24 + (recent.length - 3) * 3);
      metadata = deriveSignalMetadata(item.event, { ...options, repeatDecay: decay });
    }

    recent.push(published);
    seenByFamily.set(family, recent);
    byIndex.set(item.index, metadata);
  }

  return events.map((event, index) => ({
    event,
    metadata: byIndex.get(index) ?? deriveSignalMetadata(event, options),
  }));
}
