"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalActions } from "@/components/ui/modal";

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
  onComplete?: () => void;
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

export function PwaInstallPrompt({ labels, onComplete }: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [completed, setCompleted] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const completedRef = useRef(false);
  const completePrompt = useCallback(() => {
    if (completedRef.current) {
      return;
    }

    completedRef.current = true;
    setCompleted(true);
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    const initializeTimeout = window.setTimeout(() => {
      const wasDismissed =
        window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "true";

      setDismissed(wasDismissed);
      setIsIOS(isIOSDevice());
      setIsStandalone(isStandaloneMode());
      setInitialized(true);
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
    completePrompt();
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
    completePrompt();
  }

  const canOfferInstall = isIOS || Boolean(deferredPrompt);

  useEffect(() => {
    if (initialized && (dismissed || isStandalone || !canOfferInstall)) {
      completePrompt();
    }
  }, [canOfferInstall, completePrompt, dismissed, initialized, isStandalone]);

  if (!initialized || completed || dismissed || isStandalone || !canOfferInstall) {
    return null;
  }

  return (
    <Modal
      onClose={dismissPrompt}
      open
      title={showIOSInstructions ? labels.iosTitle : labels.title}
    >
      {showIOSInstructions ? (
        <>
        <p className="mt-5 text-base leading-7 text-[#667085]">
          {labels.iosInstructions}
        </p>
        <ModalActions className="mt-6">
          <Button onClick={dismissPrompt} type="button">
            {labels.close}
          </Button>
        </ModalActions>
        </>
      ) : (
        <>
          <p className="mt-5 text-base leading-7 text-[#667085]">
            {labels.intro}
          </p>
          <ModalActions className="mt-6">
            <Button onClick={dismissPrompt} type="button" variant="outline">
              {labels.notNow}
            </Button>
            <Button onClick={installApp} type="button">
              {isIOS ? labels.iosAction : labels.install}
            </Button>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
