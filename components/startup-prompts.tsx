"use client";

import { useState } from "react";
import { NotificationStartupPrompt } from "@/components/notification-startup-prompt";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

type StartupPromptsProps = {
  installLabels: {
    close: string;
    install: string;
    intro: string;
    iosAction: string;
    iosInstructions: string;
    iosTitle: string;
    notNow: string;
    title: string;
  };
  notificationLabels: {
    enable: string;
    intro: string;
    notNow: string;
    saveError: string;
    title: string;
  };
  publicKey: string;
};

export function StartupPrompts({
  installLabels,
  notificationLabels,
  publicKey,
}: StartupPromptsProps) {
  const [installPromptDone, setInstallPromptDone] = useState(false);

  return (
    <>
      <PwaInstallPrompt
        labels={installLabels}
        onComplete={() => setInstallPromptDone(true)}
      />
      <NotificationStartupPrompt
        active={installPromptDone}
        labels={notificationLabels}
        publicKey={publicKey}
      />
    </>
  );
}
