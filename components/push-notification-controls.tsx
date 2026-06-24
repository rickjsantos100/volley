"use client";

import { useEffect, useState, useTransition } from "react";
import {
  savePushSubscription,
  sendPushTest,
  type PushActionStatus,
  type PushSubscriptionInput,
} from "@/app/dashboard/notifications/actions";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { isInstalledPwaDisplayMode } from "@/lib/pwa/display-mode";

type PushNotificationControlsProps = {
  isAdmin: boolean;
  labels: {
    denied: string;
    disabled: string;
    enable: string;
    enabled: string;
    notSupported: string;
    saveError: string;
    saved: string;
    sendError: string;
    sent: string;
    test: string;
    title: string;
  };
  publicKey: string;
};

type BrowserPushState =
  | "checking"
  | "denied"
  | "disabled"
  | "enabled"
  | "hidden"
  | "not-supported";

function base64UrlToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function isPushSupported(publicKey: string) {
  return Boolean(
    publicKey &&
      "Notification" in window &&
      "PushManager" in window &&
      "serviceWorker" in navigator,
  );
}

function toInput(subscription: PushSubscription): PushSubscriptionInput | null {
  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys?.auth || !json.keys.p256dh) {
    return null;
  }

  return {
    auth: json.keys.auth,
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    p256dh: json.keys.p256dh,
  };
}

async function saveBrowserSubscription(publicKey: string) {
  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      applicationServerKey: base64UrlToUint8Array(publicKey),
      userVisibleOnly: true,
    }));
  const input = toInput(subscription);

  if (!input) {
    return null;
  }

  const result = await savePushSubscription(input);
  return result.status === "saved" ? subscription : null;
}

export function PushNotificationControls({
  isAdmin,
  labels,
  publicKey,
}: PushNotificationControlsProps) {
  const [state, setState] = useState<BrowserPushState>("checking");
  const [message, setMessage] = useState<PushActionStatus | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function checkSubscription() {
      if (!isInstalledPwaDisplayMode()) {
        setState("hidden");
        return;
      }

      if (!isPushSupported(publicKey)) {
        setState("not-supported");
        return;
      }

      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }

      if (Notification.permission === "granted") {
        const subscription = await saveBrowserSubscription(publicKey);
        setState(subscription ? "enabled" : "disabled");
        return;
      }

      setState("disabled");
    }

    void checkSubscription().catch(() => setState("not-supported"));
  }, [publicKey]);

  function enableNotifications() {
    startTransition(async () => {
      if (!isPushSupported(publicKey)) {
        setState("not-supported");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission === "denied") {
        setState("denied");
        return;
      }

      if (permission !== "granted") {
        setState("disabled");
        return;
      }

      const subscription = await saveBrowserSubscription(publicKey);
      setState(subscription ? "enabled" : "disabled");
      setMessage(subscription ? "saved" : "save-error");
    });
  }

  function sendTestNotification() {
    startTransition(async () => {
      if (state !== "enabled") {
        return;
      }

      const result = await sendPushTest();
      setMessage(result.status);
    });
  }

  const description =
    state === "checking"
      ? labels.disabled
      : state === "not-supported"
        ? labels.notSupported
        : state === "denied"
          ? labels.denied
          : state === "enabled"
            ? labels.enabled
            : labels.disabled;
  const messageLabel = message
    ? {
        "not-authorized": labels.sendError,
        disabled: labels.disabled,
        saved: labels.saved,
        "save-error": labels.saveError,
        sent: labels.sent,
        "send-error": labels.sendError,
        unsubscribed: labels.disabled,
        "unsubscribe-error": labels.saveError,
      }[message]
    : null;
  const isError =
    message === "save-error" ||
    message === "send-error" ||
    message === "not-authorized";

  if (state === "checking" || state === "hidden") {
    return null;
  }

  return (
    <>
      {messageLabel ? (
        <Toast variant={isError ? "error" : "success"}>{messageLabel}</Toast>
      ) : null}

      <section className="border-t border-[#dde2ea] pt-4">
        <h3 className="text-sm font-bold text-[#101828]">{labels.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#667085]">
          {description}
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          {state === "disabled" ? (
            <Button
              disabled={isPending}
              loading={isPending}
              onClick={enableNotifications}
              type="button"
            >
              {labels.enable}
            </Button>
          ) : null}
          {isAdmin && state === "enabled" ? (
            <Button
              disabled={isPending}
              loading={isPending}
              onClick={sendTestNotification}
              type="button"
              variant="outline"
            >
              {labels.test}
            </Button>
          ) : null}
        </div>
      </section>
    </>
  );
}
