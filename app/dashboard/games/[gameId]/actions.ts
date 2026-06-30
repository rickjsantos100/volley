"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import {
  dispatchGameNotification,
  type GameNotificationKind,
} from "@/lib/notifications/game";
import { getGameParticipantAudiences } from "@/lib/notifications/push";
import { getPaymentProofRequestAvailableAt } from "@/lib/payment-proof-policy";
import {
  getGamePaymentProofPaths,
  getPaymentProofPath,
  maxPaymentProofBytes,
  paymentProofBucket,
  paymentProofMimeTypes,
  removePaymentProofs,
} from "@/lib/payment-proofs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type GameActionStatus =
  | "added-player"
  | "added-player-email-error"
  | "add-player-error"
  | "joined-game"
  | "joined-waitlist"
  | "left-game"
  | "cancelled-game"
  | "cancelled-series"
  | "uncancelled-game"
  | "edited-game"
  | "edited-series"
  | "edit-error"
  | "edit-not-authorized"
  | "proof-uploaded"
  | "proof-upload-error"
  | "proof-requested"
  | "proof-request-error"
  | "removed-player"
  | "join-error"
  | "waitlist-error"
  | "waitlist-reorder-error"
  | "leave-error"
  | "remove-player-error"
  | "cancel-error"
  | "delete-error"
  | "delivery-warning"
  | "not-authorized";

export type GameActionState = {
  deliveryWarning?: boolean;
  proofRequestedAt?: string;
  status?: GameActionStatus;
};

type AdminGameRow = {
  id: string;
  starts_at: string;
  status: "scheduled" | "cancelled" | "completed" | "deleted";
  updated_at: string;
  recurring_series_id: string | null;
  recurring_starts_at: string | null;
};

type RecurrenceScope = "occurrence" | "series";

type ParticipantProofRow = {
  id: string;
  user_id: string;
};

type PaymentProofRow = {
  proof_path: string | null;
  proof_requested_at: string | null;
};

type GameSnapshot = {
  id: string;
  starts_at: string;
  updated_at: string;
};

type AddPlayerProfileRow = {
  id: string;
};

type AddPlayerGameRow = {
  id: string;
  starts_at: string;
  status: "scheduled" | "cancelled" | "completed" | "deleted";
};

type RemoveParticipantResult = {
  promoted_participant_id: string | null;
  promoted_user_id: string | null;
  removed_user_id: string;
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

function parsePositiveInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseLocalDateTime(value: FormDataEntryValue | null, offset: number) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const utcMilliseconds =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    ) +
    offset * 60 * 1000;
  const date = new Date(utcMilliseconds);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getDurationMinutes(startsAt: Date, endsAt: Date) {
  const durationMilliseconds = endsAt.getTime() - startsAt.getTime();
  const durationMinutes = Math.round(durationMilliseconds / 60000);

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return null;
  }

  return durationMinutes;
}

async function notifyGameLifecycleChange({
  audiences,
  games,
  kind,
}: {
  audiences: Awaited<ReturnType<typeof getGameParticipantAudiences>>;
  games: GameSnapshot[];
  kind: Extract<
    GameNotificationKind,
    "game_cancelled" | "game_deleted" | "game_uncancelled" | "game_updated"
  >;
}) {
  let hasFailures = false;

  for (const game of games) {
    const recipients =
      audiences.find((audience) => audience.gameId === game.id)?.recipients ??
      [];
    try {
      const summary = await dispatchGameNotification({
        deliveryVersion: game.updated_at,
        gameId: game.id,
        kind,
        recipients,
        startsAt: game.starts_at,
      });
      hasFailures ||= summary.hasFailures;
    } catch (error) {
      hasFailures = true;
      console.error("Failed to dispatch game lifecycle notifications", {
        error,
        gameId: game.id,
        kind,
      });
    }
  }

  return hasFailures;
}

