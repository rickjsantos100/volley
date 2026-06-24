"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import {
  enqueueNotification,
  enqueueGameLifecycleNotifications,
  getGameNotificationAudiences,
  processPendingNotifications,
} from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

export type GameActionStatus =
  | "joined-game"
  | "joined-waitlist"
  | "left-game"
  | "cancelled-game"
  | "cancelled-series"
  | "uncancelled-game"
  | "payment-updated"
  | "removed-player"
  | "join-error"
  | "waitlist-error"
  | "waitlist-reorder-error"
  | "leave-error"
  | "remove-player-error"
  | "cancel-error"
  | "delete-error"
  | "payment-error"
  | "not-authorized";

export type GameActionState = {
  status?: GameActionStatus;
};

type AdminGameRow = {
  id: string;
  starts_at: string;
  recurring_series_id: string | null;
  recurring_starts_at: string | null;
};

type RecurrenceScope = "occurrence" | "series";

type ParticipantPaymentRow = {
  id: string;
  payment_status: "paid" | "unpaid" | null;
  user_id: string;
};

type GameIdRow = {
  id: string;
};

function getRecurrenceScope(formData: FormData): RecurrenceScope {
  return formData.get("scope") === "series" ? "series" : "occurrence";
}

async function getUserRole() {
  const [supabase, user, profile] = await Promise.all([
    createClient(),
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  return { role: profile?.role ?? null, supabase, user };
}

async function processNotificationsAfterMutation() {
  try {
    await processPendingNotifications();
  } catch (error) {
    console.error("Failed to process push notifications", error);
  }
}

async function notifyGameLifecycleChange({
  gameIds,
  includeGameEventId = true,
  kind,
  preparedAudiences,
}: {
  gameIds: string[];
  includeGameEventId?: boolean;
  kind: "game_cancelled" | "game_deleted";
  preparedAudiences?: Awaited<ReturnType<typeof getGameNotificationAudiences>>;
}) {
  try {
    const audiences =
      preparedAudiences ?? (await getGameNotificationAudiences(gameIds));
    await enqueueGameLifecycleNotifications({
      audiences,
      includeGameEventId,
      kind,
    });
    await processPendingNotifications();
  } catch (error) {
    console.error("Failed to send game lifecycle push notifications", error);
  }
}

async function getAdminGame(gameId: string) {
  const { role, supabase, user } = await getUserRole();

  if (!user) {
    redirect("/");
  }

  if (role !== "admin") {
    return { game: null, supabase, status: "not-authorized" as const, user };
  }

  const { data: game, error } = await supabase
    .from("game_events")
    .select("id, starts_at, recurring_series_id, recurring_starts_at")
    .eq("id", gameId)
    .maybeSingle<AdminGameRow>();

  if (error || !game) {
    return { game: null, supabase, status: "delete-error" as const, user };
  }

  return { game, supabase, status: null, user };
}

export async function joinGame(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const [supabase, user] = await Promise.all([
    createClient(),
    getCurrentUser(),
  ]);

  if (!user) {
    redirect("/");
  }

  const { error } = await supabase.from("game_participants").insert({
    game_event_id: gameId,
    user_id: user.id,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "join-error" };
  }

  return { status: "joined-game" };
}

export async function joinWaitlist(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const [supabase, user] = await Promise.all([
    createClient(),
    getCurrentUser(),
  ]);

  if (!user) {
    redirect("/");
  }

  const { error } = await supabase.from("game_waitlist_entries").insert({
    game_event_id: gameId,
    user_id: user.id,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "waitlist-error" };
  }

  return { status: "joined-waitlist" };
}

export async function leaveGame(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const [supabase, user] = await Promise.all([
    createClient(),
    getCurrentUser(),
  ]);

  if (!user) {
    redirect("/");
  }

  const { error } = await supabase
    .from("game_participants")
    .delete()
    .eq("game_event_id", gameId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "leave-error" };
  }

  await processNotificationsAfterMutation();

  return { status: "left-game" };
}

export async function updateParticipantPaymentStatus(
  gameId: string,
  participantId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const { role, supabase, user } = await getUserRole();

  if (!user) {
    redirect("/");
  }

  if (role !== "admin") {
    return { status: "not-authorized" };
  }

  const paymentStatus =
    formData.get("paymentStatus") === "paid" ? "paid" : "unpaid";
  const { data: participantBeforeUpdate } = await supabase
    .from("game_participants")
    .select("id, user_id, payment_status")
    .eq("id", participantId)
    .eq("game_event_id", gameId)
    .maybeSingle<ParticipantPaymentRow>();

  const { error } = await supabase
    .from("game_participants")
    .update({
      payment_status: paymentStatus,
      payment_updated_at: new Date().toISOString(),
      payment_updated_by: user.id,
    })
    .eq("id", participantId)
    .eq("game_event_id", gameId);

  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "payment-error" };
  }

  if (
    paymentStatus === "paid" &&
    participantBeforeUpdate &&
    participantBeforeUpdate.payment_status !== "paid"
  ) {
    try {
      await enqueueNotification({
        dedupeKey: `payment_marked_paid:${gameId}:${participantBeforeUpdate.user_id}`,
        gameEventId: gameId,
        kind: "payment_marked_paid",
        payload: {
          body: "Já estás marcado como pago para o jogo.",
          tag: `payment-paid-${gameId}`,
          title: "Pagamento confirmado",
          url: `/dashboard/games/${gameId}`,
        },
        userId: participantBeforeUpdate.user_id,
      });
      await processPendingNotifications();
    } catch (notificationError) {
      console.error(
        "Failed to send payment push notification",
        notificationError,
      );
    }
  }

  return { status: "payment-updated" };
}

