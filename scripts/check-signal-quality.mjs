const BASE_URL = process.env.VERSION_WATCH_URL ?? "https://versionwatch.dev";

async function getJson(path) {
  const url = new URL(path, BASE_URL);
  url.searchParams.set("_health_check", `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const response = await fetch(url, {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
  if (!response.ok) {
    throw new Error(`${url.pathname}${url.search} returned ${response.status}`);
  }
  return await response.json();
}

function findOpenAiModel(updates) {
  return updates.find((update) => {
    return update.vendor_slug === "openai" && update.release_class === "model_launch" && /gpt|image|sora/i.test(update.title);
  });
}

function findOpenAiCliPatch(updates) {
  return updates.find((update) => {
    return update.vendor_slug === "openai" && update.release_class === "cli_patch";
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const status = await getJson("/api/v1/status");
const openAi = await getJson("/api/v1/updates?vendor=openai&limit=100");
const clusters = await getJson("/api/v1/clusters?limit=20");
const taxonomy = await getJson("/api/v1/taxonomy");

assert(["healthy", "degraded", "stale"].includes(status.status), "status endpoint returned an unknown status");
assert(openAi.updates?.length > 0, "OpenAI updates are missing");
assert(taxonomy.taxonomy?.release_classes?.includes("model_launch"), "taxonomy is missing release_classes");
assert(taxonomy.taxonomy?.impact_confidences?.includes("low"), "taxonomy is missing impact_confidences");

const model = findOpenAiModel(openAi.updates);
const cliPatch = findOpenAiCliPatch(openAi.updates);

if (model && cliPatch) {
  assert(
    model.signal_score > cliPatch.signal_score,
    `OpenAI model launch should outrank CLI patch (${model.signal_score} <= ${cliPatch.signal_score})`,
  );
}

const firstCluster = clusters.clusters?.[0];
if (firstCluster?.updates?.[0]) {
  assert(
    firstCluster.signal_score === firstCluster.updates[0].signal_score || firstCluster.kind === "cluster",
    "single cluster score should match nested update score",
  );
}

console.log("Version Watch signal quality");
console.log(`Base URL: ${BASE_URL}`);
console.log(`Status: ${status.status}`);
console.log(`OpenAI updates checked: ${openAi.updates.length}`);
if (model) console.log(`Model launch example: ${model.title} (${model.signal_score})`);
if (cliPatch) console.log(`CLI patch example: ${cliPatch.title} (${cliPatch.signal_score})`);
console.log(`Clusters checked: ${clusters.clusters?.length ?? 0}`);
console.log("[ok] Signal quality checks passed.");