async function getGameSnapshots(gameIds: string[]) {
  if (gameIds.length === 0) {
    return [];
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_events")
    .select("id, starts_at, updated_at")
    .in("id", gameIds)
    .returns<GameSnapshot[]>();
  if (error) {
    throw error;
  }
  return data ?? [];
}

async function notifyPromotedPlayer({
  gameId,
  promotedParticipantId,
  promotedUserId,
}: {
  gameId: string;
  promotedParticipantId: string | null;
  promotedUserId: string | null;
}) {
  if (!promotedParticipantId || !promotedUserId) {
    return false;
  }

  try {
    const supabase = createAdminClient();
    const { data: game } = await supabase
      .from("game_events")
      .select("starts_at")
      .eq("id", gameId)
      .single<{ starts_at: string }>();
    if (!game) {
      return true;
    }
    const summary = await dispatchGameNotification({
      deliveryVersion: promotedParticipantId,
      gameId,
      kind: "waitlist_promoted",
      recipients: [
        {
          participantId: promotedParticipantId,
          userId: promotedUserId,
        },
      ],
      startsAt: game.starts_at,
    });
    return summary.hasFailures;
  } catch (error) {
    console.error("Failed to notify promoted waitlist player", error);
    return true;
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
    .select(
      "id, starts_at, status, updated_at, recurring_series_id, recurring_starts_at",
    )
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

export async function addParticipantToGame(
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

  const userId = formData.get("userId");

  if (typeof userId !== "string" || !userId) {
    return { status: "add-player-error" };
  }

  const [
    { data: selectedProfile, error: profileError },
    { data: game, error: gameError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle<AddPlayerProfileRow>(),
    supabase
      .from("game_events")
      .select("id, starts_at, status")
      .eq("id", gameId)
      .maybeSingle<AddPlayerGameRow>(),
  ]);

  if (
    profileError ||
    !selectedProfile ||
    gameError ||
    !game ||
    game.status !== "scheduled" ||
    new Date(game.starts_at).getTime() < Date.now()
  ) {
    return { status: "add-player-error" };
  }

  const { data: participant, error: insertError } = await supabase
    .from("game_participants")
    .insert({
      game_event_id: gameId,
      user_id: selectedProfile.id,
    })
    .select("id")
    .single<{ id: string }>();

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (insertError || !participant) {
    return { status: "add-player-error" };
  }

  let deliveryWarning = false;
  try {
    const summary = await dispatchGameNotification({
      deliveryVersion: participant.id,
      gameId,
      kind: "admin_added_to_game",
      recipients: [
        {
          participantId: participant.id,
          userId: selectedProfile.id,
        },
      ],
      startsAt: game.starts_at,
    });
    deliveryWarning = summary.hasFailures;
  } catch (notificationError) {
    deliveryWarning = true;
    console.error("Failed to notify admin-added participant", {
      gameId,
      notificationError,
      participantId: participant.id,
      userId: selectedProfile.id,
    });
  }

  return { deliveryWarning, status: "added-player" };
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

  const { data: removal, error } = await supabase
    .rpc("remove_game_participant", {
      target_game_id: gameId,
      target_participant_id: null,
    })
    .single<RemoveParticipantResult>();

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "leave-error" };
  }

  try {
    await removePaymentProofs([getPaymentProofPath(gameId, user.id)]);
  } catch (proofError) {
    console.error("Failed to delete payment proof after leaving game", {
      gameId,
      proofError,
      userId: user.id,
    });
  }

  const deliveryWarning = removal
    ? await notifyPromotedPlayer({
        gameId,
        promotedParticipantId: removal.promoted_participant_id,
        promotedUserId: removal.promoted_user_id,
      })
    : false;

  return { deliveryWarning, status: "left-game" };
}

export async function finalizePaymentProof(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;

  const [supabase, user] = await Promise.all([
    createClient(),
    getCurrentUser(),
  ]);

  if (!user) {
    redirect("/");
  }

  const filename = formData.get("filename");
  const mimeType = formData.get("mimeType");

  if (
    typeof filename !== "string" ||
    !filename.trim() ||
    filename.length > 255 ||
    typeof mimeType !== "string" ||
    !paymentProofMimeTypes.has(mimeType)
  ) {
    return { status: "proof-upload-error" };
  }

  const [{ data: participant }, { data: game }] = await Promise.all([
    supabase
      .from("game_participants")
      .select("id")
      .eq("game_event_id", gameId)
      .eq("user_id", user.id)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("game_events")
      .select("id, starts_at, status")
      .eq("id", gameId)
      .eq("status", "scheduled")
      .gte("starts_at", new Date().toISOString())
      .maybeSingle(),
  ]);

  if (!participant || !game) {
    return { status: "proof-upload-error" };
  }

  const proofPath = getPaymentProofPath(gameId, user.id);
  const { data: storedFiles, error: listError } = await supabase.storage
    .from(paymentProofBucket)
    .list(`${gameId}/${user.id}`, {
      limit: 1,
      search: "proof",
    });
  const storedProof = storedFiles?.find((file) => file.name === "proof");
  const storedMimeType =
    typeof storedProof?.metadata?.mimetype === "string"
      ? storedProof.metadata.mimetype
      : null;
  const storedSize =
    typeof storedProof?.metadata?.size === "number"
      ? storedProof.metadata.size
      : null;

  if (
    listError ||
    !storedProof ||
    storedMimeType !== mimeType ||
    storedSize === null ||
    storedSize > maxPaymentProofBytes
  ) {
    return { status: "proof-upload-error" };
  }

  const { data: existingProof } = await supabase
    .from("game_payment_proofs")
    .select("participant_id")
    .eq("participant_id", participant.id)
    .maybeSingle();
  const proofMetadata = {
    proof_filename: filename.trim(),
    proof_mime_type: mimeType,
    proof_path: proofPath,
    proof_uploaded_at: new Date().toISOString(),
  };
  const { error } = existingProof
    ? await supabase
        .from("game_payment_proofs")
        .update(proofMetadata)
        .eq("participant_id", participant.id)
    : await supabase.from("game_payment_proofs").insert({
        ...proofMetadata,
        game_event_id: gameId,
        participant_id: participant.id,
        user_id: user.id,
      });

  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "proof-upload-error" };
  }

  return { status: "proof-uploaded" };
}