export async function reorderWaitlist(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;

  const { role, supabase, user } = await getUserRole();

  if (!user) {
    redirect("/");
  }

  if (role !== "admin") {
    return { status: "not-authorized" };
  }

  const rawEntryIds = formData.get("orderedEntryIds");
  let orderedEntryIds: string[] = [];

  if (typeof rawEntryIds === "string") {
    try {
      const parsedEntryIds = JSON.parse(rawEntryIds) as unknown;
      if (Array.isArray(parsedEntryIds)) {
        orderedEntryIds = parsedEntryIds.filter(
          (entryId): entryId is string => typeof entryId === "string",
        );
      }
    } catch {
      orderedEntryIds = [];
    }
  }

  if (orderedEntryIds.length === 0) {
    return { status: "waitlist-reorder-error" };
  }

  const { error } = await supabase.rpc("reorder_game_waitlist", {
    ordered_entry_ids: orderedEntryIds,
    target_game_id: gameId,
  });

  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "waitlist-reorder-error" };
  }

  return {};
}

export async function removeParticipantFromGame(
  gameId: string,
  participantId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const { role, supabase, user } = await getUserRole();

  if (!user) {
    redirect("/");
  }

  if (role !== "admin") {
    return { status: "not-authorized" };
  }

  const { error } = await supabase
    .from("game_participants")
    .delete()
    .eq("id", participantId)
    .eq("game_event_id", gameId);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "remove-player-error" };
  }

  await processNotificationsAfterMutation();

  return { status: "removed-player" };
}

export async function removeWaitlistEntryFromGame(
  gameId: string,
  waitlistEntryId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const { role, supabase, user } = await getUserRole();

  if (!user) {
    redirect("/");
  }

  if (role !== "admin") {
    return { status: "not-authorized" };
  }

  const { error } = await supabase
    .from("game_waitlist_entries")
    .delete()
    .eq("id", waitlistEntryId)
    .eq("game_event_id", gameId);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "remove-player-error" };
  }

  return { status: "removed-player" };
}

