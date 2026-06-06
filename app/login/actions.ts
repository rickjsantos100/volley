"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD_LENGTH = 8;

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

export async function signIn(formData: FormData) {
  const email = getEmail(formData);
  const password = getPassword(formData);

  if (!email) {
    redirect("/login?error=invalid-email");
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    redirect("/login?error=invalid-password");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=login-failed");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = getEmail(formData);
  const firstName = getRequiredText(formData, "firstName");
  const lastName = getRequiredText(formData, "lastName");
  const password = getPassword(formData);

  if (!email) {
    redirect("/login?error=invalid-email");
  }

  if (!firstName || !lastName) {
    redirect("/login?error=missing-name");
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    redirect("/login?error=invalid-password");
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
    redirect("/login?error=signup-failed");
  }

  revalidatePath("/", "layout");

  if (data.session) {
    redirect("/dashboard");
  }

  redirect("/login?error=email-confirmation-enabled");
}