export async function requestPaymentProof(
  gameId: string,
  participantId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const { game, status } = await getAdminGame(gameId);

  if (status) {
    return {
      status: status === "not-authorized" ? status : "proof-request-error",
    };
  }

  if (game.status !== "scheduled") {
    return { status: "proof-request-error" };
  }

  const supabase = createAdminClient();
  const { data: participant, error: participantError } = await supabase
    .from("game_participants")
    .select("id, user_id")
    .eq("id", participantId)
    .eq("game_event_id", gameId)
    .maybeSingle<ParticipantProofRow>();

  if (participantError || !participant) {
    return { status: "proof-request-error" };
  }

  const { data: proof, error: proofError } = await supabase
    .from("game_payment_proofs")
    .select("proof_path, proof_requested_at")
    .eq("participant_id", participant.id)
    .maybeSingle<PaymentProofRow>();

  if (proofError || proof?.proof_path) {
    return { status: "proof-request-error" };
  }

  const requestAvailableAt = getPaymentProofRequestAvailableAt(
    proof?.proof_requested_at,
  );

  if (requestAvailableAt && requestAvailableAt > Date.now()) {
    return {
      proofRequestedAt: proof?.proof_requested_at ?? undefined,
      status: "proof-requested",
    };
  }

  const proofRequestedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("game_payment_proofs")
    .upsert(
      {
        game_event_id: gameId,
        participant_id: participant.id,
        proof_requested_at: proofRequestedAt,
        user_id: participant.user_id,
      },
      { onConflict: "participant_id" },
    );

  if (updateError) {
    return { status: "proof-request-error" };
  }

  revalidatePath(`/dashboard/games/${gameId}`);

  let deliveryWarning = false;
  try {
    const summary = await dispatchGameNotification({
      deliveryVersion: proofRequestedAt,
      gameId,
      kind: "payment_proof_requested",
      recipients: [
        {
          participantId: participant.id,
          userId: participant.user_id,
        },
      ],
      startsAt: game.starts_at,
    });
    deliveryWarning = summary.hasFailures;
  } catch (notificationError) {
    deliveryWarning = true;
    console.error("Failed to send payment proof request notifications", {
      gameId,
      notificationError,
      participantId,
    });
  }

  return {
    deliveryWarning,
    proofRequestedAt,
    status: "proof-requested",
  };
}

