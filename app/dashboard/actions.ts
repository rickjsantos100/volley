"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CreateGameActionStatus =
  | "created"
  | "invalid"
  | "not-authorized"
  | "create-error";

export type CreateGameActionState = {
  status?: CreateGameActionStatus;
};

function parsePositiveInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseLocalDateTime(value: FormDataEntryValue | null, offset: number) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const utcMilliseconds =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    ) +
    offset * 60 * 1000;
  const date = new Date(utcMilliseconds);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getDurationMinutes(startsAt: Date, endsAt: Date) {
  const durationMilliseconds = endsAt.getTime() - startsAt.getTime();
  const durationMinutes = Math.round(durationMilliseconds / 60000);

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return null;
  }

  return durationMinutes;
}

async function getUserRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { role: null, supabase, user };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: "user" | "admin" }>();

  return { role: profile?.role ?? null, supabase, user };
}

export async function createGame(
  previousState: CreateGameActionState,
  formData: FormData,
): Promise<CreateGameActionState> {
  void previousState;

  const { role, supabase, user } = await getUserRole();

  if (!user) {
    redirect("/");
  }

  if (role !== "admin") {
    return { status: "not-authorized" };
  }

  const maxParticipants = parsePositiveInteger(
    formData.get("maxParticipants"),
  );
  const offset = Number.parseInt(
    String(formData.get("timezoneOffsetMinutes") ?? "0"),
    10,
  );
  const startsAt = parseLocalDateTime(
    formData.get("startsAt"),
    Number.isFinite(offset) ? offset : 0,
  );
  const endsAt = parseLocalDateTime(
    formData.get("endsAt"),
    Number.isFinite(offset) ? offset : 0,
  );
  const durationMinutes = startsAt && endsAt
    ? getDurationMinutes(startsAt, endsAt)
    : null;
  const isRepeatable = formData.get("isRepeatable") === "on";

  if (!durationMinutes || !maxParticipants || !startsAt || !endsAt) {
    return { status: "invalid" };
  }

  const { error } = await supabase.from("game_events").insert({
    created_by: user.id,
    duration_minutes: durationMinutes,
    is_repeatable: isRepeatable,
    max_participants: maxParticipants,
    repeat_frequency: isRepeatable ? "weekly" : null,
    starts_at: startsAt.toISOString(),
    status: "scheduled",
    title: "Volleyball game",
  });

  revalidatePath("/dashboard");

  if (error) {
    return { status: "create-error" };
  }

  return { status: "created" };
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
