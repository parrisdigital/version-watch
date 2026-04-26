import type { PublicUpdate } from "@/lib/agent-feed";
import type { PublicUpdateCluster } from "@/lib/public-clusters";

export type WebhookType = "discord" | "slack" | "generic";
export type NotificationRenderFormat = WebhookType | "teams" | "markdown" | "text" | "email";
export type WatchlistDeliveryMode = "clustered" | "raw";

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
  delivery_mode?: WatchlistDeliveryMode;
  min_signal_score?: number;
  include_low_confidence?: boolean;
};

export type NotificationSubject =
  | {
      kind: "update";
      update: PublicUpdate;
    }
  | {
      kind: "cluster";
      cluster: PublicUpdateCluster;
    };

export type CanonicalNotificationPayload = {
  schema_version: "2026-04-26";
  generated_at: string;
  notification_id: string;
  dedupe_key: string;
  kind: "update" | "single" | "cluster";
  title: string;
  summary: string;
  recommended_action: string;
  severity: PublicUpdate["severity"];
  release_class: PublicUpdate["release_class"];
  signal_score: number;
  status_url: string;
  freshness: {
    status_url: string;
    status: string | null;
    caveat: string;
  };
  watchlist: {
    id: string;
    name: string;
    description: string | null;
    delivery_mode: WatchlistDeliveryMode;
    filters: {
      vendor_slugs: string[];
      severities: string[];
      audiences: string[];
      tags: string[];
      release_classes: string[];
      min_signal_score: number | null;
      include_low_confidence: boolean;
    };
  };
  match: {
    matched_update_ids: string[];
    matched_count: number;
  };
  update: PublicUpdate;
  updates: PublicUpdate[];
  cluster: null | {
    id: string;
    kind: "single" | "cluster";
    update_count: number;
    latest_published_at: string;
    earliest_published_at: string;
  };
  source_detail_url: string;
  source_surface_url: string;
  source_surface_name: string;
  source_surface_type: string;
  version_watch_url: string;
};

