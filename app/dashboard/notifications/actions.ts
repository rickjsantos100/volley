"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushSubscriptionInput = {
  auth: string;
  endpoint: string;
  expirationTime: number | null;
  p256dh: string;
};

export type PushActionStatus =
  | "disabled"
  | "saved"
  | "save-error"
  | "unsubscribed"
  | "unsubscribe-error";

function getUserAgent() {
  // Server Actions do not need the exact user agent for correctness.
  return "browser";
}

export async function savePushSubscription(
  subscription: PushSubscriptionInput,
): Promise<{ status: PushActionStatus }> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  if (!subscription.endpoint || !subscription.p256dh || !subscription.auth) {
    return { status: "save-error" };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        auth: subscription.auth,
        endpoint: subscription.endpoint,
        expiration_time: subscription.expirationTime
          ? new Date(subscription.expirationTime).toISOString()
          : null,
        p256dh: subscription.p256dh,
        user_agent: getUserAgent(),
        user_id: user.id,
      },
      { onConflict: "endpoint" },
    );

    if (error) {
      return { status: "save-error" };
    }

    return { status: "saved" };
  } catch {
    return { status: "save-error" };
  }
}

export async function deletePushSubscription(
  endpoint: string,
): Promise<{ status: PushActionStatus }> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  if (!endpoint) {
    return { status: "unsubscribe-error" };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_id", user.id);

    if (error) {
      return { status: "unsubscribe-error" };
    }

    return { status: "unsubscribed" };
  } catch {
    return { status: "unsubscribe-error" };
  }
}
