import type { SourceType } from "@/lib/mock-data";

const BLOCKED_DETAIL_PATTERNS: Record<string, RegExp[]> = {
  supabase: [/^https:\/\/supabase\.com\/blog(?:\/|$)/i],
  vercel: [/^https:\/\/vercel\.com\/blog(?:\/|$)/i],
};

const ALLOWED_DETAIL_PATTERNS: Record<string, RegExp[]> = {
  anthropic: [
    /^https:\/\/(?:www\.)?anthropic\.com\/news\//i,
    /^https:\/\/(?:www\.)?anthropic\.com\/glasswing/i,
    /^https:\/\/platform\.claude\.com\/docs\//i,
    /^https:\/\/support\.claude\.com\/en\/articles\//i,
  ],
  "better-auth": [/^https:\/\/github\.com\/better-auth\/better-auth\/releases/i],
  supabase: [/^https:\/\/github\.com\/orgs\/supabase\/discussions\//i],
  warp: [/^https:\/\/docs\.warp\.dev\/changelog/i],
};

export type SourceLinkAuditSource = {
  name: string;
  url: string;
  type: SourceType | string;
};

export type SourceLinkAuditVendor = {
  slug: string;
  name?: string;
  sources?: SourceLinkAuditSource[];
};

export type SourceLinkAuditUpdate = {
  id: string;
  vendor_slug: string;
  title: string;
  source_url?: string;
  source_detail_url?: string;
  source_surface_url?: string;
};

export type SourceLinkFinding = {
  level: "error" | "warning";
  vendor_slug: string;
  update_id: string;
  title: string;
  source_url: string;
  source_surface_url: string | null;
  reason: string;
};

export type SourceLinkAuditReport = {
  checked_updates: number;
  checked_vendors: number;
  error_count: number;
  warning_count: number;
  findings: SourceLinkFinding[];
};

function normalizeHost(value: string) {
  return value.replace(/^www\./, "");
}

function parseUrl(value: string | null | undefined) {
  if (!value) return null;

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function normalizedUrlWithoutHash(value: string) {
  const url = parseUrl(value);
  if (!url) return value.replace(/#.*$/, "").replace(/\/$/, "");
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function hasPathPrefix(candidateUrl: string, sourceUrl: string) {
  const candidate = parseUrl(candidateUrl);
  const source = parseUrl(sourceUrl);

  if (!candidate || !source) {
    return false;
  }

  const candidateHost = normalizeHost(candidate.hostname);
  const sourceHost = normalizeHost(source.hostname);
  const sourcePath = source.pathname.replace(/\/$/, "") || "/";
  const candidatePath = candidate.pathname.replace(/\/$/, "") || "/";

  if (sourcePath === "/") {
    return candidateHost === sourceHost;
  }

  return candidateHost === sourceHost && (candidatePath === sourcePath || candidatePath.startsWith(`${sourcePath}/`));
}

export function getDetailUrl(update: SourceLinkAuditUpdate) {
  return update.source_detail_url ?? update.source_url ?? "";
}

function isKnownBlocked(vendorSlug: string, sourceUrl: string) {
  const patterns = BLOCKED_DETAIL_PATTERNS[vendorSlug] ?? [];
  return patterns.some((pattern) => pattern.test(sourceUrl));
}

function isKnownAllowed(vendorSlug: string, sourceUrl: string) {
  const patterns = ALLOWED_DETAIL_PATTERNS[vendorSlug] ?? [];
  return patterns.some((pattern) => pattern.test(sourceUrl));
}

export function sourceCoversUpdate(source: SourceLinkAuditSource, update: SourceLinkAuditUpdate) {
  const sourceType = source.type;
  const detailUrl = getDetailUrl(update);
  const updateUrl = normalizedUrlWithoutHash(detailUrl);
  const sourceUrl = normalizedUrlWithoutHash(source.url);

  if (!updateUrl) {
    return false;
  }

  if (updateUrl === sourceUrl || hasPathPrefix(updateUrl, sourceUrl)) {
    return true;
  }

  if (sourceType === "rss") {
    const candidate = parseUrl(detailUrl);
    const sourceParsed = parseUrl(source.url);
    return Boolean(candidate && sourceParsed && normalizeHost(candidate.hostname) === normalizeHost(sourceParsed.hostname));
  }

  return isKnownAllowed(update.vendor_slug, detailUrl);
}

function getVendorSourceMap(vendors: SourceLinkAuditVendor[]) {
  return new Map(vendors.map((vendor) => [vendor.slug, vendor.sources ?? []]));
}

export function auditSourceLinks({
  vendors,
  updates,
}: {
  vendors: SourceLinkAuditVendor[];
  updates: SourceLinkAuditUpdate[];
}): SourceLinkAuditReport {
  const vendorSources = getVendorSourceMap(vendors);
  const findings: SourceLinkFinding[] = [];

  for (const update of updates) {
    const detailUrl = getDetailUrl(update);
    const sources = vendorSources.get(update.vendor_slug) ?? [];

    if (isKnownBlocked(update.vendor_slug, detailUrl)) {
      findings.push({
        level: "error",
        vendor_slug: update.vendor_slug,
        update_id: update.id,
        title: update.title,
        source_url: detailUrl,
        source_surface_url: update.source_surface_url ?? null,
        reason: "Known blog/news URL was published from a changelog source.",
      });
      continue;
    }

    if (sources.some((source) => sourceCoversUpdate(source, update))) {
      continue;
    }

    findings.push({
      level: "warning",
      vendor_slug: update.vendor_slug,
      update_id: update.id,
      title: update.title,
      source_url: detailUrl,
      source_surface_url: update.source_surface_url ?? null,
      reason: "Update URL is not directly covered by the registered vendor source URL.",
    });
  }

  const errors = findings.filter((finding) => finding.level === "error");
  const warnings = findings.filter((finding) => finding.level === "warning");

  return {
    checked_updates: updates.length,
    checked_vendors: vendors.length,
    error_count: errors.length,
    warning_count: warnings.length,
    findings,
  };
}