type BuildNotificationOptions = {
  generatedAt?: string;
  statusUrl?: string;
  freshnessStatus?: string | null;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function intersects(filterValues: string[], updateValues: string[]) {
  if (!filterValues.length) return true;
  const normalizedUpdateValues = new Set(updateValues.map(normalize));
  return filterValues.map(normalize).some((value) => normalizedUpdateValues.has(value));
}

export function getWatchlistDeliveryMode(watchlist: WatchlistConfig): WatchlistDeliveryMode {
  return watchlist.delivery_mode ?? "clustered";
}

export function watchlistMatchesUpdate(watchlist: WatchlistConfig, update: PublicUpdate) {
  if (!watchlist.is_active) return false;
  if (typeof watchlist.min_signal_score === "number" && update.signal_score < watchlist.min_signal_score) return false;
  if (watchlist.include_low_confidence === false && update.impact_confidence === "low") return false;
  if (!intersects(watchlist.vendor_slugs, [update.vendor_slug])) return false;
  if (!intersects(watchlist.severities, [update.severity])) return false;
  if (!intersects(watchlist.release_classes, [update.release_class])) return false;
  if (!intersects(watchlist.audiences, update.audience)) return false;
  if (!intersects(watchlist.tags, update.tags)) return false;
  return true;
}

export function watchlistMatchesCluster(watchlist: WatchlistConfig, cluster: PublicUpdateCluster) {
  if (!watchlist.is_active) return false;
  return cluster.updates.some((update) => watchlistMatchesUpdate(watchlist, update));
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value;
}

function compactUpdateText(update: PublicUpdate, count = 1) {
  return [
    count > 1 ? `${update.vendor}: ${update.title} (${count} related updates)` : `${update.vendor}: ${update.title}`,
    `${update.severity.toUpperCase()} · ${update.release_class} · score ${update.signal_score}`,
    update.recommended_action,
    update.source_detail_url,
    update.version_watch_url,
  ].join("\n");
}

function isPublicUpdate(value: PublicUpdate | PublicUpdateCluster | NotificationSubject): value is PublicUpdate {
  return "published_at" in value;
}

function isPublicCluster(value: PublicUpdate | PublicUpdateCluster | NotificationSubject): value is PublicUpdateCluster {
  return "latest_published_at" in value && "updates" in value;
}

function normalizeSubject(subject: PublicUpdate | PublicUpdateCluster | NotificationSubject): NotificationSubject {
  if ("update" in subject && subject.kind === "update") return subject;
  if ("cluster" in subject && subject.kind === "cluster") return subject;
  if (isPublicUpdate(subject)) return { kind: "update", update: subject };
  if (isPublicCluster(subject)) return { kind: "cluster", cluster: subject };
  return subject;
}

function primaryUpdate(subject: NotificationSubject) {
  return subject.kind === "update" ? subject.update : subject.cluster.updates[0]!;
}

function subjectUpdates(subject: NotificationSubject) {
  return subject.kind === "update" ? [subject.update] : subject.cluster.updates;
}

function subjectKind(subject: NotificationSubject) {
  return subject.kind === "update" ? "update" : subject.cluster.kind;
}

function subjectId(subject: NotificationSubject) {
  return subject.kind === "update" ? subject.update.id : subject.cluster.id;
}

function freshnessCaveat(status: string | null) {
  if (status && status !== "healthy") {
    return `Version Watch status is ${status}; mention possible incomplete coverage before treating this alert as complete.`;
  }

  return "Check status_url before release gates, incident reviews, or other high-confidence operational decisions.";
}

export function buildCanonicalNotificationPayload(
  watchlist: WatchlistConfig,
  rawSubject: PublicUpdate | PublicUpdateCluster | NotificationSubject,
  options: BuildNotificationOptions = {},
): CanonicalNotificationPayload {
  const subject = normalizeSubject(rawSubject);
  const update = primaryUpdate(subject);
  const updates = subjectUpdates(subject);
  const kind = subjectKind(subject);
  const notificationId = subjectId(subject);
  const statusUrl = options.statusUrl ?? "https://versionwatch.dev/api/v1/status";

  return {
    schema_version: "2026-04-26",
    generated_at: options.generatedAt ?? new Date().toISOString(),
    notification_id: notificationId,
    dedupe_key: notificationId,
    kind,
    title: subject.kind === "update" ? `${update.vendor}: ${update.title}` : subject.cluster.title,
    summary: subject.kind === "update" ? update.summary : subject.cluster.summary,
    recommended_action: update.recommended_action,
    severity: subject.kind === "update" ? update.severity : subject.cluster.severity,
    release_class: subject.kind === "update" ? update.release_class : subject.cluster.release_class,
    signal_score: subject.kind === "update" ? update.signal_score : subject.cluster.signal_score,
    status_url: statusUrl,
    freshness: {
      status_url: statusUrl,
      status: options.freshnessStatus ?? null,
      caveat: freshnessCaveat(options.freshnessStatus ?? null),
    },
    watchlist: {
      id: watchlist.id,
      name: watchlist.name,
      description: watchlist.description ?? null,
      delivery_mode: getWatchlistDeliveryMode(watchlist),
      filters: {
        vendor_slugs: watchlist.vendor_slugs,
        severities: watchlist.severities,
        audiences: watchlist.audiences,
        tags: watchlist.tags,
        release_classes: watchlist.release_classes,
        min_signal_score: watchlist.min_signal_score ?? null,
        include_low_confidence: watchlist.include_low_confidence ?? true,
      },
    },
    match: {
      matched_update_ids: updates.map((item) => item.id),
      matched_count: updates.length,
    },
    update,
    updates,
    cluster:
      subject.kind === "cluster"
        ? {
            id: subject.cluster.id,
            kind: subject.cluster.kind,
            update_count: subject.cluster.update_count,
            latest_published_at: subject.cluster.latest_published_at,
            earliest_published_at: subject.cluster.earliest_published_at,
          }
        : null,
    source_detail_url: update.source_detail_url,
    source_surface_url: update.source_surface_url,
    source_surface_name: update.source_surface_name,
    source_surface_type: update.source_surface_type,
    version_watch_url: update.version_watch_url,
  };
}

export function getNotificationDeliveryRecordIds(notification: CanonicalNotificationPayload) {
  return Array.from(new Set([notification.dedupe_key, ...notification.updates.map((update) => update.id)]));
}

export function watchlistDeliveryKey(watchlistId: string, deliveryRecordId: string) {
  return `${watchlistId}:${deliveryRecordId}`;
}

export function notificationAlreadyDelivered(
  watchlistId: string,
  notification: CanonicalNotificationPayload,
  deliveredKeys: Set<string>,
) {
  const notificationKey = watchlistDeliveryKey(watchlistId, notification.dedupe_key);
  const allUpdatesDelivered = notification.updates.every((update) =>
    deliveredKeys.has(watchlistDeliveryKey(watchlistId, update.id)),
  );

  return deliveredKeys.has(notificationKey) || allUpdatesDelivered;
}

export function undeliveredNotificationRecordIds(
  watchlistId: string,
  notification: CanonicalNotificationPayload,
  deliveredKeys: Set<string>,
) {
  return getNotificationDeliveryRecordIds(notification).filter(
    (recordId) => !deliveredKeys.has(watchlistDeliveryKey(watchlistId, recordId)),
  );
}

function markdownNotification(notification: CanonicalNotificationPayload) {
  return [
    `## ${notification.title}`,
    "",
    `- Watchlist: ${notification.watchlist.name}`,
    `- Severity: ${notification.severity}`,
    `- Release class: ${notification.release_class}`,
    `- Signal score: ${notification.signal_score}`,
    `- Updates: ${notification.match.matched_count}`,
    `- Summary: ${notification.summary}`,
    `- Recommended action: ${notification.recommended_action}`,
    `- Official detail: ${notification.source_detail_url}`,
    `- Tracked source: ${notification.source_surface_name} (${notification.source_surface_type}) ${notification.source_surface_url}`,
    `- Version Watch: ${notification.version_watch_url}`,
    `- Freshness: ${notification.freshness.caveat}`,
  ].join("\n");
}

export function renderNotificationPayload(
  format: NotificationRenderFormat,
  notification: CanonicalNotificationPayload,
) {
  if (format === "discord") {
    return {
      content: `Version Watch matched ${notification.watchlist.name}`,
      embeds: [
        {
          title: truncate(notification.title, 256),
          url: notification.version_watch_url,
          description: truncate(notification.recommended_action, 350),
          fields: [
            { name: "Severity", value: notification.severity, inline: true },
            { name: "Release class", value: notification.release_class, inline: true },
            { name: "Signal", value: String(notification.signal_score), inline: true },
            { name: "Updates", value: String(notification.match.matched_count), inline: true },
            { name: "Official detail", value: truncate(notification.source_detail_url, 1024), inline: false },
            { name: "Freshness", value: truncate(notification.freshness.caveat, 1024), inline: false },
          ],
        },
      ],
    };
  }

  if (format === "slack") {
    return {
      text: compactUpdateText(notification.update, notification.match.matched_count),
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${notification.title}*\n${notification.recommended_action}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `${notification.severity} · ${notification.release_class} · score ${notification.signal_score} · ${notification.match.matched_count} update(s) · <${notification.version_watch_url}|Version Watch> · <${notification.source_detail_url}|Official detail>`,
            },
            {
              type: "mrkdwn",
              text: notification.freshness.caveat,
            },
          ],
        },
      ],
    };
  }

  if (format === "teams") {
    return {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      summary: notification.title,
      title: notification.title,
      text: notification.recommended_action,
      sections: [
        {
          facts: [
            { name: "Watchlist", value: notification.watchlist.name },
            { name: "Severity", value: notification.severity },
            { name: "Release class", value: notification.release_class },
            { name: "Signal", value: String(notification.signal_score) },
            { name: "Updates", value: String(notification.match.matched_count) },
            { name: "Official detail", value: notification.source_detail_url },
            { name: "Freshness", value: notification.freshness.caveat },
          ],
        },
      ],
      potentialAction: [
        {
          "@type": "OpenUri",
          name: "Open Version Watch",
          targets: [{ os: "default", uri: notification.version_watch_url }],
        },
      ],
    };
  }

  if (format === "markdown") {
    return markdownNotification(notification);
  }

  if (format === "text") {
    return markdownNotification(notification).replace(/^## /gm, "").replace(/^- /gm, "");
  }

  if (format === "email") {
    return {
      subject: `Version Watch: ${notification.title}`,
      text: markdownNotification(notification).replace(/^## /gm, "").replace(/^- /gm, ""),
      markdown: markdownNotification(notification),
    };
  }

  return notification;
}

export function buildWebhookPayload(
  watchlist: WatchlistConfig,
  subject: PublicUpdate | PublicUpdateCluster | NotificationSubject,
  options: BuildNotificationOptions = {},
) {
  const notification = buildCanonicalNotificationPayload(watchlist, subject, options);
  return renderNotificationPayload(watchlist.webhook_type, notification);
}
