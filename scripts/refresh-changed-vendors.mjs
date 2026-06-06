#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import {
  extractVendorSlugs,
  filterVendorAffectingFiles,
  getChangedVendorSlugs,
  getVendorLineRanges,
} from "./lib/changed-vendor-refresh.mjs";

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  }

  return result.stdout.trim();
}

function isUsableSha(value) {
  return Boolean(value && !/^0+$/.test(value));
}

function resolveHeadSha() {
  return process.env.GITHUB_HEAD_SHA || process.env.GITHUB_SHA || runGit(["rev-parse", "HEAD"]);
}

function resolveBaseSha(headSha) {
  const beforeSha = process.env.GITHUB_BEFORE || process.env.GITHUB_EVENT_BEFORE;

  if (isUsableSha(beforeSha)) {
    try {
      runGit(["cat-file", "-e", `${beforeSha}^{commit}`]);
      return beforeSha;
    } catch {
      console.log(`Base SHA ${beforeSha} is not available locally; falling back to ${headSha}^.`);
    }
  }

  return runGit(["rev-parse", `${headSha}^`]);
}

async function main() {
  const headSha = resolveHeadSha();
  const baseSha = resolveBaseSha(headSha);
  const changedFiles = runGit(["diff", "--name-only", baseSha, headSha]).split("\n");
  const relevantFiles = filterVendorAffectingFiles(changedFiles);

  console.log(`Changed vendor refresh`);
  console.log(`Base SHA: ${baseSha}`);
  console.log(`Head SHA: ${headSha}`);
  console.log(`Changed files: ${changedFiles.filter(Boolean).length}`);
  console.log(`Vendor-affecting files: ${relevantFiles.length}`);

  if (!relevantFiles.length) {
    console.log("[ok] No vendor-affecting files changed.");
    return;
  }

  for (const file of relevantFiles) {
    console.log(`- ${file}`);
  }

  const mockDataSource = await readFile("src/lib/mock-data.ts", "utf8");
  const vendorSlugs = extractVendorSlugs(mockDataSource);
  const vendorLineRanges = getVendorLineRanges(mockDataSource);
  const diffText = runGit(["diff", "--unified=0", baseSha, headSha, "--", ...relevantFiles]);
  const changedVendorSlugs = getChangedVendorSlugs({ diffText, vendorSlugs, vendorLineRanges });

  if (!changedVendorSlugs.length) {
    console.log("[ok] Vendor-affecting files changed, but no current vendor slug was detected in the diff.");
    return;
  }

  console.log(`Changed vendor slugs: ${changedVendorSlugs.join(", ")}`);

  if (process.env.DRY_RUN === "true") {
    console.log("[ok] Dry run complete; no production refresh was started.");
    return;
  }

  const adminSecret = process.env.ADMIN_SECRET;
  const convexUrl = process.env.CONVEX_URL;

  if (!adminSecret) {
    throw new Error("ADMIN_SECRET is required to refresh changed vendors.");
  }

  if (!convexUrl) {
    throw new Error("CONVEX_URL is required to refresh changed vendors.");
  }

  const [{ ConvexHttpClient }, { api }] = await Promise.all([
    import("convex/browser"),
    import("../convex/_generated/api.js"),
  ]);
  const client = new ConvexHttpClient(convexUrl);
  let failed = false;

  for (const vendorSlug of changedVendorSlugs) {
    console.log(`\nRefreshing ${vendorSlug} with force=true`);
    const result = await client.action(api.ingest.runManualIngestion, {
      adminSecret,
      force: true,
      vendorSlug,
    });

    console.log(JSON.stringify(result, null, 2));

    if (result.skipped || result.failures > 0 || result.sourcesProcessed === 0) {
      failed = true;
      console.error(`Changed vendor refresh did not complete cleanly for ${vendorSlug}.`);
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log("\n[ok] Changed vendor refresh completed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
