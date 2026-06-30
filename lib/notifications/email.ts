import "server-only";

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  gameNotificationTemplate,
  type GameEmailKind,
} from "@/lib/notifications/templates/game-notification";

const sender = "Voley Lisboa <noreply@voleylisboa.pt>";

export type DeliveryOutcome = "failed" | "sent" | "skipped";

function getApplicationUrl() {
  const applicationUrl = process.env.APP_URL;
  if (!applicationUrl) {
    throw new Error("APP_URL is not configured.");
  }
  return applicationUrl.replace(/\/+$/, "");
}

export async function sendGameNotificationEmail({
  deliveryKey,
  gameId,
  kind,
  startsAt,
  userId,
}: {
  deliveryKey: string;
  gameId: string;
  kind: GameEmailKind;
  startsAt: string;
  userId: string;
}): Promise<DeliveryOutcome> {
  const supabase = createAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, email_notifications_enabled")
    .eq("id", userId)
    .maybeSingle<{
      email: string | null;
      email_notifications_enabled: boolean;
    }>();

  if (profileError) {
    throw profileError;
  }
  if (!profile?.email || !profile.email_notifications_enabled) {
    return "skipped";
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const gameDate = new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(startsAt));
  const dashboardKinds = new Set<GameEmailKind>([
    "game_cancelled",
    "game_deleted",
  ]);
  const path = dashboardKinds.has(kind)
    ? "/dashboard"
    : `/dashboard/games/${gameId}`;
  const template = gameNotificationTemplate({
    gameDate,
    kind,
    url: `${getApplicationUrl()}${path}`,
  });
  const { error } = await new Resend(apiKey).emails.send(
    {
      from: sender,
      html: template.html,
      subject: template.subject,
      text: template.text,
      to: [profile.email],
    },
    { idempotencyKey: `game-notification/${deliveryKey}` },
  );

  if (error) {
    throw new Error(error.message);
  }
  return "sent";
}
