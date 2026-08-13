import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminCreateGameButton } from "@/components/admin-create-game-button";
import { StartupPrompts } from "@/components/startup-prompts";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, cardClassName } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { cx, pressedSurfaceClassName } from "@/components/ui/class-name";
import { getTranslations } from "next-intl/server";
import { formatGameDateTitle } from "@/lib/format-game-date-title";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/format-duration";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import { createGame } from "./actions";

type GameEvent = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  max_participants: number;
  is_repeatable: boolean;
  status: "scheduled" | "cancelled" | "completed" | "deleted";
};

type GameParticipantCountRow = {
  game_event_id: string;
  user_id: string;
};

type GameWaitlistRow = {
  game_event_id: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notificationWarning?: string }>;
}) {
  const [t, supabase, user, profile, query] = await Promise.all([
    getTranslations("DashboardPage"),
    createClient(),
    getCurrentUser(),
    getCurrentProfile(),
    searchParams,
  ]);

  if (!user) {
    redirect("/");
  }

  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 30);

  const { data: gameRows, error: gamesError } = await supabase
    .from("game_events")
    .select(
      "id, starts_at, duration_minutes, max_participants, is_repeatable, status",
    )
    .in("status", ["scheduled", "cancelled"])
    .gte("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString())
    .order("starts_at", { ascending: true });
  const games = (gameRows ?? []) as GameEvent[];
  const isAdmin = profile?.role === "admin";
  const gameIds = games.map((game) => game.id);
  const [participantsResult, waitlistResult] = gameIds.length
    ? await Promise.all([
        supabase
          .from("game_participants")
          .select("game_event_id, user_id")
          .in("game_event_id", gameIds),
        supabase
          .from("game_waitlist_entries")
          .select("game_event_id")
          .in("game_event_id", gameIds)
          .eq("user_id", user.id)
          .eq("status", "active"),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  const participantRows = participantsResult.data;
  const waitlistRows = waitlistResult.data;
  const hasGamesError = Boolean(
    gamesError || participantsResult.error || waitlistResult.error,
  );
  const participantCounts = (
    (participantRows ?? []) as GameParticipantCountRow[]
  ).reduce<Record<string, number>>((counts, participant) => {
    counts[participant.game_event_id] =
      (counts[participant.game_event_id] ?? 0) + 1;
    return counts;
  }, {});
  const participatingGameIds = new Set(
    ((participantRows ?? []) as GameParticipantCountRow[])
      .filter((participant) => participant.user_id === user.id)
      .map((participant) => participant.game_event_id),
  );
  const waitlistedGameIds = new Set(
    ((waitlistRows ?? []) as GameWaitlistRow[]).map(
      (entry) => entry.game_event_id,
    ),
  );
  function renderGameCard(
    game: GameEvent,
  ) {
    const occupiedSlots = participantCounts[game.id] ?? 0;
    const isFull = occupiedSlots >= game.max_participants;
    const isCancelled = game.status === "cancelled";
    const isParticipating = participatingGameIds.has(game.id);
    const isWaitlisted = waitlistedGameIds.has(game.id);
    const statusLabel = isCancelled
      ? t("cancelledLabel")
      : isParticipating
        ? t("playingLabel")
        : isWaitlisted
          ? t("waitlistLabel")
      : isFull
        ? t("fullLabel")
        : t("availableLabel");
    const badgeVariant = isCancelled
      ? "danger"
      : isParticipating
        ? "playing"
        : isWaitlisted
          ? "warning"
          : isFull
            ? "soft"
            : "success";
    const variant = isCancelled ? "cancelled" : "default";
    const statusEdge =
      isCancelled
        ? ""
        : isFull
          ? "border-l-4 border-l-[#ffd21a]"
          : "border-l-4 border-l-[#138a5b]";
    const content = (
      <>
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-matchday text-[26px] leading-7 font-bold text-[#061b6b]">
            {formatGameDateTitle(new Date(game.starts_at))}
          </h2>
          <Badge variant={badgeVariant}>
            {statusLabel}
          </Badge>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <dt
              className="text-xs font-bold tracking-[0.08em] text-[#667085] uppercase"
            >
              {t("durationLabel")}
            </dt>
            <dd className="mt-1 font-semibold">
              {formatDuration(game.duration_minutes)}
            </dd>
          </div>
          <div>
            <dt
              className="text-xs font-bold tracking-[0.08em] text-[#667085] uppercase"
            >
              {t("slotsLabel")}
            </dt>
            <dd className="mt-1 font-semibold">
              {t("slotsValue", {
                occupied: occupiedSlots,
                capacity: game.max_participants,
              })}
            </dd>
          </div>
        </dl>
      </>
    );

    if (isCancelled && !isAdmin) {
      return (
        <article
          className={cardClassName({ className: statusEdge, variant })}
          key={game.id}
        >
          {content}
        </article>
      );
    }

    return (
      <Link
        className={cardClassName({
          className: cx(
            pressedSurfaceClassName,
            `block ${statusEdge} transition-[border-color,box-shadow,transform] hover:border-[#0737a8] hover:shadow-[0_12px_28px_rgba(16,24,40,0.11)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 active:translate-y-px`,
          ),
          variant,
        })}
        href={`/dashboard/games/${game.id}`}
        key={game.id}
      >
        {content}
      </Link>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 pt-24 pb-32 text-[#101828] sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-[1120px]">
        {query.notificationWarning === "1" ? (
          <Toast variant="warning">{t("notificationWarning")}</Toast>
        ) : null}
        {hasGamesError ? (
          <Alert>{t("gamesLoadError")}</Alert>
        ) : null}

        {!hasGamesError && games.length === 0 ? (
          <Card className="py-6" variant="muted">
            <p className="text-base font-semibold text-[#101828]">
              {t("emptyGamesTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              {t("emptyGamesIntro")}
            </p>
          </Card>
        ) : null}

        {!hasGamesError && games.length > 0 ? (
          <section aria-labelledby="upcoming-games-heading">
            <h1
              className="font-matchday mb-3 text-3xl font-bold text-[#061b6b]"
              id="upcoming-games-heading"
            >
              {t("upcomingTitle")}
            </h1>
            <div className="grid gap-4 md:grid-cols-2">
              {games.map((game) => renderGameCard(game))}
            </div>
          </section>
        ) : null}
      </section>

      {isAdmin ? (
        <AdminCreateGameButton
          action={createGame}
          labels={{
            button: t("createGameButton"),
            create: t("createGameSubmit"),
            date: t("createGameDateLabel"),
            createError: t("createGameError"),
            created: t("createGameSuccess"),
            endsAt: t("createGameEndsAtLabel"),
            maxParticipants: t("createGameCapacityLabel"),
            notAuthorized: t("createGameNotAuthorized"),
            repeat: t("createGameRepeatLabel"),
            startsAt: t("createGameStartsAtLabel"),
            title: t("createGameTitle"),
            validationError: t("createGameValidationError"),
          }}
        />
      ) : null}

      <StartupPrompts
        installLabels={{
          close: t("installClose"),
          install: t("installButton"),
          intro: t("installIntro"),
          iosAction: t("installIOSButton"),
          iosInstructions: t("installIOSInstructions"),
          iosTitle: t("installIOSTitle"),
          notNow: t("installDismiss"),
          title: t("installTitle"),
        }}
        notificationLabels={{
          enable: t("notificationEnableButton"),
          intro: t("notificationIntro"),
          notNow: t("notificationDismiss"),
          saveError: t("notificationSaveError"),
          title: t("notificationTitle"),
        }}
        publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      />
    </main>
  );
}