export async function cancelGame(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;

  const { game, supabase, status } = await getAdminGame(gameId);

  if (status) {
    return { status: status === "delete-error" ? "cancel-error" : status };
  }

  const scope = getRecurrenceScope(formData);
  const isSeriesAction =
    scope === "series" && game.recurring_series_id && game.recurring_starts_at;

  let affectedGameIds = [game.id];

  if (isSeriesAction) {
    const { data: affectedGames, error: affectedGamesError } = await supabase
      .from("game_events")
      .select("id")
      .eq("recurring_series_id", game.recurring_series_id)
      .gte("recurring_starts_at", game.recurring_starts_at)
      .eq("status", "scheduled")
      .returns<GameIdRow[]>();

    if (affectedGamesError) {
      return { status: "cancel-error" };
    }

    affectedGameIds = (affectedGames ?? []).map(
      (affectedGame) => affectedGame.id,
    );
  }

  const { error } = isSeriesAction
    ? await supabase
        .from("game_events")
        .update({ status: "cancelled" })
        .eq("recurring_series_id", game.recurring_series_id)
        .gte("recurring_starts_at", game.recurring_starts_at)
        .eq("status", "scheduled")
    : await supabase
        .from("game_events")
        .update({ status: "cancelled" })
        .eq("id", gameId);

  if (!error && isSeriesAction) {
    const { error: seriesError } = await supabase
      .from("recurring_game_series")
      .update({ active: false })
      .eq("id", game.recurring_series_id);

    if (seriesError) {
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/games/${gameId}`);
      return { status: "cancel-error" };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "cancel-error" };
  }

  await notifyGameLifecycleChange({
    gameIds: affectedGameIds,
    kind: "game_cancelled",
  });

  return { status: isSeriesAction ? "cancelled-series" : "cancelled-game" };
}

export async function uncancelGame(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const { game, supabase, status } = await getAdminGame(gameId);

  if (status) {
    return { status: status === "delete-error" ? "cancel-error" : status };
  }

  const { error } = await supabase
    .from("game_events")
    .update({ status: "scheduled" })
    .eq("id", game.id)
    .eq("status", "cancelled");

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "cancel-error" };
  }

  return { status: "uncancelled-game" };
}

export async function deleteGame(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;

  const { game, supabase, status } = await getAdminGame(gameId);

  if (status) {
    return { status };
  }

  const scope = getRecurrenceScope(formData);
  const isRecurringGame = Boolean(
    game.recurring_series_id && game.recurring_starts_at,
  );
  const isSeriesAction = scope === "series" && isRecurringGame;
  let affectedGameIds = [game.id];
  let physicalDeleteAudiences:
    | Awaited<ReturnType<typeof getGameNotificationAudiences>>
    | undefined;

  if (isSeriesAction) {
    const { data: affectedGames, error: affectedGamesError } = await supabase
      .from("game_events")
      .select("id")
      .eq("recurring_series_id", game.recurring_series_id)
      .gte("recurring_starts_at", game.recurring_starts_at)
      .neq("status", "deleted")
      .returns<GameIdRow[]>();

    if (affectedGamesError) {
      return { status: "delete-error" };
    }

    affectedGameIds = (affectedGames ?? []).map(
      (affectedGame) => affectedGame.id,
    );
  } else if (!isRecurringGame) {
    try {
      physicalDeleteAudiences = await getGameNotificationAudiences([game.id]);
    } catch (error) {
      console.error("Failed to prepare game delete push notifications", error);
    }
  }

  if (isSeriesAction) {
    const { error: seriesError } = await supabase
      .from("recurring_game_series")
      .update({ active: false })
      .eq("id", game.recurring_series_id);

    if (seriesError) {
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/games/${gameId}`);
      return { status: "delete-error" };
    }
  }

  const { error } = isSeriesAction
    ? await supabase
        .from("game_events")
        .update({ status: "deleted" })
        .eq("recurring_series_id", game.recurring_series_id)
        .gte("recurring_starts_at", game.recurring_starts_at)
    : isRecurringGame
      ? await supabase
          .from("game_events")
          .update({ status: "deleted" })
          .eq("id", gameId)
      : await supabase.from("game_events").delete().eq("id", gameId);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "delete-error" };
  }

  await notifyGameLifecycleChange({
    gameIds: affectedGameIds,
    includeGameEventId: isRecurringGame,
    kind: "game_deleted",
    preparedAudiences: physicalDeleteAudiences,
  });

  redirect("/dashboard");
}