export async function reorderWaitlist(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;

  const { game, supabase, status } = await getAdminGame(gameId);

  if (status) {
    return {
      status: status === "not-authorized" ? status : "waitlist-reorder-error",
    };
  }

  if (game.status !== "scheduled") {
    return { status: "waitlist-reorder-error" };
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

  const { game, supabase, status } = await getAdminGame(gameId);

  if (status) {
    return {
      status: status === "not-authorized" ? status : "remove-player-error",
    };
  }

  if (game.status !== "scheduled") {
    return { status: "remove-player-error" };
  }

  const { data: removal, error } = await supabase
    .rpc("remove_game_participant", {
      target_game_id: gameId,
      target_participant_id: participantId,
    })
    .single<RemoveParticipantResult>();

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "remove-player-error" };
  }

  if (removal) {
    try {
      await removePaymentProofs([
        getPaymentProofPath(gameId, removal.removed_user_id),
      ]);
    } catch (proofError) {
      console.error("Failed to delete removed participant payment proof", {
        gameId,
        proofError,
        userId: removal.removed_user_id,
      });
    }
  }

  const deliveryWarning = removal
    ? await notifyPromotedPlayer({
        gameId,
        promotedParticipantId: removal.promoted_participant_id,
        promotedUserId: removal.promoted_user_id,
      })
    : false;

  return { deliveryWarning, status: "removed-player" };
}

