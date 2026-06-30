import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  role: "user" | "admin";
  avatar_path: string | null;
  avatar_updated_at: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email_notifications_enabled: boolean;
};

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getCurrentProfile = cache(
  async (): Promise<CurrentProfile | null> => {
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "role, avatar_path, avatar_updated_at, display_name, first_name, last_name, email_notifications_enabled",
      )
      .eq("id", user.id)
      .maybeSingle<CurrentProfile>();

    return profile ?? null;
  },
);

export async function requireUser(redirectTo = "/") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectTo);
  }

  return user;
}

export async function requireAdmin(redirectTo = "/") {
  const [user, profile] = await Promise.all([
    requireUser(redirectTo),
    getCurrentProfile(),
  ]);

  if (profile?.role !== "admin") {
    return null;
  }

  return { profile, user };
}
