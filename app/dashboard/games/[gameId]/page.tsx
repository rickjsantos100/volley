import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  AdminAddPlayer,
  type AddPlayerCandidate,
} from "@/components/admin-add-player";
import { AdminGameControls } from "@/components/admin-game-controls";
import { AdminParticipantListItem } from "@/components/admin-participant-list-item";
import { AdminWaitlistSortableList } from "@/components/admin-waitlist-sortable-list";
import { GameParticipationActions } from "@/components/game-participation-actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cx, pressedSurfaceClassName } from "@/components/ui/class-name";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import {
  formatGameDateParts,
  formatGameDateTitle,
} from "@/lib/format-game-date-title";
import { formatDuration } from "@/lib/format-duration";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import { getPaymentProofPath } from "@/lib/payment-proofs";
import { createClient } from "@/lib/supabase/server";
import type { GameActionStatus } from "./actions";
import {
  addParticipantToGame,
  cancelGame,
  deleteGame,
  editGame,
  finalizePaymentProof,
  joinGame,
  joinWaitlist,
  leaveGame,
  removeParticipantFromGame,
  removeWaitlistEntryFromGame,
  reorderWaitlist,
  requestPaymentProof,
  uncancelGame,
} from "./actions";

type GameEvent = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  max_participants: number;
  status: "scheduled" | "cancelled" | "completed" | "deleted";
  recurring_series_id: string | null;
  recurring_starts_at: string | null;
};

type ParticipantDetail = {
  id: string;
  game_event_id: string;
  user_id: string;
  joined_at: string;
  payment_proof_path: string | null;
  payment_proof_filename: string | null;
  payment_proof_mime_type: string | null;
  payment_proof_uploaded_at: string | null;
  payment_proof_requested_at: string | null;
  payment_proof_deleted_at: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
  avatar_updated_at: string | null;
};

type WaitlistDetail = {
  id: string;
  game_event_id: string;
  user_id: string;
  joined_waitlist_at: string;
  position: number;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
  avatar_updated_at: string | null;
};

type ProfileCandidate = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
  avatar_updated_at: string | null;
};

type GameDetailPageProps = {
  params: Promise<{ gameId: string }>;
};

const calendarLocation = "ACM/YMCA Lisboa";
const calendarMapsUrl =
  "https://www.google.com/maps/place/ACM%2FYMCA+Lisboa/@38.7182879,-9.1582447,17z/data=!3m1!4b1!4m6!3m5!1s0xd19337b46b17f9d:0x655114031277fde9!8m2!3d38.7182879!4d-9.1556698!16s%2Fg%2F11c1yj7g8h";

function getDisplayName(player: {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
}) {
  const fullName = [player.first_name, player.last_name]
    .filter(Boolean)
    .join(" ");

  return player.display_name || fullName || "Player";
}

function getAvatarUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  player: {
    avatar_path: string | null;
    avatar_updated_at: string | null;
  },
) {
  if (!player.avatar_path) {
    return "";
  }

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(player.avatar_path);
  const version = player.avatar_updated_at
    ? `?v=${encodeURIComponent(player.avatar_updated_at)}`
    : "";

  return `${data.publicUrl}${version}`;
}

function formatGoogleCalendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function getGoogleCalendarUrl(game: GameEvent) {
  const startsAt = new Date(game.starts_at);
  const endsAt = new Date(startsAt.getTime() + game.duration_minutes * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    dates: `${formatGoogleCalendarDate(startsAt)}/${formatGoogleCalendarDate(endsAt)}`,
    details: ["Jogo do Voley Lisboa.", `Localização: ${calendarMapsUrl}`].join(
      "\n",
    ),
    location: calendarLocation,
    text: "Voley Lisboa",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default async function GameDetailPage({ params }: GameDetailPageProps) {
  const [{ gameId }, t, supabase, user] = await Promise.all([
    params,
    getTranslations("GameDetailPage"),
    createClient(),
    getCurrentUser(),
  ]);

  if (!user) {
    const gamePath = `/dashboard/games/${gameId}`;
    redirect(`/?next=${encodeURIComponent(gamePath)}`);
  }

  const [
    { data: game, error: gameError },
    profile,
    { count: participantCount },
    { count: waitlistCount },
  ] = await Promise.all([
    supabase
      .from("game_events")
      .select(
        "id, starts_at, duration_minutes, max_participants, status, recurring_series_id, recurring_starts_at",
      )
      .eq("id", gameId)
      .maybeSingle<GameEvent>(),
    getCurrentProfile(),
    supabase
      .from("game_participants")
      .select("game_event_id", { count: "exact", head: true })
      .eq("game_event_id", gameId),
    supabase
      .from("game_waitlist_entries")
      .select("id", { count: "exact", head: true })
      .eq("game_event_id", gameId)
      .eq("status", "active"),
  ]);

  if (gameError || !game) {
    notFound();
  }

  if (game.status === "deleted") {
    notFound();
  }

  const isAdmin = profile?.role === "admin";
  const occupiedSlots = participantCount ?? 0;
  const activeWaitlistCount = waitlistCount ?? 0;
  const isFull = occupiedSlots >= game.max_participants;
  const isCancelled = game.status === "cancelled";

  if (isCancelled && !isAdmin) {
    notFound();
  }

  const isRecurring = Boolean(game.recurring_series_id);
  const gameDate = formatGameDateParts(new Date(game.starts_at));

  const cancelGameAction = cancelGame.bind(null, game.id);
  const deleteGameAction = deleteGame.bind(null, game.id);
  const statusLabels: Record<GameActionStatus, string> = {
    "added-player": t("addedPlayerMessage"),
    "added-player-email-error": t("addedPlayerEmailErrorMessage"),
    "add-player-error": t("addPlayerErrorMessage"),
    "joined-game": t("joinedGameMessage"),
    "joined-waitlist": t("joinedWaitlistMessage"),
    "left-game": t("leftGameMessage"),
    "cancelled-game": t("cancelledGameMessage"),
    "cancelled-series": t("cancelledSeriesMessage"),
    "uncancelled-game": t("uncancelledGameMessage"),
    "edited-game": t("editedGameMessage"),
    "edited-series": t("editedSeriesMessage"),
    "edit-error": t("editGameError"),
    "edit-not-authorized": t("editGameNotAuthorized"),
    "proof-uploaded": t("proofUploadedMessage"),
    "proof-upload-error": t("proofUploadErrorMessage"),
    "proof-requested": t("proofRequestedMessage"),
    "proof-request-error": t("proofRequestErrorMessage"),
    "removed-player": t("removedPlayerMessage"),
    "join-error": t("joinErrorMessage"),
    "waitlist-error": t("waitlistErrorMessage"),
    "waitlist-reorder-error": t("waitlistReorderErrorMessage"),
    "leave-error": t("leaveErrorMessage"),
    "remove-player-error": t("removePlayerErrorMessage"),
    "cancel-error": t("cancelErrorMessage"),
    "delete-error": t("deleteErrorMessage"),
    "not-authorized": t("notAuthorizedMessage"),
  };

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 pt-24 pb-12 text-[#101828] sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-[1120px] gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            className={cx(
              pressedSurfaceClassName,
              "flex min-h-11 items-center gap-2 rounded-[10px] px-2 text-sm font-bold text-[#0737a8] transition-colors hover:bg-[#0737a8]/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20",
            )}
            href="/dashboard"
          >
            <span aria-hidden="true">←</span>
            {t("backToGames")}
          </Link>
          <p className="text-xs font-bold tracking-[0.1em] text-[#667085] uppercase">
            {t("pageLabel")}
          </p>
        </div>

        <Card variant="matchSheet">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-matchday text-4xl leading-[38px] font-bold text-white sm:text-5xl sm:leading-none">
                {gameDate.date}
              </h1>
              <p className="font-matchday mt-1 text-5xl leading-none font-bold text-[#ffd21a] sm:text-6xl">
                {gameDate.time}
              </p>
            </div>

            {isCancelled ? (
              <Badge variant="danger">{t("cancelledLabel")}</Badge>
            ) : isFull ? (
              <Badge className="border-white/20 bg-white/10 text-white">
                {t("fullLabel")}
              </Badge>
            ) : null}
          </div>

          <dl
            className={`mt-6 grid grid-cols-2 gap-5 border-t border-white/20 pt-5 ${activeWaitlistCount > 0 ? (isRecurring ? "sm:grid-cols-4" : "sm:grid-cols-3") : isRecurring ? "sm:grid-cols-3" : ""}`}
          >
            <div
              className={
                activeWaitlistCount > 0 && !isRecurring
                  ? "col-span-2 sm:col-span-1"
                  : undefined
              }
            >
              <dt className="text-xs font-bold tracking-[0.08em] text-white/70 uppercase">{t("durationLabel")}</dt>
              <dd className="mt-1 font-semibold">{formatDuration(game.duration_minutes)}</dd>
            </div>
            {isRecurring ? (
              <div>
                <dt className="text-xs font-bold tracking-[0.08em] text-white/70 uppercase">{t("repeatLabel")}</dt>
                <dd className="mt-1 font-semibold">{t("weeklyRepeatValue")}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-bold tracking-[0.08em] text-white/70 uppercase">{t("slotsLabel")}</dt>
              <dd className="mt-1 font-semibold">{occupiedSlots}/{game.max_participants}</dd>
            </div>
            {activeWaitlistCount > 0 ? (
              <div>
                <dt className="text-xs font-bold tracking-[0.08em] text-white/70 uppercase">
                  {t("waitlistCountLabel")}
                </dt>
                <dd className="mt-1 font-semibold">{activeWaitlistCount}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        {isAdmin ? (
          <AdminGameControls
            cancelAction={cancelGameAction}
            cancelConfirmMessage={
              isRecurring
                ? t("cancelOccurrenceConfirmMessage")
                : t("cancelGameConfirmMessage")
            }
            cancelLabel={t("cancelGameButton")}
            deleteAction={deleteGameAction}
            deleteConfirmMessage={
              isRecurring
                ? t("deleteOccurrenceConfirmMessage")
                : t("deleteGameConfirmMessage")
            }
            deleteLabel={t("deleteGameButton")}
            deleteOccurrenceLabel={t("deleteOccurrenceButton")}
            deleteScopeIntro={t("deleteScopeIntro")}
            deleteScopeTitle={t("deleteScopeTitle")}
            deleteSeriesLabel={t("deleteSeriesButton")}
            editAction={editGame.bind(null, game.id)}
            editDurationMinutes={game.duration_minutes}
            editLabels={{
              button: t("editGameButton"),
              date: t("editGameDateLabel"),
              endsAt: t("editGameEndsAtLabel"),
              error: t("editGameError"),
              maxParticipants: t("editGameCapacityLabel"),
              notAuthorized: t("editGameNotAuthorized"),
              scopeIntro: t("editGameScopeIntro"),
              scopeOccurrence: t("editOccurrenceButton"),
              scopeSeries: t("editSeriesButton"),
              scopeTitle: t("editGameScopeTitle"),
              seriesSuccess: t("editedSeriesMessage"),
              startsAt: t("editGameStartsAtLabel"),
              submit: t("editGameSubmit"),
              success: t("editedGameMessage"),
              title: t("editGameTitle"),
              validationError: t("editGameValidationError"),
            }}
            editMaxParticipants={game.max_participants}
            editStartsAt={game.starts_at}
            isCancelled={isCancelled}
            isRecurring={isRecurring}
            statusLabels={statusLabels}
            uncancelAction={uncancelGame.bind(null, game.id)}
            uncancelLabel={t("uncancelGameButton")}
          />
        ) : null}

		<Suspense fallback={<GameDetailContentSkeleton />}>
          <GameDetailContent
            game={game}
            isAdmin={isAdmin}
            isCancelled={isCancelled}
            userId={user.id}
          />
        </Suspense>
      </section>
    </main>
  );
}

async function GameDetailContent({
  game,
  isAdmin,
  isCancelled,
  userId,
}: {
  game: GameEvent;
  isAdmin: boolean;
  isCancelled: boolean;
  userId: string;
}) {
  const [t, supabase] = await Promise.all([
    getTranslations("GameDetailPage"),
    createClient(),
  ]);
  const [
    { data: participantRows, error: participantsError },
    { data: waitlistRows, error: waitlistError },
  ] = await Promise.all([
    supabase
      .from("game_participant_details")
      .select(
        "id, game_event_id, user_id, joined_at, payment_proof_path, payment_proof_filename, payment_proof_mime_type, payment_proof_uploaded_at, payment_proof_requested_at, payment_proof_deleted_at, display_name, first_name, last_name, avatar_path, avatar_updated_at",
      )
      .eq("game_event_id", game.id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("game_waitlist_details")
      .select(
        "id, game_event_id, user_id, joined_waitlist_at, position, display_name, first_name, last_name, avatar_path, avatar_updated_at",
      )
      .eq("game_event_id", game.id)
      .order("position", { ascending: true }),
  ]);

  const participants = (participantRows ?? []) as ParticipantDetail[];
  const waitlist = (waitlistRows ?? []) as WaitlistDetail[];
  const { data: profileRows, error: profilesError } = isAdmin
    ? await supabase
        .from("profiles")
        .select(
          "id, display_name, first_name, last_name, avatar_path, avatar_updated_at",
        )
        .order("first_name", { ascending: true })
        .returns<ProfileCandidate[]>()
    : { data: null, error: null };
  if (participantsError || waitlistError) {
    console.error("Failed to load game roster lists", {
      gameId: game.id,
      participantsError,
      waitlistError,
    });
  }
  if (profilesError) {
    console.error("Failed to load add-player candidates", {
      gameId: game.id,
      profilesError,
    });
  }
  const occupiedSlots = participants.length;
  const isFull = occupiedSlots >= game.max_participants;
  const currentParticipant = participants.find(
    (participant) => participant.user_id === userId,
  );
  const isParticipant = Boolean(currentParticipant);
  const isWaitlisted = waitlist.some((entry) => entry.user_id === userId);
  const hasListError = Boolean(participantsError || waitlistError);
  const joinGameAction = joinGame.bind(null, game.id);
  const joinWaitlistAction = joinWaitlist.bind(null, game.id);
  const leaveGameAction = leaveGame.bind(null, game.id);
  const gameDateTitle = formatGameDateTitle(new Date(game.starts_at));
  const excludedUserIds = new Set([
    ...participants.map((participant) => participant.user_id),
    ...waitlist.map((entry) => entry.user_id),
  ]);
  const addPlayerCandidates: AddPlayerCandidate[] = (profileRows ?? [])
    .filter((candidate) => !excludedUserIds.has(candidate.id))
    .map((candidate) => ({
      avatarUrl: getAvatarUrl(supabase, candidate),
      id: candidate.id,
      name: getDisplayName(candidate),
      searchValue: [
        candidate.display_name,
        candidate.first_name,
        candidate.last_name,
      ]
        .filter(Boolean)
        .join(" "),
    }));
  // Server-rendered availability must reflect the request time.
  // eslint-disable-next-line react-hooks/purity
  const isPast = new Date(game.starts_at).getTime() <= Date.now();
  const addPlayerDisabledReason = isCancelled
    ? t("addPlayerCancelledReason")
    : isPast
      ? t("addPlayerPastReason")
      : isFull
        ? t("addPlayerFullReason")
        : profilesError
          ? t("addPlayerUnavailableReason")
          : undefined;
  const statusLabels: Record<GameActionStatus, string> = {
    "added-player": t("addedPlayerMessage"),
    "added-player-email-error": t("addedPlayerEmailErrorMessage"),
    "add-player-error": t("addPlayerErrorMessage"),
    "joined-game": t("joinedGameMessage"),
    "joined-waitlist": t("joinedWaitlistMessage"),
    "left-game": t("leftGameMessage"),
    "cancelled-game": t("cancelledGameMessage"),
    "cancelled-series": t("cancelledSeriesMessage"),
    "uncancelled-game": t("uncancelledGameMessage"),
    "edited-game": t("editedGameMessage"),
    "edited-series": t("editedSeriesMessage"),
    "edit-error": t("editGameError"),
    "edit-not-authorized": t("editGameNotAuthorized"),
    "proof-uploaded": t("proofUploadedMessage"),
    "proof-upload-error": t("proofUploadErrorMessage"),
    "proof-requested": t("proofRequestedMessage"),
    "proof-request-error": t("proofRequestErrorMessage"),
    "removed-player": t("removedPlayerMessage"),
    "join-error": t("joinErrorMessage"),
    "waitlist-error": t("waitlistErrorMessage"),
    "waitlist-reorder-error": t("waitlistReorderErrorMessage"),
    "leave-error": t("leaveErrorMessage"),
    "remove-player-error": t("removePlayerErrorMessage"),
    "cancel-error": t("cancelErrorMessage"),
    "delete-error": t("deleteErrorMessage"),
    "not-authorized": t("notAuthorizedMessage"),
  };

  return (
    <>
      {!isCancelled ? (
        <GameParticipationActions
          alreadyWaitlistedLabel={t("alreadyWaitlistedButton")}
          calendar={{
            googleCalendarUrl: getGoogleCalendarUrl(game),
            label: t("addToCalendarButton"),
          }}
          confirmLeaveMessage={t("leaveGameConfirmMessage")}
          finalizePaymentProofAction={finalizePaymentProof.bind(null, game.id)}
          isFull={isFull}
          isParticipant={isParticipant}
          isWaitlisted={isWaitlisted}
          joinGameAction={joinGameAction}
          joinGameLabel={t("joinGameButton")}
          joinWaitlistAction={joinWaitlistAction}
          joinWaitlistLabel={t("joinWaitlistButton")}
          leaveGameAction={leaveGameAction}
          leaveGameLabel={t("leaveGameButton")}
          paymentProof={{
            deletedAt: currentParticipant?.payment_proof_deleted_at ?? null,
            path: currentParticipant?.payment_proof_path ?? null,
            requestedAt:
              currentParticipant?.payment_proof_requested_at ?? null,
            storagePath: getPaymentProofPath(game.id, userId),
          }}
          proofLabels={{
            add: t("addProofButton"),
            addLater: t("addProofLaterButton"),
            added: t("proofAddedLabel"),
            chooseFile: t("proofChooseFileButton"),
            emptyFile: t("proofNoFileSelected"),
            file: t("proofFileLabel"),
            fileHelp: t("proofFileHelp"),
            invalidFile: t("proofInvalidFileMessage"),
            replace: t("replaceProofButton"),
            requested: t("proofRequestedLabel"),
            submit: t("uploadProofButton"),
            title: t("proofModalTitle"),
          }}
          share={{
            gamePath: `/dashboard/games/${game.id}`,
            labels: {
              button: t("shareGameButton"),
              copied: t("shareCopiedMessage"),
              copyButton: t("shareCopyButton"),
              fallbackIntro: t("shareFallbackIntro"),
              fallbackLabel: t("shareFallbackLabel"),
              fallbackTitle: t("shareFallbackTitle"),
            },
            text: t("shareText", { date: gameDateTitle }),
            title: t("shareTitle", { date: gameDateTitle }),
          }}
          statusLabels={statusLabels}
        />
      ) : null}

      {hasListError ? <Alert>{t("listLoadError")}</Alert> : null}

      {!hasListError ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="font-matchday text-[26px] leading-7 font-bold text-[#061b6b]">
                {t("participantsTitle")}
              </h2>
              {isAdmin ? (
                <AdminAddPlayer
                  action={addParticipantToGame.bind(null, game.id)}
                  candidates={addPlayerCandidates}
                  disabledReason={addPlayerDisabledReason}
                  labels={{
                    button: t("addPlayerButton"),
                    empty: t("addPlayerEmptyResults"),
                    input: t("addPlayerSearchLabel"),
                    placeholder: t("addPlayerSearchPlaceholder"),
                  }}
                  statusLabels={statusLabels}
                />
              ) : null}
            </div>

            {participants.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-[#667085]">
                {t("emptyParticipants")}
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {participants.map((participant) => {
                  const name = getDisplayName(participant);
                  const avatarUrl = getAvatarUrl(supabase, participant);

                  return isAdmin ? (
                    <AdminParticipantListItem
                      actionsLabel={t("playerActionsLabel", { name })}
                      avatarUrl={avatarUrl}
                      key={participant.id}
                      name={name}
                      paidLabel={t("paidLabel")}
                      participantId={participant.id}
                      proofAction={requestPaymentProof.bind(
                        null,
                        game.id,
                        participant.id,
                      )}
                      proofDeletedAt={participant.payment_proof_deleted_at}
                      proofLabels={{
                        expired: t("proofExpiredLabel"),
                        request: t("requestProofButton"),
                        requested: t("proofRequestedLabel"),
                        view: t("viewProofButton"),
                      }}
                      proofPath={participant.payment_proof_path}
                      proofRequestedAt={
                        participant.payment_proof_requested_at
                      }
                      proofUploadedAt={participant.payment_proof_uploaded_at}
                      removeAction={removeParticipantFromGame.bind(
                        null,
                        game.id,
                        participant.id,
                      )}
                      removeLabel={t("removePlayerLabel")}
                      statusLabels={statusLabels}
                    />
                  ) : (
                    <li
                      key={participant.id}
                      className="flex min-h-14 items-center gap-3 border-b border-[#dde2ea] py-3 last:border-b-0"
                    >
                      <InitialsAvatar avatarUrl={avatarUrl} name={name} />
                      <p className="min-w-0 text-sm font-semibold text-[#101828] break-words">
                        {name}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-matchday text-[26px] leading-7 font-bold text-[#061b6b]">
              {t("waitlistTitle")}
            </h2>

            {waitlist.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-[#667085]">
                {t("emptyWaitlist")}
              </p>
            ) : isAdmin ? (
              <AdminWaitlistSortableList
                action={reorderWaitlist.bind(null, game.id)}
                dragHandleLabel={t("dragWaitlistPlayerLabel")}
                items={waitlist.map((entry) => ({
                  avatarUrl: getAvatarUrl(supabase, entry),
                  id: entry.id,
                  name: getDisplayName(entry),
                }))}
                key={waitlist.map((entry) => entry.id).join(":")}
                removeAction={removeWaitlistEntryFromGame.bind(null, game.id)}
                removeLabel={t("removeWaitlistPlayerLabel")}
                statusLabels={statusLabels}
              />
            ) : (
              <ul className="mt-4 grid gap-3">
                {waitlist.map((entry) => {
                  const name = getDisplayName(entry);
                  const avatarUrl = getAvatarUrl(supabase, entry);

                  return (
                    <li
                      key={entry.id}
                      className="flex min-h-14 items-center justify-between gap-3 border-b border-[#dde2ea] py-3 last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <InitialsAvatar avatarUrl={avatarUrl} name={name} />
                        <p className="min-w-0 text-sm font-semibold text-[#101828] break-words">
                          {name}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}

function SkeletonLine({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#dde2ea] ${className}`}
    />
  );
}

function GameDetailContentSkeleton() {
  return (
    <>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SkeletonLine className="h-10 w-full sm:w-36" />
          <SkeletonLine className="h-10 w-full sm:w-36" />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <GameListSkeleton />
        <GameListSkeleton />
      </div>
    </>
  );
}

function GameListSkeleton() {
  return (
    <Card>
      <SkeletonLine className="h-7 w-40" />
      <div className="mt-4 grid gap-3">
        {[0, 1, 2].map((index) => (
          <div
            className="flex items-center gap-3 border-b border-[#dde2ea] py-3"
            key={index}
          >
            <SkeletonLine className="h-9 w-9 shrink-0" />
            <SkeletonLine className="h-4 w-36" />
          </div>
        ))}
      </div>
    </Card>
  );
}
