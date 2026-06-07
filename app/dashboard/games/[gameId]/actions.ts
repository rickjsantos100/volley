"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getRedirectPath(gameId: string, status: string) {
  return `/dashboard/games/${gameId}?status=${status}`;
}

export async function joinGame(gameId: string) {
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
    redirect(getRedirectPath(gameId, "join-error"));
  }

  redirect(getRedirectPath(gameId, "joined-game"));
}

export async function joinWaitlist(gameId: string) {
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
    redirect(getRedirectPath(gameId, "waitlist-error"));
  }

  redirect(getRedirectPath(gameId, "joined-waitlist"));
}

export async function leaveGame(gameId: string) {
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
    redirect(getRedirectPath(gameId, "leave-error"));
  }

  redirect(getRedirectPath(gameId, "left-game"));
}
