import { fetchMutation, fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";

import { api } from "../../../../../../convex/_generated/api";
import { getPublicBaseUrl, serializePublicUpdate } from "@/lib/agent-feed";
import { clusterChangeEvents } from "@/lib/change-clusters";
import { comparePublicClusters, serializePublicCluster } from "@/lib/public-clusters";
import { getAllPublicEvents } from "@/lib/site-data";
import {
  buildCanonicalNotificationPayload,
  getWatchlistDeliveryMode,
  notificationAlreadyDelivered,
  renderNotificationPayload,
  undeliveredNotificationRecordIds,
  watchlistDeliveryKey,
  watchlistMatchesUpdate,
  type NotificationSubject,
  type WatchlistConfig,
} from "@/lib/watchlist-delivery";

const convexApi = api as any;

function getAdminSecret(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer || request.headers.get("x-admin-secret")?.trim() || undefined;
}

function requireAdminSecret(request: Request) {
  const expectedSecret = process.env.ADMIN_SECRET;
  const suppliedSecret = getAdminSecret(request);
  return Boolean(expectedSecret && suppliedSecret === expectedSecret);
}

async function readBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function postWebhook(watchlist: WatchlistConfig, payload: unknown) {
  if (!watchlist.webhook_url) {
    return { ok: false, status: 0, error: "Webhook URL is not configured." };
  }

  try {
    const response = await fetch(watchlist.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return {
      ok: response.ok,
      status: response.status,
      error: response.ok ? undefined : `Webhook returned ${response.status}.`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Webhook request failed.",
    };
  }
}

export async function POST(request: Request) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = await readBody(request);
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const dryRun = payload.dry_run === true || payload.dryRun === true;
  const limit = Math.max(1, Math.min(typeof payload.limit === "number" ? Math.trunc(payload.limit) : 10, 50));
  const watchlistId = typeof payload.watchlist_id === "string" ? payload.watchlist_id : undefined;
  const deliveryModeOverride =
    payload.delivery_mode === "raw" || payload.deliveryMode === "raw"
      ? "raw"
      : payload.delivery_mode === "clustered" || payload.deliveryMode === "clustered"
        ? "clustered"
        : undefined;
  const adminSecret = process.env.ADMIN_SECRET!;

  try {
    const [state, events] = await Promise.all([
      fetchQuery(convexApi.watchlists.dispatchState, {
        adminSecret,
        watchlistId,
      }),
      getAllPublicEvents(),
    ]);
    const baseUrl = getPublicBaseUrl(request.url);
    const delivered = new Set<string>(
      state.deliveries.map((delivery: any) => `${String(delivery.watchlist_id)}:${delivery.event_slug}`),
    );
    const results = [];

    for (const watchlist of state.watchlists as WatchlistConfig[]) {
      const configuredWatchlist = {
        ...watchlist,
        delivery_mode: deliveryModeOverride ?? getWatchlistDeliveryMode(watchlist),
      } satisfies WatchlistConfig;
      const deliveryMode = getWatchlistDeliveryMode(configuredWatchlist);
      const matchingEvents = events.filter((event) => {
        return watchlistMatchesUpdate(configuredWatchlist, serializePublicUpdate(event, baseUrl));
      });
      const subjects: NotificationSubject[] =
        deliveryMode === "raw"
          ? matchingEvents.map((event) => ({ kind: "update", update: serializePublicUpdate(event, baseUrl) }))
          : clusterChangeEvents(matchingEvents, { minClusterSize: 2, windowHours: 24 })
              .sort(comparePublicClusters)
              .map((cluster) => ({ kind: "cluster", cluster: serializePublicCluster(cluster, baseUrl) }));

      for (const subject of subjects) {
        if (results.length >= limit) break;
        const notification = buildCanonicalNotificationPayload(configuredWatchlist, subject, {
          statusUrl: new URL("/api/v1/status", baseUrl).toString(),
        });
        if (notificationAlreadyDelivered(configuredWatchlist.id, notification, delivered)) continue;

        const webhookPayload = renderNotificationPayload(configuredWatchlist.webhook_type, notification);
        if (dryRun) {
          results.push({
            watchlist_id: configuredWatchlist.id,
            watchlist: configuredWatchlist.name,
            notification_id: notification.notification_id,
            notification_kind: notification.kind,
            update_ids: notification.updates.map((update) => update.id),
            delivery_mode: deliveryMode,
            dry_run: true,
            matched: true,
          });
          continue;
        }

        const response = await postWebhook(configuredWatchlist, webhookPayload);
        const idsToRecord = response.ok
          ? undeliveredNotificationRecordIds(configuredWatchlist.id, notification, delivered)
          : [notification.dedupe_key];

        for (const eventSlug of idsToRecord) {
          await fetchMutation(convexApi.watchlists.recordDelivery, {
            adminSecret,
            watchlistId: configuredWatchlist.id,
            eventSlug,
            status: response.ok ? "sent" : "failure",
            responseStatus: response.status,
            errorMessage: response.error,
          });

          if (response.ok) {
            delivered.add(watchlistDeliveryKey(configuredWatchlist.id, eventSlug));
          }
        }

        results.push({
          watchlist_id: configuredWatchlist.id,
          watchlist: configuredWatchlist.name,
          notification_id: notification.notification_id,
          notification_kind: notification.kind,
          update_ids: notification.updates.map((update) => update.id),
          delivery_mode: deliveryMode,
          sent: response.ok,
          response_status: response.status,
          error: response.error ?? null,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      dry_run: dryRun,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Could not dispatch watchlists", error);
    return NextResponse.json({ ok: false, error: "Watchlists could not be dispatched." }, { status: 500 });
  }
}
