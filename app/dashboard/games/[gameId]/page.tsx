import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LeaveGameForm } from "@/components/leave-game-form";
import { formatGameDateTitle } from "@/lib/format-game-date-title";
import { createClient } from "@/lib/supabase/server";
import { joinGame, joinWaitlist, leaveGame } from "./actions";

type GameEvent = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  max_participants: number;
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
  searchParams: Promise<{ status?: string }>;
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StatusMessage({
  status,
}: {
  status: string | undefined;
}) {
  const successStatuses = new Set([
    "joined-game",
    "joined-waitlist",
    "left-game",
  ]);

  if (!status) {
    return null;
  }

  return (
    <p
      className={
        successStatuses.has(status)
          ? "rounded-xl bg-[#d4e9e2] px-4 py-3 text-sm font-medium text-[#006241]"
          : "rounded-xl bg-[hsl(4_82%_43%_/_5%)] px-4 py-3 text-sm font-medium text-[#c82014]"
      }
    >
      <StatusText status={status} />
    </p>
  );
}

async function StatusText({ status }: { status: string }) {
  const t = await getTranslations("GameDetailPage");

  if (status === "joined-game") {
    return t("joinedGameMessage");
  }

  if (status === "joined-waitlist") {
    return t("joinedWaitlistMessage");
  }

  if (status === "left-game") {
    return t("leftGameMessage");
  }

  if (status === "leave-error") {
    return t("leaveErrorMessage");
  }

  if (status === "waitlist-error") {
    return t("waitlistErrorMessage");
  }

  return t("joinErrorMessage");
}

function PlayerAvatar({ name }: { name: string }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#00754A] text-sm font-semibold text-white">
      {getInitials(name)}
    </span>
  );
}

