import { describe, expect, it } from "vitest";

import {
  buildCanonicalNotificationPayload,
  buildWebhookPayload,
  getNotificationDeliveryRecordIds,
  notificationAlreadyDelivered,
  renderNotificationPayload,
  undeliveredNotificationRecordIds,
  watchlistDeliveryKey,
  watchlistMatchesCluster,
  watchlistMatchesUpdate,
  type WatchlistConfig,
} from "@/lib/watchlist-delivery";
import type { PublicUpdate } from "@/lib/agent-feed";
import type { PublicUpdateCluster } from "@/lib/public-clusters";

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

const routineUpdate: PublicUpdate = {
  ...update,
  id: "openai-codex-cli-0-125-0",
  title: "Codex CLI 0.125.0",
  severity: "medium",
  signal_score: 38,
  release_class: "cli_patch",
  impact_confidence: "low",
  signal_reasons: ["release_class:cli_patch", "impact_confidence:low"],
  tags: ["cli-release", "patch-release", "developer-workflow"],
  recommended_action: "Review CLI release notes before updating shared automation.",
  version_watch_url: "https://versionwatch.dev/events/openai-codex-cli-0-125-0",
};

const cluster: PublicUpdateCluster = {
  id: "cluster_openai_codex_cli_1777046400000",
  kind: "cluster",
  vendor: "OpenAI",
  vendor_slug: "openai",
  title: "OpenAI shipped 2 CLI patches in 24 hours",
  release_class: "cli_patch",
  severity: "medium",
  signal_score: 40,
  update_count: 2,
  latest_published_at: "2026-04-24T00:00:00.000Z",
  earliest_published_at: "2026-04-23T20:00:00.000Z",
  tags: ["cli-release", "developer-workflow", "patch-release"],
  summary: "OpenAI published 2 related Codex CLI patch releases.",
  why_it_matters: "Teams using Codex CLI in shared automation should review release notes before upgrading.",
  recommended_action: "Review Codex CLI release notes before updating pinned versions.",
  updates: [
    routineUpdate,
    {
      ...routineUpdate,
      id: "openai-codex-cli-0-124-0",
      title: "Codex CLI 0.124.0",
      version_watch_url: "https://versionwatch.dev/events/openai-codex-cli-0-124-0",
    },
  ],
};

describe("watchlistMatchesUpdate", () => {
  it("matches updates across vendor, severity, audience, tags, and release class", () => {
    expect(watchlistMatchesUpdate(watchlist, update)).toBe(true);
  });

  it("does not match inactive watchlists or unrelated vendors", () => {
    expect(watchlistMatchesUpdate({ ...watchlist, is_active: false }, update)).toBe(false);
    expect(watchlistMatchesUpdate({ ...watchlist, vendor_slugs: ["stripe"] }, update)).toBe(false);
  });

  it("supports score and confidence guardrails without changing persisted filters", () => {
    expect(watchlistMatchesUpdate({ ...watchlist, min_signal_score: 70 }, update)).toBe(true);
    expect(watchlistMatchesUpdate({ ...watchlist, min_signal_score: 80 }, update)).toBe(false);
    expect(
      watchlistMatchesUpdate(
        {
          ...watchlist,
          tags: [],
          severities: [],
          release_classes: [],
          include_low_confidence: false,
        },
        routineUpdate,
      ),
    ).toBe(false);
  });

  it("matches clusters when at least one contained update matches", () => {
    expect(
      watchlistMatchesCluster(
        {
          ...watchlist,
          tags: ["cli-release"],
          severities: ["medium"],
          release_classes: ["cli_patch"],
        },
        cluster,
      ),
    ).toBe(true);
    expect(watchlistMatchesCluster({ ...watchlist, vendor_slugs: ["stripe"] }, cluster)).toBe(false);
  });
});

describe("buildWebhookPayload", () => {
  it("builds Discord payloads with attribution links", () => {
    const payload = buildWebhookPayload(watchlist, update, {
      statusUrl: "https://versionwatch.dev/api/v1/status",
    }) as any;

    expect(payload.content).toContain("Critical AI changes");
    expect(payload.embeds[0].url).toBe(update.version_watch_url);
    expect(JSON.stringify(payload)).toContain(update.source_detail_url);
    expect(JSON.stringify(payload)).toContain("Freshness");
  });

  it("builds generic payloads for custom tools", () => {
    const payload = buildWebhookPayload({ ...watchlist, webhook_type: "generic" }, update) as any;

    expect(payload.watchlist.name).toBe(watchlist.name);
    expect(payload.update.id).toBe(update.id);
    expect(payload.source_detail_url).toBe(update.source_detail_url);
    expect(payload.status_url).toContain("/api/v1/status");
  });

  it("builds canonical clustered payloads with stable delivery record ids", () => {
    const payload = buildCanonicalNotificationPayload(watchlist, cluster, {
      generatedAt: "2026-04-26T00:00:00.000Z",
      freshnessStatus: "degraded",
    });

    expect(payload.kind).toBe("cluster");
    expect(payload.match.matched_update_ids).toEqual(["openai-codex-cli-0-125-0", "openai-codex-cli-0-124-0"]);
    expect(payload.freshness.caveat).toContain("degraded");
    expect(getNotificationDeliveryRecordIds(payload)).toEqual([
      "cluster_openai_codex_cli_1777046400000",
      "openai-codex-cli-0-125-0",
      "openai-codex-cli-0-124-0",
    ]);
  });

  it("suppresses duplicate clustered notifications once all included updates were delivered", () => {
    const payload = buildCanonicalNotificationPayload(watchlist, cluster);
    const delivered = new Set([
      watchlistDeliveryKey(watchlist.id, "openai-codex-cli-0-125-0"),
      watchlistDeliveryKey(watchlist.id, "openai-codex-cli-0-124-0"),
    ]);

    expect(notificationAlreadyDelivered(watchlist.id, payload, delivered)).toBe(true);
    expect(undeliveredNotificationRecordIds(watchlist.id, payload, delivered)).toEqual([
      "cluster_openai_codex_cli_1777046400000",
    ]);
  });

  it("renders portable notification formats beyond Discord and Slack", () => {
    const notification = buildCanonicalNotificationPayload(watchlist, cluster);
    const markdown = renderNotificationPayload("markdown", notification);
    const email = renderNotificationPayload("email", notification) as any;
    const teams = renderNotificationPayload("teams", notification) as any;

    expect(markdown).toContain("Official detail");
    expect(email.subject).toContain("Version Watch:");
    expect(teams.sections[0].facts).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Release class", value: "cli_patch" })]),
    );
  });
});
