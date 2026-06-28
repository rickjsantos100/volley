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
import { sendPaymentProofRequestEmail } from "@/lib/notifications/email";
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
  | "joined-game"
  | "joined-waitlist"
  | "left-game"
  | "cancelled-game"
  | "cancelled-series"
  | "uncancelled-game"
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
  | "not-authorized";

export type GameActionState = {
  proofRequestedAt?: string;
  status?: GameActionStatus;
};

type AdminGameRow = {
  id: string;
  starts_at: string;
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

  try {
    await removePaymentProofs([getPaymentProofPath(gameId, user.id)]);
  } catch (proofError) {
    console.error("Failed to delete payment proof after leaving game", {
      gameId,
      proofError,
      userId: user.id,
    });
  }

  await processNotificationsAfterMutation();

  return { status: "left-game" };
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

  const { role, user } = await getUserRole();

  if (!user) {
    redirect("/");
  }

  if (role !== "admin") {
    return { status: "not-authorized" };
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

  const requestVersion = proof?.proof_requested_at ?? "initial";
  const [{ data: profile }, { data: game }] = await Promise.all([
    supabase
      .from("profiles")
      .select("email")
      .eq("id", participant.user_id)
      .maybeSingle<{ email: string | null }>(),
    supabase
      .from("game_events")
      .select("starts_at")
      .eq("id", gameId)
      .maybeSingle<{ starts_at: string }>(),
  ]);

  if (!profile?.email || !game) {
    return { status: "proof-request-error" };
  }

  try {
    await sendPaymentProofRequestEmail({
      email: profile.email,
      gameId,
      participantId: participant.id,
      requestVersion,
      startsAt: game.starts_at,
    });
    await enqueueNotification({
      dedupeKey: `payment_proof_requested:${participant.id}:${requestVersion}`,
      gameEventId: gameId,
      kind: "payment_proof_requested",
      payload: {
        body: "Adiciona o comprovativo de pagamento na página do jogo.",
        tag: `payment-proof-requested-${gameId}`,
        title: "Comprovativo em falta",
        url: `/dashboard/games/${gameId}`,
      },
      userId: participant.user_id,
    });
  } catch (notificationError) {
    console.error("Failed to request payment proof", notificationError);
    return { status: "proof-request-error" };
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
  await processNotificationsAfterMutation();

  return { proofRequestedAt, status: "proof-requested" };
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

  const { data: participant } = await supabase
    .from("game_participants")
    .select("user_id")
    .eq("id", participantId)
    .eq("game_event_id", gameId)
    .maybeSingle<{ user_id: string }>();

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

  if (participant) {
    try {
      await removePaymentProofs([
        getPaymentProofPath(gameId, participant.user_id),
      ]);
    } catch (proofError) {
      console.error("Failed to delete removed participant payment proof", {
        gameId,
        proofError,
        userId: participant.user_id,
      });
    }
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
  let paymentProofPaths: string[] = [];

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

  await notifyGameLifecycleChange({
    gameIds: affectedGameIds,
    includeGameEventId: isRecurringGame,
    kind: "game_deleted",
    preparedAudiences: physicalDeleteAudiences,
  });

  redirect("/dashboard");
}
