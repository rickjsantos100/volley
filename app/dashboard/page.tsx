import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatGameDateTitle } from "@/lib/format-game-date-title";
import { createClient } from "@/lib/supabase/server";

type GameEvent = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  max_participants: number;
  is_repeatable: boolean;
};

type GameParticipantCountRow = {
  game_event_id: string;
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

  const { data: gameRows, error: gamesError } = await supabase
    .from("game_events")
    .select(
      "id, starts_at, duration_minutes, max_participants, is_repeatable",
    )
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  const games = (gameRows ?? []) as GameEvent[];
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
    <main className="min-h-screen bg-[#f2f0eb] px-4 py-20 text-[rgba(0,0,0,0.87)] sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-5xl">
        {hasGamesError ? (
          <p className="rounded-xl bg-[hsl(4_82%_43%_/_5%)] px-4 py-3 text-sm font-medium text-[#c82014]">
            {t("gamesLoadError")}
          </p>
        ) : null}

        {!hasGamesError && games.length === 0 ? (
          <div className="rounded-xl border border-[rgba(0,0,0,0.14)] bg-white px-5 py-6 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)]">
            <p className="text-base font-semibold text-[#33433d]">
              {t("emptyGamesTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgba(0,0,0,0.58)]">
              {t("emptyGamesIntro")}
            </p>
          </div>
        ) : null}

        {!hasGamesError && games.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {games.map((game) => {
              const occupiedSlots = participantCounts[game.id] ?? 0;
              const isFull = occupiedSlots >= game.max_participants;

              return (
                <Link
                  key={game.id}
                  href={`/dashboard/games/${game.id}`}
                  className="rounded-xl bg-white px-5 py-5 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)] transition hover:shadow-[0_2px_10px_rgba(0,0,0,0.14)] active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold tracking-[-0.01em] text-[#006241]">
                        {formatGameDateTitle(new Date(game.starts_at))}
                      </h3>
                    </div>

                    {isFull ? (
                      <span className="rounded-full bg-[#1E3932] px-3 py-1 text-xs font-semibold text-white">
                        {t("fullLabel")}
                      </span>
                    ) : null}
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#f9f9f9] px-4 py-3">
                      <dt className="text-xs font-semibold tracking-[0.1em] text-[rgba(0,0,0,0.58)] uppercase">
                        {t("durationLabel")}
                      </dt>
                      <dd className="mt-1 text-base font-semibold text-[#33433d]">
                        {t("durationValue", {
                          minutes: game.duration_minutes,
                        })}
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
    </main>
  );
}
