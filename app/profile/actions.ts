"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

type UpdateProfileState = {
  errors?: {
    firstName?: string;
    lastName?: string;
    form?: string;
  };
  success?: boolean;
  profile?: {
    firstName: string;
    lastName: string;
  };
};

function getRequiredText(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return value.trim();
}

export async function updateEmailNotifications(
  _previousState: { success?: boolean; error?: string },
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const [supabase, user] = await Promise.all([
    createClient(),
    getCurrentUser(),
  ]);

  if (!user) {
    return { error: "notAuthenticated" };
  }

  const enabled = formData.get("emailNotificationsEnabled") === "true";

  const { error } = await supabase
    .from("profiles")
    .update({ email_notifications_enabled: enabled })
    .eq("id", user.id);

  if (error) {
    return { error: "updateFailed" };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/profile");

  return { success: true };
}

export async function updateProfile(
  _previousState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const firstName = getRequiredText(formData, "firstName");
  const lastName = getRequiredText(formData, "lastName");

  if (!firstName || !lastName) {
    return {
      errors: {
        firstName: firstName ? undefined : "firstNameRequired",
        lastName: lastName ? undefined : "lastNameRequired",
      },
    };
  }

  const [supabase, user] = await Promise.all([
    createClient(),
    getCurrentUser(),
  ]);

  if (!user) {
    return {
      errors: {
        form: "notAuthenticated",
      },
    };
  }

  const displayName = `${firstName} ${lastName}`;
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
    })
    .eq("id", user.id);

  if (error) {
    return {
      errors: {
        form: "updateFailed",
      },
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/profile");

  return {
    success: true,
    profile: {
      firstName,
      lastName,
    },
  };
}
