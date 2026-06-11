"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

function getRecurrenceScope(formData: FormData): RecurrenceScope {
  return formData.get("scope") === "series" ? "series" : "occurrence";
}

async function getUserRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { role: null, supabase, user };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: "user" | "admin" }>();

  return { role: profile?.role ?? null, supabase, user };
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  redirect("/dashboard");
}
