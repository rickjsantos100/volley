import "server-only";

import webPush, {
  WebPushError,
  type PushSubscription as WebPushSubscription,
} from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushNotificationKind =
  | "admin_added_to_game"
  | "game_cancelled"
  | "game_deleted"
  | "game_reminder_4h"
  | "game_uncancelled"
  | "game_updated"
  | "payment_proof_requested"
  | "waitlist_promoted";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  expiration_time: string | null;
  p256dh: string;
  auth: string;
};

type PushOutboxRow = {
  id: string;
  attempts: number;
  payload: PushPayload;
  user_id: string;
};

type GameNotificationAudience = {
  gameId: string;
  recipients: {
    participantId: string;
    userId: string;
  }[];
};

type GameAudienceRow = {
  game_event_id: string;
  id: string;
  user_id: string;
};

let webPushConfigured = false;

function configureWebPush() {
  if (webPushConfigured) {
    return;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Missing Web Push environment variables: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT must be set.",
    );
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  webPushConfigured = true;
}

function toWebPushSubscription(
  subscription: PushSubscriptionRow,
): WebPushSubscription {
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expiration_time
      ? new Date(subscription.expiration_time).getTime()
      : null,
    keys: {
      auth: subscription.auth,
      p256dh: subscription.p256dh,
    },
  };
}

function getPushErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown push error";
}

function isExpiredSubscriptionError(error: unknown) {
  return (
    error instanceof WebPushError &&
    (error.statusCode === 404 || error.statusCode === 410)
  );
}

export async function enqueueNotification({
  dedupeKey,
  gameEventId,
  kind,
  payload,
  userId,
}: {
  dedupeKey?: string;
  gameEventId?: string;
  kind: PushNotificationKind;
  payload: PushPayload;
  userId: string;
}) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("push_notification_outbox")
    .upsert(
      {
        dedupe_key: dedupeKey ?? null,
        game_event_id: gameEventId ?? null,
        kind,
        payload,
        status: "pending",
        user_id: userId,
      },
      dedupeKey ? { onConflict: "dedupe_key", ignoreDuplicates: true } : {},
    )
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  if (data) {
    return data.id;
  }

  if (dedupeKey) {
    const { data: existing, error: existingError } = await supabase
      .from("push_notification_outbox")
      .select("id")
      .eq("dedupe_key", dedupeKey)
      .single<{ id: string }>();

    if (existingError) {
      throw existingError;
    }

    return existing.id;
  }

  throw new Error("Push notification was not queued.");
}

export async function getGameParticipantAudiences(
  gameIds: string[],
): Promise<GameNotificationAudience[]> {
  if (gameIds.length === 0) {
    return [];
  }

  const supabase = createAdminClient();
  const audienceByGameId = new Map<
    string,
    Map<string, { participantId: string; userId: string }>
  >();

  for (const gameId of gameIds) {
    audienceByGameId.set(gameId, new Map());
  }

  const { data: participants, error: participantsError } = await supabase
    .from("game_participants")
    .select("id, game_event_id, user_id")
    .in("game_event_id", gameIds)
    .returns<GameAudienceRow[]>();

  if (participantsError) {
    throw participantsError;
  }

  for (const row of participants ?? []) {
    audienceByGameId.get(row.game_event_id)?.set(row.user_id, {
      participantId: row.id,
      userId: row.user_id,
    });
  }

  return [...audienceByGameId.entries()].map(([gameId, recipients]) => ({
    gameId,
    recipients: [...recipients.values()],
  }));
}

export async function processPendingNotifications(
  limit = 25,
  notificationIds?: string[],
) {
  const supabase = createAdminClient();
  let query = supabase
    .from("push_notification_outbox")
    .select("id, attempts, payload, user_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (notificationIds) {
    if (notificationIds.length === 0) {
      return { failed: 0, sent: 0, skipped: 0 };
    }
    query = query.in("id", notificationIds);
  }

  const { data: notifications, error } =
    await query.returns<PushOutboxRow[]>();

  if (error) {
    throw error;
  }

  const results = {
    failed: 0,
    sent: 0,
    skipped: 0,
  };

  for (const notification of notifications ?? []) {
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, expiration_time, p256dh, auth")
      .eq("user_id", notification.user_id)
      .returns<PushSubscriptionRow[]>();

    if (subscriptionsError) {
      await supabase
        .from("push_notification_outbox")
        .update({
          attempts: notification.attempts + 1,
          last_error: subscriptionsError.message,
          status: "failed",
        })
        .eq("id", notification.id);
      results.failed += 1;
      continue;
    }

    if (!subscriptions || subscriptions.length === 0) {
      await supabase
        .from("push_notification_outbox")
        .update({
          attempts: notification.attempts + 1,
          last_error: "No push subscriptions for user.",
          status: "skipped",
        })
        .eq("id", notification.id);
      results.skipped += 1;
      continue;
    }

    configureWebPush();
    let sentCount = 0;
    const errors: string[] = [];
    const payload = JSON.stringify(notification.payload);

    for (const subscription of subscriptions) {
      try {
        await webPush.sendNotification(
          toWebPushSubscription(subscription),
          payload,
          {
            TTL: 60 * 60 * 6,
            urgency: "normal",
          },
        );
        sentCount += 1;
      } catch (error) {
        errors.push(getPushErrorMessage(error));

        if (isExpiredSubscriptionError(error)) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        }
      }
    }

    if (sentCount > 0) {
      await supabase
        .from("push_notification_outbox")
        .update({
          attempts: notification.attempts + 1,
          last_error: errors.length > 0 ? errors.join("; ") : null,
          sent_at: new Date().toISOString(),
          status: "sent",
        })
        .eq("id", notification.id);
      results.sent += 1;
    } else {
      await supabase
        .from("push_notification_outbox")
        .update({
          attempts: notification.attempts + 1,
          last_error: errors.join("; ") || "No subscriptions accepted push.",
          status: "failed",
        })
        .eq("id", notification.id);
      results.failed += 1;
    }
  }

  return results;
}
