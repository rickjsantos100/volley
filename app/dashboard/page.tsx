import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminCreateGameButton } from "@/components/admin-create-game-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, cardClassName } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
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
  status: "scheduled" | "cancelled" | "completed";
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
      .gte("starts_at", new Date().toISOString())
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
  return (
    <main className="min-h-screen bg-[#f2f0eb] px-4 py-20 pb-32 text-[rgba(0,0,0,0.87)] sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-5xl">
        {hasGamesError ? (
          <Alert>{t("gamesLoadError")}</Alert>
        ) : null}

        {!hasGamesError && games.length === 0 ? (
          <Card className="py-6" variant="muted">
            <p className="text-base font-semibold text-[#33433d]">
              {t("emptyGamesTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgba(0,0,0,0.58)]">
              {t("emptyGamesIntro")}
            </p>
          </Card>
        ) : null}

        {!hasGamesError && games.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {games.map((game) => {
              const occupiedSlots = participantCounts[game.id] ?? 0;
              const isFull = occupiedSlots >= game.max_participants;
              const isCancelled = game.status === "cancelled";

              return (
                <Link
                  key={game.id}
                  aria-disabled={isCancelled}
                  href={`/dashboard/games/${game.id}`}
                  className={cardClassName({
                    className:
                      "block transition active:scale-[0.99] hover:shadow-[0_2px_10px_rgba(0,0,0,0.14)]",
                    variant: isCancelled ? "cancelled" : "default",
                  })}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold tracking-[-0.01em] text-[#006241]">
                        {formatGameDateTitle(new Date(game.starts_at))}
                      </h3>
                    </div>

                    {isCancelled ? (
                      <Badge variant="danger">{t("cancelledLabel")}</Badge>
                    ) : isFull ? (
                      <Badge>{t("fullLabel")}</Badge>
                    ) : null}
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-3">
                    <StatTile
                      label={t("durationLabel")}
                      value={formatDuration(game.duration_minutes)}
                    />
                    <StatTile
                      label={t("slotsLabel")}
                      value={t("slotsValue", {
                        occupied: occupiedSlots,
                        capacity: game.max_participants,
                      })}
                    />
                  </dl>

                  {game.is_repeatable ? (
                    <p className="mt-4 text-sm font-medium text-[#00754A]">
                      {t("repeatLabel")}
                    </p>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>

      {isAdmin ? (
        <AdminCreateGameButton
          action={createGame}
          labels={{
            button: t("createGameButton"),
            cancel: t("createGameCancel"),
            create: t("createGameSubmit"),
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
    </main>
  );
}
