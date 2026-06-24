import { NextRequest } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const calendarLocation = "ACM/YMCA Lisboa";
const mapsUrl =
  "https://www.google.com/maps/place/ACM%2FYMCA+Lisboa/@38.7182879,-9.1582447,17z/data=!3m1!4b1!4m6!3m5!1s0xd19337b46b17f9d:0x655114031277fde9!8m2!3d38.7182879!4d-9.1556698!16s%2Fg%2F11c1yj7g8h";

type CalendarGameRow = {
  id: string;
  duration_minutes: number;
  starts_at: string;
  status: "scheduled" | "cancelled" | "completed" | "deleted";
};

type CalendarRouteContext = {
  params: Promise<{
    gameId: string;
  }>;
};

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatCalendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function foldCalendarLine(line: string) {
  const chunks: string[] = [];

  for (let index = 0; index < line.length; index += 74) {
    chunks.push(`${index === 0 ? "" : " "}${line.slice(index, index + 74)}`);
  }

  return chunks.join("\r\n");
}

function buildCalendar({
  game,
  request,
}: {
  game: CalendarGameRow;
  request: NextRequest;
}) {
  const startsAt = new Date(game.starts_at);
  const endsAt = new Date(startsAt.getTime() + game.duration_minutes * 60_000);
  const gameUrl = new URL(`/dashboard/games/${game.id}`, request.nextUrl.origin)
    .href;
  const description = [
    "Jogo do Voley Lisboa.",
    `Detalhes: ${gameUrl}`,
    `Localização: ${mapsUrl}`,
  ].join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Voley Lisboa//Game Calendar//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${game.id}@voley-lisboa`,
    `DTSTAMP:${formatCalendarDate(new Date())}`,
    `DTSTART:${formatCalendarDate(startsAt)}`,
    `DTEND:${formatCalendarDate(endsAt)}`,
    `SUMMARY:${escapeCalendarText("Voley Lisboa")}`,
    `LOCATION:${escapeCalendarText(calendarLocation)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    `URL:${gameUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldCalendarLine).join("\r\n")}\r\n`;
}

export async function GET(request: NextRequest, context: CalendarRouteContext) {
  const [{ gameId }, user, profile, supabase] = await Promise.all([
    context.params,
    getCurrentUser(),
    getCurrentProfile(),
    createClient(),
  ]);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: game, error } = await supabase
    .from("game_events")
    .select("id, starts_at, duration_minutes, status")
    .eq("id", gameId)
    .maybeSingle<CalendarGameRow>();

  if (error || !game || game.status === "deleted") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (game.status === "cancelled" && profile?.role !== "admin") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const startsAt = new Date(game.starts_at);
  const filenameDate = startsAt.toISOString().slice(0, 10);

  return new Response(buildCalendar({ game, request }), {
    headers: {
      "Content-Disposition": `attachment; filename="voley-lisboa-${filenameDate}.ics"`,
      "Content-Type": "text/calendar; charset=utf-8",
    },
  });
}
