"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import {
  isPhoneCountryCode,
  isPhoneNumber,
  normalizePhoneNumber,
} from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

type UpdateProfileState = {
  errors?: {
    firstName?: string;
    lastName?: string;
    phoneCountryCode?: string;
    phoneNumber?: string;
    form?: string;
  };
  success?: boolean;
  profile?: {
    firstName: string;
    lastName: string;
    phoneCountryCode: string;
    phoneNumber: string;
  };
};

export type UpdatePhoneNumberState = {
  errors?: {
    form?: string;
    phoneCountryCode?: string;
    phoneNumber?: string;
  };
  success?: boolean;
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
  const phoneCountryCode = getRequiredText(formData, "phoneCountryCode");
  const rawPhoneNumber = getRequiredText(formData, "phoneNumber");
  const phoneNumber = rawPhoneNumber ? normalizePhoneNumber(rawPhoneNumber) : null;

  if (!firstName || !lastName) {
    return {
      errors: {
        firstName: firstName ? undefined : "firstNameRequired",
        lastName: lastName ? undefined : "lastNameRequired",
      },
    };
  }

  if (
    !phoneCountryCode ||
    !phoneNumber ||
    !isPhoneCountryCode(phoneCountryCode) ||
    !isPhoneNumber(phoneNumber)
  ) {
    return {
      errors: {
        phoneCountryCode: isPhoneCountryCode(phoneCountryCode ?? "")
          ? undefined
          : "phoneCountryCodeRequired",
        phoneNumber: isPhoneNumber(phoneNumber ?? "")
          ? undefined
          : "phoneNumberInvalid",
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
      phone_country_code: phoneCountryCode,
      phone_number: phoneNumber,
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
      phoneCountryCode,
      phoneNumber,
    },
  };
}

export async function updatePhoneNumber(
  _previousState: UpdatePhoneNumberState,
  formData: FormData,
): Promise<UpdatePhoneNumberState> {
  const phoneCountryCode = getRequiredText(formData, "phoneCountryCode");
  const rawPhoneNumber = getRequiredText(formData, "phoneNumber");
  const phoneNumber = rawPhoneNumber ? normalizePhoneNumber(rawPhoneNumber) : null;

  if (
    !phoneCountryCode ||
    !phoneNumber ||
    !isPhoneCountryCode(phoneCountryCode) ||
    !isPhoneNumber(phoneNumber)
  ) {
    return {
      errors: {
        phoneCountryCode: isPhoneCountryCode(phoneCountryCode ?? "")
          ? undefined
          : "phoneCountryCodeRequired",
        phoneNumber: isPhoneNumber(phoneNumber ?? "")
          ? undefined
          : "phoneNumberInvalid",
      },
    };
  }

  const [supabase, user] = await Promise.all([
    createClient(),
    getCurrentUser(),
  ]);

  if (!user) {
    return { errors: { form: "notAuthenticated" } };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      phone_country_code: phoneCountryCode,
      phone_number: phoneNumber,
    })
    .eq("id", user.id);

  if (error) {
    return { errors: { form: "updateFailed" } };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/profile");

  return { success: true };
}
