const vendorAffectingPrefixes = [
  "convex/",
  "src/lib/ingestion/",
  "src/lib/classification/",
];

const vendorAffectingFiles = new Set([
  "src/lib/mock-data.ts",
  "src/lib/agent-status.ts",
  "src/lib/vendor-categories.ts",
  "src/lib/vendor-branding.ts",
  "convex/ingest.ts",
  "convex/ingestState.ts",
  "convex/sourceLifecycle.ts",
  "convex/sourceFreshness.ts",
  "convex/vendors.ts",
]);

export function extractVendorSlugs(source) {
  const registryStart = source.indexOf("export const vendors");
  const registryEnd = source.indexOf("const vendorNameBySlug", registryStart);
  const registrySource =
    registryStart >= 0 && registryEnd > registryStart ? source.slice(registryStart, registryEnd) : source;
  const slugs = new Set();
  const slugPattern = /\bslug:\s*["']([^"']+)["']/g;

  for (const match of registrySource.matchAll(slugPattern)) {
    if (match[1]) {
      slugs.add(match[1]);
    }
  }

  return [...slugs].sort();
}

export function extractVendorSourceUrls(source) {
  const registryStart = source.indexOf("export const vendors");
  const registryEnd = source.indexOf("const vendorNameBySlug", registryStart);
  const registrySource =
    registryStart >= 0 && registryEnd > registryStart ? source.slice(registryStart, registryEnd) : source;
  const markers = [];
  const slugPattern = /\bslug:\s*["']([^"']+)["']/g;

  for (const match of registrySource.matchAll(slugPattern)) {
    if (match[1] && match.index !== undefined) {
      markers.push({ slug: match[1], index: match.index });
    }
  }

  const sourceUrls = new Map();

  markers.forEach((marker, index) => {
    const nextMarker = markers[index + 1];
    const block = registrySource.slice(marker.index, nextMarker?.index ?? registrySource.length);
    const urls = [];
    const urlPattern = /\burl:\s*["']([^"']+)["']/g;

    for (const match of block.matchAll(urlPattern)) {
      if (match[1]) {
        urls.push(match[1]);
      }
    }

    sourceUrls.set(marker.slug, urls);
  });

  return sourceUrls;
}

export function hasOnlyUnsupportedSources(vendorSlug, vendorSourceUrls, unsupportedSourceUrls) {
  const urls = vendorSourceUrls.get(vendorSlug) ?? [];

  return urls.length > 0 && urls.every((url) => unsupportedSourceUrls.has(url));
}

export function getVendorLineRanges(source) {
  const lines = source.split(/\r?\n/);
  const markers = [];

  lines.forEach((line, index) => {
    const match = line.match(/\bslug:\s*["']([^"']+)["']/);

    if (match?.[1]) {
      markers.push({ slug: match[1], line: index + 1 });
    }
  });

  return markers.map((marker, index) => ({
    slug: marker.slug,
    startLine: marker.line,
    endLine: markers[index + 1]?.line ? markers[index + 1].line - 1 : lines.length,
  }));
}

export function filterVendorAffectingFiles(paths) {
  return paths
    .map((path) => path.trim())
    .filter(Boolean)
    .filter((path) => !path.endsWith(".test.ts") && !path.endsWith(".test.tsx") && !path.startsWith("tests/"))
    .filter((path) => vendorAffectingFiles.has(path) || vendorAffectingPrefixes.some((prefix) => path.startsWith(prefix)))
    .sort();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectSlugsInText(text, vendorSlugs) {
  const slugs = [];

  for (const slug of vendorSlugs) {
    const escapedSlug = escapeRegExp(slug);
    const syntaxPattern = new RegExp(
      [
        String.raw`\bslug:\s*["']${escapedSlug}["']`,
        String.raw`["']${escapedSlug}["']\s*[:,\]}]?`,
        String.raw`["']${escapedSlug}:`,
        String.raw`\b${escapedSlug}:`,
      ].join("|"),
    );

    if (syntaxPattern.test(text)) {
      slugs.push(slug);
    }
  }

  return slugs;
}

function findVendorForLine(lineNumber, vendorLineRanges) {
  return vendorLineRanges.find((range) => lineNumber >= range.startLine && lineNumber <= range.endLine)?.slug;
}

function isStructuralOnlyDiffLine(text) {
  return /^[{}\][,;\s]*$/.test(text);
}

function parseDiffPath(line) {
  const match = line.match(/^diff --git a\/.+ b\/(.+)$/);
  return match?.[1];
}

function parseNewLineStart(line) {
  const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  return match?.[1] ? Number(match[1]) : undefined;
}

export function getChangedVendorSlugs({ diffText, vendorSlugs, vendorLineRanges = [] }) {
  const changedSlugs = new Set();
  let currentPath = "";
  let newLineNumber;

  for (const line of diffText.split(/\r?\n/)) {
    const diffPath = parseDiffPath(line);

    if (diffPath) {
      currentPath = diffPath;
      newLineNumber = undefined;
      continue;
    }

    const hunkStart = parseNewLineStart(line);

    if (hunkStart !== undefined) {
      newLineNumber = hunkStart;
      continue;
    }

    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }

    if (line.startsWith("+")) {
      const changedText = line.slice(1);
      const slugsFromText = detectSlugsInText(changedText, vendorSlugs);

      for (const slug of slugsFromText) {
        changedSlugs.add(slug);
      }

      if (
        currentPath === "src/lib/mock-data.ts" &&
        newLineNumber !== undefined &&
        !isStructuralOnlyDiffLine(changedText)
      ) {
        const slugFromLine = findVendorForLine(newLineNumber, vendorLineRanges);

        if (slugFromLine) {
          changedSlugs.add(slugFromLine);
        }
      }

      if (newLineNumber !== undefined) {
        newLineNumber += 1;
      }

      continue;
    }

    if (line.startsWith("-")) {
      const changedText = line.slice(1);
      const slugsFromText = detectSlugsInText(changedText, vendorSlugs);

      for (const slug of slugsFromText) {
        changedSlugs.add(slug);
      }

      continue;
    }

    if (newLineNumber !== undefined) {
      newLineNumber += 1;
    }
  }

  return [...changedSlugs].sort();
}
