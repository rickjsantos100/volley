"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSafeAuthRedirectPath } from "@/lib/safe-auth-redirect";
import { createClient } from "@/lib/supabase/server";

export type AuthErrorKey =
  | "invalid-email"
  | "otp-send-failed"
  | "missing-name"
  | "signup-failed";

export type AuthActionState = {
  error?: AuthErrorKey;
  email?: string;
  success?: "otp-sent";
};

export type VerifyOtpErrorKey =
  | "invalid-email"
  | "invalid-otp"
  | "otp-verification-failed";

export type VerifyOtpActionState = {
  error?: VerifyOtpErrorKey;
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

function getOtpToken(formData: FormData) {
  const token = formData.get("token");

  if (typeof token !== "string") {
    return null;
  }

  const normalizedToken = token.replace(/\D/g, "");

  if (normalizedToken.length !== 6) {
    return null;
  }

  return normalizedToken;
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
      shouldCreateUser: false,
    },
  });

  if (error) {
    return { error: "otp-send-failed" };
  }

  revalidatePath("/", "layout");
  return { email, success: "otp-sent" };
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
  return { email, success: "otp-sent" };
}

export async function verifyEmailOtp(
  _previousState: VerifyOtpActionState,
  formData: FormData,
): Promise<VerifyOtpActionState> {
  const email = getEmail(formData);
  const token = getOtpToken(formData);
  const redirectPath =
    getSafeAuthRedirectPath(formData.get("next")) ?? "/dashboard";

  if (!email) {
    return { error: "invalid-email" };
  }

  if (!token) {
    return { error: "invalid-otp" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { error: "otp-verification-failed" };
  }

  revalidatePath("/", "layout");
  redirect(redirectPath);
}
