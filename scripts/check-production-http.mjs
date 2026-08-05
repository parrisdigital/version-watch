#!/usr/bin/env node

const baseUrl = new URL(process.env.VERSION_WATCH_URL ?? "https://versionwatch.dev");
const failures = [];
const defaultMaxDurationMs = Number(process.env.MAX_HTTP_DURATION_MS ?? 15_000);

async function fetchRoute(path, validate, thresholds) {
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
    const bodyBytes = Buffer.byteLength(body);

    if (!response.ok) {
      failures.push(`${path} returned HTTP ${response.status}.`);
    } else {
      try {
        validate(body, response);
      } catch (error) {
        failures.push(`${path} failed content validation: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const maxDurationMs = thresholds.maxDurationMs ?? defaultMaxDurationMs;
    if (durationMs > maxDurationMs) {
      failures.push(`${path} took ${durationMs}ms; maximum is ${maxDurationMs}ms.`);
    }
    if (bodyBytes > thresholds.maxBytes) {
      failures.push(`${path} returned ${bodyBytes} bytes; maximum is ${thresholds.maxBytes} bytes.`);
    }

    console.log(`${response.status} ${path} ${durationMs}ms ${bodyBytes} bytes`);
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
  fetchRoute("/", (body) => expectIncludes(body, "Every platform change"), { maxBytes: 750_000 }),
  fetchRoute("/search", (body) => expectIncludes(body, "Search"), { maxBytes: 1_000_000 }),
  fetchRoute("/api/v1/updates?limit=1", (body) => {
    const payload = parseJson(body);
    if (payload.count !== 1 || !Array.isArray(payload.updates) || payload.updates.length !== 1) {
      throw new Error("expected one public update");
    }
  }, { maxBytes: 250_000 }),
  fetchRoute("/api/v1/feed.json?limit=1", (body) => {
    const payload = parseJson(body);
    if (payload.count !== 1 || !Array.isArray(payload.updates) || payload.updates.length !== 1) {
      throw new Error("expected one feed update");
    }
  }, { maxBytes: 250_000 }),
  fetchRoute("/api/v1/feed.md?limit=1", (body) => expectIncludes(body, "Version Watch"), { maxBytes: 250_000 }),
  fetchRoute("/api/v1/taxonomy", (body) => {
    const payload = parseJson(body);
    if (!Array.isArray(payload.taxonomy?.vendors) || payload.taxonomy.vendors.length < 1) {
      throw new Error("taxonomy has no vendors");
    }
  }, { maxBytes: 250_000 }),
  fetchRoute("/sitemap.xml", (body) => {
    expectIncludes(body, "/vendors/");
    expectIncludes(body, "/events/");
  }, { maxBytes: 3_000_000 }),
]);

if (failures.length) {
  console.error("\nProduction HTTP availability failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nProduction HTTP availability passed.");
