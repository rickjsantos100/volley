import { createAdminClient } from "@/lib/supabase/admin";
import { paymentProofBucket } from "@/lib/payment-proofs";

export const dynamic = "force-dynamic";

type GameRow = {
  duration_minutes: number;
  id: string;
  starts_at: string;
};

type StorageEntry = {
  id: string | null;
  name: string;
};

async function listAll(path?: string) {
  const supabase = createAdminClient();
  const entries: StorageEntry[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(paymentProofBucket)
      .list(path, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      throw error;
    }

    const page = (data ?? []) as StorageEntry[];
    entries.push(...page);

    if (page.length < 100) {
      return entries;
    }

    offset += page.length;
  }
}

async function listGameProofPaths(gameId: string) {
  const userDirectories = await listAll(gameId);
  const paths: string[] = [];

  for (const userDirectory of userDirectories) {
    if (userDirectory.id) {
      paths.push(`${gameId}/${userDirectory.name}`);
      continue;
    }

    const files = await listAll(`${gameId}/${userDirectory.name}`);
    paths.push(
      ...files
        .filter((file) => Boolean(file.id))
        .map((file) => `${gameId}/${userDirectory.name}/${file.name}`),
    );
  }

  return paths;
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: games, error: gamesError } = await supabase
    .from("game_events")
    .select("id, starts_at, duration_minutes")
    .returns<GameRow[]>();

  if (gamesError) {
    return Response.json({ error: gamesError.message }, { status: 500 });
  }

  const now = Date.now();
  const retentionMs = 14 * 24 * 60 * 60 * 1000;
  const gameById = new Map((games ?? []).map((game) => [game.id, game]));
  const gameDirectories = await listAll();
  const expiredGameIds = new Set<string>();
  let deletedFiles = 0;

  for (const directory of gameDirectories) {
    if (directory.id) {
      continue;
    }

    const game = gameById.get(directory.name);
    const deleteAfter = game
      ? new Date(game.starts_at).getTime() +
        game.duration_minutes * 60_000 +
        retentionMs
      : 0;

    if (game && deleteAfter > now) {
      continue;
    }

    const paths = await listGameProofPaths(directory.name);

    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(paymentProofBucket)
        .remove(paths);

      if (removeError) {
        console.error("Failed to delete expired payment proofs", {
          gameId: directory.name,
          removeError,
        });
        continue;
      }

      deletedFiles += paths.length;
    }

    if (game) {
      expiredGameIds.add(game.id);
    }
  }

  for (const game of games ?? []) {
    const deleteAfter =
      new Date(game.starts_at).getTime() +
      game.duration_minutes * 60_000 +
      retentionMs;

    if (deleteAfter <= now) {
      expiredGameIds.add(game.id);
    }
  }

  if (expiredGameIds.size > 0) {
    const { error: updateError } = await supabase
      .from("game_payment_proofs")
      .update({
        proof_deleted_at: new Date().toISOString(),
        proof_filename: null,
        proof_mime_type: null,
        proof_path: null,
      })
      .in("game_event_id", [...expiredGameIds]);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }
  }

  return Response.json({
    deletedFiles,
    expiredGames: expiredGameIds.size,
  });
}
