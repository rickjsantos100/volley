"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import { sendTestNotificationToAllSubscribedUsers } from "@/lib/notifications/push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushSubscriptionInput = {
  auth: string;
  endpoint: string;
  expirationTime: number | null;
  p256dh: string;
};

export type PushActionStatus =
  | "disabled"
  | "not-authorized"
  | "saved"
  | "save-error"
  | "sent"
  | "send-error"
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

export async function sendPushTest(): Promise<{ status: PushActionStatus }> {
  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  if (!user) {
    redirect("/");
  }

  if (profile?.role !== "admin") {
    return { status: "not-authorized" };
  }

  try {
    const result = await sendTestNotificationToAllSubscribedUsers();

    if (result.sent === 0) {
      return { status: "send-error" };
    }

    return { status: "sent" };
  } catch {
    return { status: "send-error" };
  }
}
