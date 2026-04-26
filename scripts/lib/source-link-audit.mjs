const BLOCKED_DETAIL_PATTERNS = {
  supabase: [/^https:\/\/supabase\.com\/blog(?:\/|$)/i],
  vercel: [/^https:\/\/vercel\.com\/blog(?:\/|$)/i],
};

const ALLOWED_DETAIL_PATTERNS = {
  anthropic: [
    /^https:\/\/(?:www\.)?anthropic\.com\/news\//i,
    /^https:\/\/(?:www\.)?anthropic\.com\/glasswing/i,
    /^https:\/\/platform\.claude\.com\/docs\//i,
    /^https:\/\/support\.claude\.com\/en\/articles\//i,
  ],
  "better-auth": [/^https:\/\/github\.com\/better-auth\/better-auth\/releases/i],
  supabase: [/^https:\/\/github\.com\/orgs\/supabase\/discussions\//i],
};

function normalizeHost(value) {
  return value.replace(/^www\./, "");
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function normalizedUrlWithoutHash(value) {
  const url = parseUrl(value);
  if (!url) return value.replace(/#.*$/, "").replace(/\/$/, "");
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function hasPathPrefix(candidateUrl, sourceUrl) {
  const candidate = parseUrl(candidateUrl);
  const source = parseUrl(sourceUrl);

  if (!candidate || !source) {
    return false;
  }

  const candidateHost = normalizeHost(candidate.hostname);
  const sourceHost = normalizeHost(source.hostname);
  const sourcePath = source.pathname.replace(/\/$/, "") || "/";
  const candidatePath = candidate.pathname.replace(/\/$/, "") || "/";

  return candidateHost === sourceHost && (candidatePath === sourcePath || candidatePath.startsWith(`${sourcePath}/`));
}

function isKnownBlocked(vendorSlug, sourceUrl) {
  const patterns = BLOCKED_DETAIL_PATTERNS[vendorSlug] ?? [];
  return patterns.some((pattern) => pattern.test(sourceUrl));
}

function isKnownAllowed(vendorSlug, sourceUrl) {
  const patterns = ALLOWED_DETAIL_PATTERNS[vendorSlug] ?? [];
  return patterns.some((pattern) => pattern.test(sourceUrl));
}

function sourceCoversUpdate(source, update) {
  const sourceType = source.type;
  const updateUrl = normalizedUrlWithoutHash(update.source_url);
  const sourceUrl = normalizedUrlWithoutHash(source.url);

  if (updateUrl === sourceUrl || hasPathPrefix(updateUrl, sourceUrl)) {
    return true;
  }

  if (sourceType === "rss") {
    const candidate = parseUrl(update.source_url);
    const sourceParsed = parseUrl(source.url);
    return Boolean(candidate && sourceParsed && normalizeHost(candidate.hostname) === normalizeHost(sourceParsed.hostname));
  }

  return isKnownAllowed(update.vendor_slug, update.source_url);
}

function getVendorSourceMap(vendors) {
  return new Map(vendors.map((vendor) => [vendor.slug, vendor.sources ?? []]));
}

export function auditSourceLinks({ vendors, updates }) {
  const vendorSources = getVendorSourceMap(vendors);
  const findings = [];

  for (const update of updates) {
    const sources = vendorSources.get(update.vendor_slug) ?? [];

    if (isKnownBlocked(update.vendor_slug, update.source_url)) {
      findings.push({
        level: "error",
        vendor_slug: update.vendor_slug,
        update_id: update.id,
        title: update.title,
        source_url: update.source_url,
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
      source_url: update.source_url,
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
