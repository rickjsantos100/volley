"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const DISMISSED_STORAGE_KEY = "voley-lisboa:pwa-install-dismissed:v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type PwaInstallPromptProps = {
  labels: {
    close: string;
    install: string;
    intro: string;
    iosAction: string;
    iosInstructions: string;
    iosTitle: string;
    notNow: string;
    title: string;
  };
};

function isIOSDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function PwaInstallPrompt({ labels }: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const initializeTimeout = window.setTimeout(() => {
      const wasDismissed =
        window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "true";

      setDismissed(wasDismissed);
      setIsIOS(isIOSDevice());
      setIsStandalone(isStandaloneMode());
    }, 0);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowIOSInstructions(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.clearTimeout(initializeTimeout);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  function dismissPrompt() {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, "true");
    setDismissed(true);
    setShowIOSInstructions(false);
  }

  async function installApp() {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  const canOfferInstall = isIOS || Boolean(deferredPrompt);

  if (dismissed || isStandalone || !canOfferInstall) {
    return null;
  }

  return (
    <>
      <aside
        aria-labelledby="pwa-install-title"
        className="fixed inset-x-4 bottom-4 z-[55] mx-auto max-w-md rounded-xl border border-[#dde2ea] bg-white p-5 shadow-[0_16px_40px_rgba(16,24,40,0.18)] sm:bottom-6 sm:p-6"
      >
        <h2
          className="font-matchday text-[26px] leading-7 font-bold text-[#061b6b]"
          id="pwa-install-title"
        >
          {labels.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#667085]">{labels.intro}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Button onClick={installApp} type="button">
            {isIOS ? labels.iosAction : labels.install}
          </Button>
          <Button onClick={dismissPrompt} type="button" variant="outline">
            {labels.notNow}
          </Button>
        </div>
      </aside>

      <Modal
        onClose={() => setShowIOSInstructions(false)}
        open={showIOSInstructions}
        title={labels.iosTitle}
      >
        <p className="mt-5 text-base leading-7 text-[#667085]">
          {labels.iosInstructions}
        </p>
        <div className="mt-6">
          <Button
            fullWidth
            onClick={() => setShowIOSInstructions(false)}
            type="button"
          >
            {labels.close}
          </Button>
        </div>
      </Modal>
    </>
  );
}