export async function removeWaitlistEntryFromGame(
  gameId: string,
  waitlistEntryId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const { game, supabase, status } = await getAdminGame(gameId);

  if (status) {
    return {
      status: status === "not-authorized" ? status : "remove-player-error",
    };
  }

  if (game.status !== "scheduled") {
    return { status: "remove-player-error" };
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

  if (game.status !== "scheduled") {
    return { status: "cancel-error" };
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
      .returns<{ id: string }[]>();

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

  let deliveryWarning = false;
  try {
    const [audiences, games] = await Promise.all([
      getGameParticipantAudiences(affectedGameIds),
      getGameSnapshots(affectedGameIds),
    ]);
    deliveryWarning = await notifyGameLifecycleChange({
      audiences,
      games,
      kind: "game_cancelled",
    });
  } catch (notificationError) {
    deliveryWarning = true;
    console.error("Failed to prepare game cancellation notifications", {
      affectedGameIds,
      notificationError,
    });
  }

  return {
    deliveryWarning,
    status: isSeriesAction ? "cancelled-series" : "cancelled-game",
  };
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

  let audiences:
    | Awaited<ReturnType<typeof getGameParticipantAudiences>>
    | undefined;
  try {
    audiences = await getGameParticipantAudiences([game.id]);
  } catch (notificationError) {
    console.error("Failed to prepare game uncancellation audience", {
      gameId,
      notificationError,
    });
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

  let deliveryWarning = !audiences;
  try {
    if (!audiences) {
      throw new Error("Game uncancellation audience is unavailable.");
    }
    deliveryWarning = await notifyGameLifecycleChange({
      audiences,
      games: await getGameSnapshots([game.id]),
      kind: "game_uncancelled",
    });
  } catch (notificationError) {
    deliveryWarning = true;
    console.error("Failed to send game uncancellation notifications", {
      gameId,
      notificationError,
    });
  }

  return { deliveryWarning, status: "uncancelled-game" };
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
  let paymentProofPaths: string[] = [];

  if (isSeriesAction) {
    const { data: affectedGames, error: affectedGamesError } = await supabase
      .from("game_events")
      .select("id")
      .eq("recurring_series_id", game.recurring_series_id)
      .gte("recurring_starts_at", game.recurring_starts_at)
      .neq("status", "deleted")
      .returns<{ id: string }[]>();

    if (affectedGamesError) {
      return { status: "delete-error" };
    }

    affectedGameIds = (affectedGames ?? []).map(
      (affectedGame) => affectedGame.id,
    );
  }

  let deletionAudiences:
    | Awaited<ReturnType<typeof getGameParticipantAudiences>>
    | undefined;
  let deletionSnapshots: GameSnapshot[] = [];
  try {
    [deletionAudiences, deletionSnapshots] = await Promise.all([
      getGameParticipantAudiences(affectedGameIds),
      getGameSnapshots(affectedGameIds),
    ]);
  } catch (preparationError) {
    console.error(
      "Failed to prepare game deletion notifications",
      preparationError,
    );
  }
  try {
    paymentProofPaths = await getGamePaymentProofPaths(affectedGameIds);
  } catch (proofError) {
    console.error("Failed to prepare game payment proof deletion", proofError);
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

  try {
    await removePaymentProofs(paymentProofPaths);
  } catch (proofError) {
    console.error("Failed to delete game payment proofs", proofError);
  }

  let deliveryWarning = !deletionAudiences;
  if (deletionAudiences) {
    deliveryWarning = await notifyGameLifecycleChange({
      audiences: deletionAudiences,
      games: deletionSnapshots,
      kind: "game_deleted",
    });
  }

  redirect(
    deliveryWarning
      ? "/dashboard?notificationWarning=1"
      : "/dashboard",
  );
}

export async function editGame(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;

  const { game, supabase, status } = await getAdminGame(gameId);
  if (status) {
    return { status: status === "delete-error" ? "edit-error" : status };
  }

  if (game.status !== "scheduled") {
    return { status: "edit-error" };
  }

  const scope = getRecurrenceScope(formData);
  const isRecurringGame = Boolean(game.recurring_series_id && game.recurring_starts_at);
  const isSeriesAction = scope === "series" && isRecurringGame;

  // Parse form fields
  const maxParticipants = parsePositiveInteger(formData.get("maxParticipants"));
  const offset = Number.parseInt(String(formData.get("timezoneOffsetMinutes") ?? "0"), 10);
  const newStartsAt = parseLocalDateTime(formData.get("startsAt"), Number.isFinite(offset) ? offset : 0);
  const newEndsAt = parseLocalDateTime(formData.get("endsAt"), Number.isFinite(offset) ? offset : 0);
  const durationMinutes = newStartsAt && newEndsAt ? getDurationMinutes(newStartsAt, newEndsAt) : null;

  if (!durationMinutes || !maxParticipants || !newStartsAt || !newEndsAt || newStartsAt.getTime() < Date.now()) {
    return { status: "edit-error" };
  }

  const oldStartsAt = new Date(game.starts_at);
  let affectedGameIds = [game.id];

  if (isSeriesAction) {
    // Update the series template
    const delta = newStartsAt.getTime() - oldStartsAt.getTime();
    const { error: seriesError } = await supabase
      .from("recurring_game_series")
      .update({
        duration_minutes: durationMinutes,
        max_participants: maxParticipants,
        starts_at: newStartsAt.toISOString(),
      })
      .eq("id", game.recurring_series_id);

    if (seriesError) {
      return { status: "edit-error" };
    }

    // Get all future occurrences to update
    const { data: affectedGames, error: affectedGamesError } = await supabase
      .from("game_events")
      .select("id, starts_at")
      .eq("recurring_series_id", game.recurring_series_id)
      .gte("recurring_starts_at", game.recurring_starts_at)
      .eq("status", "scheduled")
      .returns<{ id: string; starts_at: string }[]>();

    if (affectedGamesError) {
      return { status: "edit-error" };
    }

    affectedGameIds = (affectedGames ?? []).map((g) => g.id);

    // Update each future game_event - apply the time delta to starts_at
    for (const affectedGame of affectedGames ?? []) {
      const gameStartsAt = new Date(affectedGame.starts_at);
      const updatedStartsAt = new Date(gameStartsAt.getTime() + delta);
      
      const { error: updateError } = await supabase
        .from("game_events")
        .update({
          duration_minutes: durationMinutes,
          max_participants: maxParticipants,
          starts_at: updatedStartsAt.toISOString(),
        })
        .eq("id", affectedGame.id);

      if (updateError) {
        return { status: "edit-error" };
      }
    }
  } else {
    // Update single game
    const { error } = await supabase
      .from("game_events")
      .update({
        duration_minutes: durationMinutes,
        max_participants: maxParticipants,
        starts_at: newStartsAt.toISOString(),
      })
      .eq("id", gameId)
      .eq("status", "scheduled");

    if (error) {
      return { status: "edit-error" };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  let deliveryWarning = false;
  try {
    const [audiences, games] = await Promise.all([
      getGameParticipantAudiences(affectedGameIds),
      getGameSnapshots(affectedGameIds),
    ]);
    deliveryWarning = await notifyGameLifecycleChange({
      audiences,
      games,
      kind: "game_updated",
    });
  } catch (notificationError) {
    deliveryWarning = true;
    console.error("Failed to prepare game update notifications", {
      affectedGameIds,
      notificationError,
    });
  }

  return {
    deliveryWarning,
    status: isSeriesAction ? "edited-series" : "edited-game",
  };
}
