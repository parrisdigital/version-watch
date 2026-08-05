#!/usr/bin/env node

const baseUrl = new URL(process.env.VERSION_WATCH_URL ?? "https://versionwatch.dev");
const failures = [];

async function fetchRoute(path, validate) {
  const url = new URL(path, baseUrl);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "VersionWatchAvailability/1.0" },
    });
    const body = await response.text();
    const durationMs = Math.round(performance.now() - startedAt);

    if (!response.ok) {
      failures.push(`${path} returned HTTP ${response.status}.`);
    } else {
      try {
        validate(body, response);
      } catch (error) {
        failures.push(`${path} failed content validation: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`${response.status} ${path} ${durationMs}ms ${body.length} bytes`);
  } catch (error) {
    failures.push(`${path} request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function expectIncludes(body, value) {
  if (!body.includes(value)) throw new Error(`missing ${JSON.stringify(value)}`);
}

function parseJson(body) {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("response is not valid JSON");
  }
}

await Promise.all([
  fetchRoute("/", (body) => expectIncludes(body, "Every platform change")),
  fetchRoute("/search", (body) => expectIncludes(body, "Search")),
  fetchRoute("/api/v1/updates?limit=1", (body) => {
    const payload = parseJson(body);
    if (payload.count !== 1 || !Array.isArray(payload.updates) || payload.updates.length !== 1) {
      throw new Error("expected one public update");
    }
  }),
  fetchRoute("/api/v1/feed.json?limit=1", (body) => {
    const payload = parseJson(body);
    if (payload.count !== 1 || !Array.isArray(payload.updates) || payload.updates.length !== 1) {
      throw new Error("expected one feed update");
    }
  }),
  fetchRoute("/api/v1/feed.md?limit=1", (body) => expectIncludes(body, "Version Watch")),
  fetchRoute("/api/v1/taxonomy", (body) => {
    const payload = parseJson(body);
    if (!Array.isArray(payload.taxonomy?.vendors) || payload.taxonomy.vendors.length < 1) {
      throw new Error("taxonomy has no vendors");
    }
  }),
  fetchRoute("/sitemap.xml", (body) => {
    expectIncludes(body, "/vendors/");
    expectIncludes(body, "/events/");
  }),
]);

if (failures.length) {
  console.error("\nProduction HTTP availability failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nProduction HTTP availability passed.");
