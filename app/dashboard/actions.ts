"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { parseGameSchedule } from "@/lib/game-schedule";

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

  const parsed = /^\d+$/.test(value) ? Number(value) : NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function getUserRole() {
  const [supabase, user, profile] = await Promise.all([
    createClient(),
    getCurrentUser(),
    getCurrentProfile(),
  ]);

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
  const schedule = parseGameSchedule(formData.get("startsAt"), formData.get("endsAt"));
  const { startsAt, endsAt, durationMinutes } = schedule ?? {};
  const isRepeatable = formData.get("isRepeatable") === "on";

  if (
    !durationMinutes ||
    !maxParticipants ||
    !startsAt ||
    !endsAt ||
    startsAt.getTime() < Date.now()
  ) {
    console.warn("game_mutation_rejected", { operation: "create", reason: "invalid_schedule_or_capacity" });
    return { status: "invalid" };
  }

  const { error } = isRepeatable
    ? await supabase.from("recurring_game_series").insert({
        active: true,
        created_by: user.id,
        duration_minutes: durationMinutes,
        frequency: "weekly",
        max_participants: maxParticipants,
        starts_at: startsAt.toISOString(),
        timezone: "Europe/Lisbon",
        title: "Volleyball game",
      })
    : await supabase.from("game_events").insert({
        created_by: user.id,
        duration_minutes: durationMinutes,
        is_repeatable: false,
        max_participants: maxParticipants,
        repeat_frequency: null,
        starts_at: startsAt.toISOString(),
        status: "scheduled",
        title: "Volleyball game",
      });

  revalidatePath("/dashboard");

  if (error) {
    console.error("game_mutation_failed", { operation: "create", target: isRepeatable ? "series" : "game", code: error.code });
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