export default async function GameDetailPage({
  params,
  searchParams,
}: GameDetailPageProps) {
  const [{ gameId }, { status }, t, supabase] = await Promise.all([
    params,
    searchParams,
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
    { data: participantRows, error: participantsError },
    { data: waitlistRows, error: waitlistError },
  ] = await Promise.all([
    supabase
      .from("game_events")
      .select("id, starts_at, duration_minutes, max_participants")
      .eq("id", gameId)
      .maybeSingle<GameEvent>(),
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<ProfileRoleRow>(),
    supabase
      .from("game_participant_details")
      .select(
        "id, game_event_id, user_id, joined_at, payment_status, display_name, first_name, last_name, email",
      )
      .eq("game_event_id", gameId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("game_waitlist_details")
      .select(
        "id, game_event_id, user_id, joined_waitlist_at, position, display_name, first_name, last_name, email",
      )
      .eq("game_event_id", gameId)
      .order("position", { ascending: true }),
  ]);

  if (gameError || !game) {
    notFound();
  }

  const participants = (participantRows ?? []) as ParticipantDetail[];
  const waitlist = (waitlistRows ?? []) as WaitlistDetail[];
  const isAdmin = profile?.role === "admin";
  const occupiedSlots = participants.length;
  const isFull = occupiedSlots >= game.max_participants;
  const isParticipant = participants.some(
    (participant) => participant.user_id === user.id,
  );
  const isWaitlisted = waitlist.some((entry) => entry.user_id === user.id);
  const hasListError = Boolean(participantsError || waitlistError);

  const joinGameAction = joinGame.bind(null, game.id);
  const joinWaitlistAction = joinWaitlist.bind(null, game.id);
  const leaveGameAction = leaveGame.bind(null, game.id);

  return (
    <main className="min-h-screen bg-[#f2f0eb] px-4 py-20 text-[rgba(0,0,0,0.87)] sm:px-6 lg:px-10">
      <section className="mx-auto grid w-full max-w-5xl gap-5">
        <Link
          href="/dashboard"
          className="w-fit rounded-full border border-[#00754A] px-5 py-2 text-sm font-semibold text-[#00754A] transition hover:bg-white active:scale-95"
        >
          {t("backToGames")}
        </Link>

        <article className="rounded-xl bg-white px-5 py-5 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[#006241]">
                {formatGameDateTitle(new Date(game.starts_at))}
              </h1>
            </div>

            {isFull ? (
              <span className="w-fit rounded-full bg-[#1E3932] px-3 py-1 text-xs font-semibold text-white">
                {t("fullLabel")}
              </span>
            ) : null}
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#f9f9f9] px-4 py-3">
              <dt className="text-xs font-semibold tracking-[0.1em] text-[rgba(0,0,0,0.58)] uppercase">
                {t("durationLabel")}
              </dt>
              <dd className="mt-1 text-base font-semibold text-[#33433d]">
                {t("durationValue", { minutes: game.duration_minutes })}
              </dd>
            </div>
            <div className="rounded-xl bg-[#f9f9f9] px-4 py-3">
              <dt className="text-xs font-semibold tracking-[0.1em] text-[rgba(0,0,0,0.58)] uppercase">
                {t("slotsLabel")}
              </dt>
              <dd className="mt-1 text-base font-semibold text-[#33433d]">
                {t("slotsValue", {
                  occupied: occupiedSlots,
                  capacity: game.max_participants,
                })}
              </dd>
            </div>
          </dl>
        </article>

        <StatusMessage status={status} />

        <div className="rounded-xl bg-white px-5 py-5 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)]">
          {isParticipant ? (
            <LeaveGameForm
              action={leaveGameAction}
              confirmMessage={t("leaveGameConfirmMessage")}
              label={t("leaveGameButton")}
            />
          ) : isWaitlisted ? (
            <button
              type="button"
              disabled
              className="w-full rounded-full border border-[#00754A] bg-[#d4e9e2] px-5 py-3 text-sm font-semibold text-[#006241] sm:w-auto"
            >
              {t("alreadyWaitlistedButton")}
            </button>
          ) : isFull ? (
            <form action={joinWaitlistAction}>
              <button className="w-full rounded-full border border-[#00754A] bg-[#00754A] px-5 py-3 text-sm font-semibold text-white transition active:scale-95 sm:w-auto">
                {t("joinWaitlistButton")}
              </button>
            </form>
          ) : (
            <form action={joinGameAction}>
              <button className="w-full rounded-full border border-[#00754A] bg-[#00754A] px-5 py-3 text-sm font-semibold text-white transition active:scale-95 sm:w-auto">
                {t("joinGameButton")}
              </button>
            </form>
          )}
        </div>

        {hasListError ? (
          <p className="rounded-xl bg-[hsl(4_82%_43%_/_5%)] px-4 py-3 text-sm font-medium text-[#c82014]">
            {t("listLoadError")}
          </p>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl bg-white px-5 py-5 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)]">
            <h2 className="text-xl font-semibold tracking-[-0.01em] text-[#006241]">
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

                  return (
                    <li
                      key={participant.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#f9f9f9] px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <PlayerAvatar name={name} />
                        <p className="truncate text-sm font-semibold text-[#33433d]">
                          {name}
                        </p>
                      </div>

                      {isAdmin ? (
                        <span
                          className={
                            participant.payment_status === "paid"
                              ? "shrink-0 rounded-full bg-[#d4e9e2] px-3 py-1 text-xs font-semibold text-[#006241]"
                              : "shrink-0 rounded-full bg-[#faf6ee] px-3 py-1 text-xs font-semibold text-[#33433d]"
                          }
                        >
                          {participant.payment_status === "paid"
                            ? t("paidLabel")
                            : t("unpaidLabel")}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-xl bg-white px-5 py-5 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)]">
            <h2 className="text-xl font-semibold tracking-[-0.01em] text-[#006241]">
              {t("waitlistTitle")}
            </h2>

            {waitlist.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-[rgba(0,0,0,0.58)]">
                {t("emptyWaitlist")}
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {waitlist.map((entry) => {
                  const name = getDisplayName(entry);

                  return (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 rounded-xl bg-[#f9f9f9] px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-[rgba(0,0,0,0.58)]">
                        {entry.position}
                      </span>
                      <PlayerAvatar name={name} />
                      <p className="min-w-0 truncate text-sm font-semibold text-[#33433d]">
                        {name}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
