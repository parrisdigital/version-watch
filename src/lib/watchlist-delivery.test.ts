import { describe, expect, it } from "vitest";

import { buildWebhookPayload, watchlistMatchesUpdate, type WatchlistConfig } from "@/lib/watchlist-delivery";
import type { PublicUpdate } from "@/lib/agent-feed";

const watchlist: WatchlistConfig = {
  id: "wl_1",
  name: "Critical AI changes",
  is_active: true,
  vendor_slugs: ["openai"],
  severities: ["high", "critical"],
  audiences: ["ai"],
  tags: ["frontier-model"],
  release_classes: ["model_launch"],
  webhook_type: "discord",
};

const update: PublicUpdate = {
  id: "openai-gpt-5-5",
  vendor: "OpenAI",
  vendor_slug: "openai",
  title: "GPT-5.5 and GPT-5.5 pro released",
  published_at: "2026-04-24T00:00:00.000Z",
  severity: "high",
  signal_score: 72,
  release_class: "model_launch",
  impact_confidence: "high",
  signal_reasons: ["release_class:model_launch"],
  score_version: "v2",
  audience: ["ai", "backend"],
  tags: ["model", "api", "frontier-model"],
  summary: "OpenAI released GPT-5.5.",
  why_it_matters: "Run evals.",
  recommended_action: "Run model evals before rollout.",
  source_detail_url: "https://platform.openai.com/docs/changelog",
  source_surface_url: "https://platform.openai.com/docs/changelog",
  source_surface_name: "API Changelog",
  source_surface_type: "docs_page",
  source_url: "https://platform.openai.com/docs/changelog",
  github_url: null,
  version_watch_url: "https://versionwatch.dev/events/openai-gpt-5-5",
};

describe("watchlistMatchesUpdate", () => {
  it("matches updates across vendor, severity, audience, tags, and release class", () => {
    expect(watchlistMatchesUpdate(watchlist, update)).toBe(true);
  });

  it("does not match inactive watchlists or unrelated vendors", () => {
    expect(watchlistMatchesUpdate({ ...watchlist, is_active: false }, update)).toBe(false);
    expect(watchlistMatchesUpdate({ ...watchlist, vendor_slugs: ["stripe"] }, update)).toBe(false);
  });
});

describe("buildWebhookPayload", () => {
  it("builds Discord payloads with attribution links", () => {
    const payload = buildWebhookPayload(watchlist, update) as any;

    expect(payload.content).toContain("Critical AI changes");
    expect(payload.embeds[0].url).toBe(update.version_watch_url);
    expect(JSON.stringify(payload)).toContain(update.source_detail_url);
  });

  it("builds generic payloads for custom tools", () => {
    const payload = buildWebhookPayload({ ...watchlist, webhook_type: "generic" }, update) as any;

    expect(payload.watchlist.name).toBe(watchlist.name);
    expect(payload.update.id).toBe(update.id);
  });
});
