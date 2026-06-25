"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getSafeAuthRedirectPath } from "@/lib/safe-auth-redirect";
import { createClient } from "@/lib/supabase/server";

export type AuthErrorKey =
  | "invalid-email"
  | "magic-link-failed"
  | "missing-name"
  | "signup-failed";

export type AuthActionState = {
  error?: AuthErrorKey;
  success?: "magic-link-sent";
};

function getEmail(formData: FormData) {
  const email = formData.get("email");

  if (typeof email !== "string" || !email.trim()) {
    return null;
  }

  return email.trim().toLowerCase();
}

function getRequiredText(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return value.trim();
}

async function getAuthCallbackUrl(formData: FormData) {
  const redirectPath =
    getSafeAuthRedirectPath(formData.get("next")) ?? "/dashboard";
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");
  const origin = host ? `${protocol}://${host}` : "http://127.0.0.1:3000";
  const callbackUrl = new URL("/auth/callback", origin);

  callbackUrl.searchParams.set("next", redirectPath);

  return callbackUrl.toString();
}

export async function signIn(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getEmail(formData);

  if (!email) {
    return { error: "invalid-email" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: await getAuthCallbackUrl(formData),
      shouldCreateUser: false,
    },
  });

  if (error) {
    return { error: "magic-link-failed" };
  }

  revalidatePath("/", "layout");
  return { success: "magic-link-sent" };
}

export async function signUp(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getEmail(formData);
  const firstName = getRequiredText(formData, "firstName");
  const lastName = getRequiredText(formData, "lastName");

  if (!email) {
    return { error: "invalid-email" };
  }

  if (!firstName || !lastName) {
    return { error: "missing-name" };
  }

  const displayName = `${firstName} ${lastName}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: await getAuthCallbackUrl(formData),
      shouldCreateUser: true,
      data: {
        display_name: displayName,
        first_name: firstName,
        full_name: displayName,
        last_name: lastName,
      },
    },
  });

  if (error) {
    return { error: "signup-failed" };
  }

  revalidatePath("/", "layout");
  return { success: "magic-link-sent" };
}
