import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchGameNotification } from "@/lib/notifications/game";

export const dynamic = "force-dynamic";

type ReminderParticipantRow = {
  game_event_id: string;
  id: string;
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
    .select("id, game_event_id, user_id, game_events!inner(id, starts_at, status)")
    .eq("game_events.status", "scheduled")
    .gte("game_events.starts_at", windowStart.toISOString())
    .lt("game_events.starts_at", windowEnd.toISOString())
    .returns<ReminderParticipantRow[]>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const eligibleParticipants = (participants ?? []).filter(
    (participant) => participant.game_events?.status === "scheduled",
  );
  const results = await Promise.allSettled(
    eligibleParticipants.map((participant) => {
      const game = participant.game_events!;
      return dispatchGameNotification({
        deliveryVersion: game.starts_at,
        gameId: participant.game_event_id,
        kind: "game_reminder_4h",
        recipients: [
          {
            participantId: participant.id,
            userId: participant.user_id,
          },
        ],
        startsAt: game.starts_at,
      });
    }),
  );
  const delivery = {
    emailFailed: 0,
    pushFailed: 0,
    recipients: eligibleParticipants.length,
  };

  for (const result of results) {
    if (result.status === "fulfilled") {
      delivery.emailFailed += result.value.email.failed;
      delivery.pushFailed += result.value.push.failed;
    } else {
      delivery.emailFailed += 1;
      delivery.pushFailed += 1;
    }
  }

  return Response.json({ delivery });
}
