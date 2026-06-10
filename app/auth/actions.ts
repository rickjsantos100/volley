"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD_LENGTH = 8;

export type AuthErrorKey =
  | "invalid-email"
  | "invalid-password"
  | "login-failed"
  | "missing-name"
  | "email-confirmation-enabled"
  | "signup-failed";

export type AuthActionState = {
  error?: AuthErrorKey;
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

function getPassword(formData: FormData) {
  const password = formData.get("password");

  if (typeof password !== "string") {
    return null;
  }

  return password;
}

export async function signIn(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getEmail(formData);
  const password = getPassword(formData);

  if (!email) {
    return { error: "invalid-email" };
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { error: "invalid-password" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "login-failed" };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getEmail(formData);
  const firstName = getRequiredText(formData, "firstName");
  const lastName = getRequiredText(formData, "lastName");
  const password = getPassword(formData);

  if (!email) {
    return { error: "invalid-email" };
  }

  if (!firstName || !lastName) {
    return { error: "missing-name" };
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { error: "invalid-password" };
  }

  const displayName = `${firstName} ${lastName}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
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

  if (data.session) {
    redirect("/dashboard");
  }

  return { error: "email-confirmation-enabled" };
}
