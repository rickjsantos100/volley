"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type GameActionStatus =
  | "joined-game"
  | "joined-waitlist"
  | "left-game"
  | "cancelled-game"
  | "join-error"
  | "waitlist-error"
  | "leave-error"
  | "cancel-error"
  | "delete-error"
  | "not-authorized";

export type GameActionState = {
  status?: GameActionStatus;
};

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

export async function joinGame(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { error } = await supabase.from("game_participants").insert({
    game_event_id: gameId,
    user_id: user.id,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "join-error" };
  }

  return { status: "joined-game" };
}

export async function joinWaitlist(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { error } = await supabase.from("game_waitlist_entries").insert({
    game_event_id: gameId,
    user_id: user.id,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "waitlist-error" };
  }

  return { status: "joined-waitlist" };
}

export async function leaveGame(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { error } = await supabase
    .from("game_participants")
    .delete()
    .eq("game_event_id", gameId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "leave-error" };
  }

  return { status: "left-game" };
}

export async function cancelGame(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const { role, supabase, user } = await getUserRole();

  if (!user) {
    redirect("/");
  }

  if (role !== "admin") {
    return { status: "not-authorized" };
  }

  const { error } = await supabase
    .from("game_events")
    .update({ status: "cancelled" })
    .eq("id", gameId);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "cancel-error" };
  }

  return { status: "cancelled-game" };
}

export async function deleteGame(
  gameId: string,
  previousState: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  void previousState;
  void formData;

  const { role, supabase, user } = await getUserRole();

  if (!user) {
    redirect("/");
  }

  if (role !== "admin") {
    return { status: "not-authorized" };
  }

  const { error } = await supabase.from("game_events").delete().eq("id", gameId);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/games/${gameId}`);

  if (error) {
    return { status: "delete-error" };
  }

  redirect("/dashboard");
}
