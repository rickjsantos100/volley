import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminCreateGameButton } from "@/components/admin-create-game-button";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, cardClassName } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { formatGameDateTitle } from "@/lib/format-game-date-title";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/format-duration";
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
};

type ProfileRoleRow = {
  role: "user" | "admin";
};

export default async function DashboardPage() {
  const [t, supabase] = await Promise.all([
    getTranslations("DashboardPage"),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 30);

  const [
    { data: profile },
    { data: gameRows, error: gamesError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<ProfileRoleRow>(),
    supabase
      .from("game_events")
      .select(
        "id, starts_at, duration_minutes, max_participants, is_repeatable, status",
      )
      .in("status", ["scheduled", "cancelled"])
      .gte("starts_at", now.toISOString())
      .lte("starts_at", horizon.toISOString())
      .order("starts_at", { ascending: true }),
  ]);
  const games = (gameRows ?? []) as GameEvent[];
  const isAdmin = profile?.role === "admin";
  const gameIds = games.map((game) => game.id);
  const { data: participantRows, error: participantsError } = gameIds.length
    ? await supabase
        .from("game_participants")
        .select("game_event_id")
        .in("game_event_id", gameIds)
    : { data: [], error: null };
  const hasGamesError = Boolean(gamesError || participantsError);
  const participantCounts = (
    (participantRows ?? []) as GameParticipantCountRow[]
  ).reduce<Record<string, number>>((counts, participant) => {
    counts[participant.game_event_id] =
      (counts[participant.game_event_id] ?? 0) + 1;
    return counts;
  }, {});
  const featuredGame = games.find((game) => game.status === "scheduled");
  const remainingGames = featuredGame
    ? games.filter((game) => game.id !== featuredGame.id)
    : games;

  function renderGameCard(
    game: GameEvent,
    featured = false,
    headingLevel: "h2" | "h3" = "h2",
  ) {
    const occupiedSlots = participantCounts[game.id] ?? 0;
    const isFull = occupiedSlots >= game.max_participants;
    const isCancelled = game.status === "cancelled";
    const statusLabel = isCancelled
      ? t("cancelledLabel")
      : isFull
        ? t("fullLabel")
        : t("availableLabel");
    const variant = featured
      ? "featured"
      : isCancelled
        ? "cancelled"
        : "default";
    const statusEdge =
      featured || isCancelled
        ? ""
        : isFull
          ? "border-l-4 border-l-[#ffd21a]"
          : "border-l-4 border-l-[#138a5b]";
    const GameHeading = headingLevel;
    const content = (
      <>
        <div className="flex items-start justify-between gap-4">
          <GameHeading
            className={
              featured
                ? "font-matchday text-4xl leading-[38px] font-bold text-white sm:text-5xl sm:leading-none"
                : "font-matchday text-[26px] leading-7 font-bold text-[#061b6b]"
            }
          >
            {formatGameDateTitle(new Date(game.starts_at))}
          </GameHeading>
          <Badge
            className={
              featured && !isCancelled
                ? "border-white/20 bg-white/10 text-white"
                : undefined
            }
            variant={isCancelled ? "danger" : isFull ? "soft" : "success"}
          >
            {statusLabel}
          </Badge>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <dt
              className={`text-xs font-bold tracking-[0.08em] uppercase ${featured ? "text-white/70" : "text-[#667085]"}`}
            >
              {t("durationLabel")}
            </dt>
            <dd className="mt-1 font-semibold">
              {formatDuration(game.duration_minutes)}
            </dd>
          </div>
          <div>
            <dt
              className={`text-xs font-bold tracking-[0.08em] uppercase ${featured ? "text-white/70" : "text-[#667085]"}`}
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
        {featured ? (
          <span className="mt-6 flex min-h-11 items-center justify-center rounded-[10px] border border-[#ffd21a] bg-[#ffd21a] px-5 py-3 text-sm font-bold text-[#061b6b] sm:w-fit">
            {t("viewGameLabel")}
          </span>
        ) : null}
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
          className: `block ${statusEdge} transition-[border-color,box-shadow,transform] hover:border-[#0737a8] hover:shadow-[0_12px_28px_rgba(16,24,40,0.11)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 active:translate-y-px`,
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
          <div className="grid gap-6">
            {featuredGame ? (
              <section aria-labelledby="next-game-heading">
                <h1
                  className="font-matchday mb-3 text-3xl font-bold text-[#061b6b]"
                  id="next-game-heading"
                >
                  {t("nextGameTitle")}
                </h1>
                {renderGameCard(featuredGame, true)}
              </section>
            ) : null}
            {remainingGames.length > 0 ? (
              <section aria-labelledby="more-games-heading">
                {featuredGame ? (
                  <h2
                    className="font-matchday mb-3 text-3xl font-bold text-[#061b6b]"
                    id="more-games-heading"
                  >
                    {t("moreGamesTitle")}
                  </h2>
                ) : (
                  <h1
                    className="font-matchday mb-3 text-3xl font-bold text-[#061b6b]"
                    id="more-games-heading"
                  >
                    {t("moreGamesTitle")}
                  </h1>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {remainingGames.map((game) =>
                    renderGameCard(game, false, featuredGame ? "h3" : "h2"),
                  )}
                </div>
              </section>
            ) : null}
          </div>
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

      <PwaInstallPrompt
        labels={{
          close: t("installClose"),
          install: t("installButton"),
          intro: t("installIntro"),
          iosAction: t("installIOSButton"),
          iosInstructions: t("installIOSInstructions"),
          iosTitle: t("installIOSTitle"),
          notNow: t("installDismiss"),
          title: t("installTitle"),
        }}
      />
    </main>
  );
}
