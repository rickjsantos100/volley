import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminGameControls } from "@/components/admin-game-controls";
import { AdminParticipantListItem } from "@/components/admin-participant-list-item";
import { AdminWaitlistSortableList } from "@/components/admin-waitlist-sortable-list";
import { GameParticipationActions } from "@/components/game-participation-actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { StatTile } from "@/components/ui/stat-tile";
import { formatGameDateTitle } from "@/lib/format-game-date-title";
import { formatDuration } from "@/lib/format-duration";
import { createClient } from "@/lib/supabase/server";
import type { GameActionStatus } from "./actions";
import {
  cancelGame,
  deleteGame,
  joinGame,
  joinWaitlist,
  leaveGame,
  removeParticipantFromGame,
  removeWaitlistEntryFromGame,
  reorderWaitlist,
  updateParticipantPaymentStatus,
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

type ProfileRoleRow = {
  role: "user" | "admin";
};

type ParticipantDetail = {
  id: string;
  game_event_id: string;
  user_id: string;
  joined_at: string;
  payment_status: "unpaid" | "paid" | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
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
  email: string | null;
};

type GameDetailPageProps = {
  params: Promise<{ gameId: string }>;
};

function getDisplayName(player: {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}) {
  const fullName = [player.first_name, player.last_name]
    .filter(Boolean)
    .join(" ");

  return player.display_name || fullName || player.email || "Player";
}

export default async function GameDetailPage({ params }: GameDetailPageProps) {
  const [{ gameId }, t, supabase] = await Promise.all([
    params,
    getTranslations("GameDetailPage"),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [
    { data: game, error: gameError },
    { data: profile },
    { count: participantCount },
  ] = await Promise.all([
    supabase
      .from("game_events")
      .select(
        "id, starts_at, duration_minutes, max_participants, status, recurring_series_id, recurring_starts_at",
      )
      .eq("id", gameId)
      .maybeSingle<GameEvent>(),
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<ProfileRoleRow>(),
    supabase
      .from("game_participants")
      .select("game_event_id", { count: "exact", head: true })
      .eq("game_event_id", gameId)
  ]);

  if (gameError || !game) {
    notFound();
  }

  if (game.status === "deleted") {
    notFound();
  }

  const isAdmin = profile?.role === "admin";
  const occupiedSlots = participantCount ?? 0;
  const isFull = occupiedSlots >= game.max_participants;
  const isCancelled = game.status === "cancelled";

  if (isCancelled && !isAdmin) {
    notFound();
  }

  const isRecurring = Boolean(game.recurring_series_id);

  const cancelGameAction = cancelGame.bind(null, game.id);
  const deleteGameAction = deleteGame.bind(null, game.id);
  const statusLabels: Record<GameActionStatus, string> = {
    "joined-game": t("joinedGameMessage"),
    "joined-waitlist": t("joinedWaitlistMessage"),
    "left-game": t("leftGameMessage"),
    "cancelled-game": t("cancelledGameMessage"),
    "cancelled-series": t("cancelledSeriesMessage"),
    "uncancelled-game": t("uncancelledGameMessage"),
    "payment-updated": t("paymentUpdatedMessage"),
    "removed-player": t("removedPlayerMessage"),
    "join-error": t("joinErrorMessage"),
    "waitlist-error": t("waitlistErrorMessage"),
    "waitlist-reorder-error": t("waitlistReorderErrorMessage"),
    "leave-error": t("leaveErrorMessage"),
    "remove-player-error": t("removePlayerErrorMessage"),
    "cancel-error": t("cancelErrorMessage"),
    "delete-error": t("deleteErrorMessage"),
    "payment-error": t("paymentErrorMessage"),
    "not-authorized": t("notAuthorizedMessage"),
  };

  return (
    <main className="min-h-screen bg-[#fff8d8] px-4 py-20 text-[rgba(0,0,0,0.87)] sm:px-6 lg:px-10">
      <section className="mx-auto grid w-full max-w-5xl gap-5">
        <Card>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[#0737a8]">
                {formatGameDateTitle(new Date(game.starts_at))}
              </h1>
            </div>

            {isCancelled ? (
              <Badge variant="danger">{t("cancelledLabel")}</Badge>
            ) : isFull ? (
              <Badge>{t("fullLabel")}</Badge>
            ) : null}
          </div>

          <dl
            className={`mt-5 grid gap-3 ${isRecurring ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
          >
            <StatTile
              label={t("durationLabel")}
              value={formatDuration(game.duration_minutes)}
            />
            {isRecurring ? (
              <StatTile label={t("repeatLabel")} value={t("weeklyRepeatValue")} />
            ) : null}
            <StatTile
              label={t("slotsLabel")}
              value={`${occupiedSlots}/${game.max_participants}`}
            />
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
        "id, game_event_id, user_id, joined_at, payment_status, display_name, first_name, last_name, email",
      )
      .eq("game_event_id", game.id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("game_waitlist_details")
      .select(
        "id, game_event_id, user_id, joined_waitlist_at, position, display_name, first_name, last_name, email",
      )
      .eq("game_event_id", game.id)
      .order("position", { ascending: true }),
  ]);

  const participants = (participantRows ?? []) as ParticipantDetail[];
  const waitlist = (waitlistRows ?? []) as WaitlistDetail[];
  if (participantsError || waitlistError) {
    console.error("Failed to load game roster lists", {
      gameId: game.id,
      participantsError,
      waitlistError,
    });
  }
  const occupiedSlots = participants.length;
  const isFull = occupiedSlots >= game.max_participants;
  const isParticipant = participants.some(
    (participant) => participant.user_id === userId,
  );
  const isWaitlisted = waitlist.some((entry) => entry.user_id === userId);
  const hasListError = Boolean(participantsError || waitlistError);
  const joinGameAction = joinGame.bind(null, game.id);
  const joinWaitlistAction = joinWaitlist.bind(null, game.id);
  const leaveGameAction = leaveGame.bind(null, game.id);
  const statusLabels: Record<GameActionStatus, string> = {
    "joined-game": t("joinedGameMessage"),
    "joined-waitlist": t("joinedWaitlistMessage"),
    "left-game": t("leftGameMessage"),
    "cancelled-game": t("cancelledGameMessage"),
    "cancelled-series": t("cancelledSeriesMessage"),
    "uncancelled-game": t("uncancelledGameMessage"),
    "payment-updated": t("paymentUpdatedMessage"),
    "removed-player": t("removedPlayerMessage"),
    "join-error": t("joinErrorMessage"),
    "waitlist-error": t("waitlistErrorMessage"),
    "waitlist-reorder-error": t("waitlistReorderErrorMessage"),
    "leave-error": t("leaveErrorMessage"),
    "remove-player-error": t("removePlayerErrorMessage"),
    "cancel-error": t("cancelErrorMessage"),
    "delete-error": t("deleteErrorMessage"),
    "payment-error": t("paymentErrorMessage"),
    "not-authorized": t("notAuthorizedMessage"),
  };

  return (
    <>
      {!isCancelled ? (
        <GameParticipationActions
          alreadyWaitlistedLabel={t("alreadyWaitlistedButton")}
          confirmLeaveMessage={t("leaveGameConfirmMessage")}
          isFull={isFull}
          isParticipant={isParticipant}
          isWaitlisted={isWaitlisted}
          joinGameAction={joinGameAction}
          joinGameLabel={t("joinGameButton")}
          joinWaitlistAction={joinWaitlistAction}
          joinWaitlistLabel={t("joinWaitlistButton")}
          leaveGameAction={leaveGameAction}
          leaveGameLabel={t("leaveGameButton")}
          statusLabels={statusLabels}
        />
      ) : null}

      {hasListError ? <Alert>{t("listLoadError")}</Alert> : null}

      {!hasListError ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="text-xl font-semibold tracking-[-0.01em] text-[#0737a8]">
              {t("participantsTitle")}
            </h2>

            {participants.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-[rgba(0,0,0,0.58)]">
                {t("emptyParticipants")}
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {participants.map((participant) => {
                  const name = getDisplayName(participant);

                  return isAdmin ? (
                    <AdminParticipantListItem
                      key={participant.id}
                      name={name}
                      paidLabel={t("paidLabel")}
                      paymentAction={updateParticipantPaymentStatus.bind(
                        null,
                        game.id,
                        participant.id,
                      )}
                      paymentStatus={participant.payment_status}
                      removeAction={removeParticipantFromGame.bind(
                        null,
                        game.id,
                        participant.id,
                      )}
                      removeLabel={t("removePlayerLabel", { name })}
                      statusLabels={statusLabels}
                      unpaidLabel={t("unpaidLabel")}
                    />
                  ) : (
                    <li
                      key={participant.id}
                      className="flex items-center gap-3 rounded-xl bg-[#f9f9f9] px-4 py-3"
                    >
                      <InitialsAvatar name={name} />
                      <p className="truncate text-sm font-semibold text-[#26375f]">
                        {name}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-semibold tracking-[-0.01em] text-[#0737a8]">
              {t("waitlistTitle")}
            </h2>

            {waitlist.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-[rgba(0,0,0,0.58)]">
                {t("emptyWaitlist")}
              </p>
            ) : isAdmin ? (
              <AdminWaitlistSortableList
                action={reorderWaitlist.bind(null, game.id)}
                dragHandleLabel={t("dragWaitlistPlayerLabel")}
                items={waitlist.map((entry) => ({
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

                  return (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#f9f9f9] px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <InitialsAvatar name={name} />
                        <p className="min-w-0 truncate text-sm font-semibold text-[#26375f]">
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
      className={`animate-pulse rounded-full bg-[rgba(0,0,0,0.08)] ${className}`}
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
            className="flex items-center gap-3 rounded-xl bg-[#f9f9f9] px-4 py-3"
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
