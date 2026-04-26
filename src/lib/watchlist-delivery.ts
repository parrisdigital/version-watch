import type { PublicUpdate } from "@/lib/agent-feed";

export type WebhookType = "discord" | "slack" | "generic";

export type WatchlistConfig = {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  vendor_slugs: string[];
  severities: string[];
  audiences: string[];
  tags: string[];
  release_classes: string[];
  webhook_type: WebhookType;
  webhook_url?: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function intersects(filterValues: string[], updateValues: string[]) {
  if (!filterValues.length) return true;
  const normalizedUpdateValues = new Set(updateValues.map(normalize));
  return filterValues.map(normalize).some((value) => normalizedUpdateValues.has(value));
}

export function watchlistMatchesUpdate(watchlist: WatchlistConfig, update: PublicUpdate) {
  if (!watchlist.is_active) return false;
  if (!intersects(watchlist.vendor_slugs, [update.vendor_slug])) return false;
  if (!intersects(watchlist.severities, [update.severity])) return false;
  if (!intersects(watchlist.release_classes, [update.release_class])) return false;
  if (!intersects(watchlist.audiences, update.audience)) return false;
  if (!intersects(watchlist.tags, update.tags)) return false;
  return true;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value;
}

function compactUpdateText(update: PublicUpdate) {
  return [
    `${update.vendor}: ${update.title}`,
    `${update.severity.toUpperCase()} · ${update.release_class} · score ${update.signal_score}`,
    update.recommended_action,
    update.version_watch_url,
  ].join("\n");
}

export function buildWebhookPayload(watchlist: WatchlistConfig, update: PublicUpdate) {
  if (watchlist.webhook_type === "discord") {
    return {
      content: `Version Watch matched ${watchlist.name}`,
      embeds: [
        {
          title: truncate(`${update.vendor}: ${update.title}`, 256),
          url: update.version_watch_url,
          description: truncate(update.recommended_action, 350),
          fields: [
            { name: "Severity", value: update.severity, inline: true },
            { name: "Release class", value: update.release_class, inline: true },
            { name: "Signal", value: String(update.signal_score), inline: true },
            { name: "Official detail", value: update.source_detail_url, inline: false },
          ],
        },
      ],
    };
  }

  if (watchlist.webhook_type === "slack") {
    return {
      text: compactUpdateText(update),
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${update.vendor}: ${update.title}*\n${update.recommended_action}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `${update.severity} · ${update.release_class} · score ${update.signal_score} · <${update.version_watch_url}|Version Watch> · <${update.source_detail_url}|Official detail>`,
            },
          ],
        },
      ],
    };
  }

  return {
    schema_version: "2026-04-26",
    watchlist: {
      id: watchlist.id,
      name: watchlist.name,
    },
    update,
  };
}
