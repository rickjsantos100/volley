"use client";

import { useEffect, useState, useTransition } from "react";
import {
  savePushSubscription,
  type PushSubscriptionInput,
} from "@/app/dashboard/notifications/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { isInstalledPwaDisplayMode } from "@/lib/pwa/display-mode";

const DISMISSED_STORAGE_KEY = "voley-lisboa:push-startup-dismissed:v1";

type NotificationStartupPromptProps = {
  active: boolean;
  labels: {
    enable: string;
    intro: string;
    notNow: string;
    saveError: string;
    title: string;
  };
  publicKey: string;
};

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

export function NotificationStartupPrompt({
  active,
  labels,
  publicKey,
}: NotificationStartupPromptProps) {
  const [open, setOpen] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!active || !isInstalledPwaDisplayMode() || !isPushSupported(publicKey)) {
      return;
    }

    const dismissed =
      window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "true";

    if (!dismissed && Notification.permission === "default") {
      const timeout = window.setTimeout(() => setOpen(true), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [active, publicKey]);

  function closePrompt() {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, "true");
    setOpen(false);
  }

  function enableNotifications() {
    startTransition(async () => {
      const permission = await Notification.requestPermission();
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, "true");

      if (permission !== "granted") {
        setOpen(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription =
          await registration.pushManager.getSubscription();
        const subscription =
          existingSubscription ??
          (await registration.pushManager.subscribe({
            applicationServerKey: base64UrlToUint8Array(publicKey),
            userVisibleOnly: true,
          }));
        const input = toInput(subscription);

        if (!input) {
          setErrorVisible(true);
          setOpen(false);
          return;
        }

        const result = await savePushSubscription(input);

        if (result.status !== "saved") {
          setErrorVisible(true);
        }
      } catch {
        setErrorVisible(true);
      }

      setOpen(false);
    });
  }

  return (
    <>
      {errorVisible ? <Toast>{labels.saveError}</Toast> : null}
      <Modal onClose={closePrompt} open={open} title={labels.title}>
        <p className="mt-5 text-base leading-7 text-[#667085]">
          {labels.intro}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            disabled={isPending}
            loading={isPending}
            onClick={enableNotifications}
            type="button"
          >
            {labels.enable}
          </Button>
          <Button
            disabled={isPending}
            onClick={closePrompt}
            type="button"
            variant="outline"
          >
            {labels.notNow}
          </Button>
        </div>
      </Modal>
    </>
  );
}
