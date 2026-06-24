import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enqueueNotification,
  processPendingNotifications,
} from "@/lib/notifications/push";

export const dynamic = "force-dynamic";

type ReminderParticipantRow = {
  game_event_id: string;
  user_id: string;
  game_events: {
    id: string;
    starts_at: string;
    status: "scheduled" | "cancelled" | "completed" | "deleted";
  } | null;
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 3.75 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 4.25 * 60 * 60 * 1000);
  const supabase = createAdminClient();
  const { data: participants, error } = await supabase
    .from("game_participants")
    .select("game_event_id, user_id, game_events!inner(id, starts_at, status)")
    .eq("game_events.status", "scheduled")
    .gte("game_events.starts_at", windowStart.toISOString())
    .lt("game_events.starts_at", windowEnd.toISOString())
    .returns<ReminderParticipantRow[]>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let enqueued = 0;

  for (const participant of participants ?? []) {
    const game = participant.game_events;

    if (!game || game.status !== "scheduled") {
      continue;
    }

    await enqueueNotification({
      dedupeKey: `game_reminder_4h:${participant.game_event_id}:${participant.user_id}`,
      gameEventId: participant.game_event_id,
      kind: "game_reminder_4h",
      payload: {
        body: "O jogo começa dentro de 4 horas. Confirma se continuas dentro.",
        tag: `game-reminder-${participant.game_event_id}`,
        title: "Ainda vens jogar?",
        url: `/dashboard/games/${participant.game_event_id}`,
      },
      userId: participant.user_id,
    });
    enqueued += 1;
  }

  const processed = await processPendingNotifications(50);

  return Response.json({
    enqueued,
    processed,
  });
}
