"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal, ModalActions } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";

export type GameShareProps = {
  gamePath: string;
  labels: {
    button: string;
    copied: string;
    copyButton: string;
    fallbackIntro: string;
    fallbackLabel: string;
    fallbackTitle: string;
  };
  text: string;
  title: string;
};

type Feedback = {
  id: number;
  message: string;
};

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export function GameShareButton({
  gamePath,
  labels,
  text,
  title,
}: GameShareProps) {
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [shareUrl, setShareUrl] = useState("");

  function getShareUrl() {
    return new URL(gamePath, window.location.origin).toString();
  }

  async function copyLink(url: string, openFallback = true) {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(url);
      setFeedback({ id: Date.now(), message: labels.copied });
      setFallbackOpen(false);
    } catch {
      if (openFallback) {
        setShareUrl(url);
        setFallbackOpen(true);
      }
    }
  }

  async function handleShare() {
    const url = getShareUrl();
    const shareData = { text, title, url };
    let canUseNativeShare = typeof navigator.share === "function";

    if (canUseNativeShare && typeof navigator.canShare === "function") {
      try {
        canUseNativeShare = navigator.canShare(shareData);
      } catch {
        canUseNativeShare = false;
      }
    }

    if (canUseNativeShare) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
      }
    }

    await copyLink(url);
  }

  return (
    <>
      {feedback ? (
        <Toast key={feedback.id} variant="success">
          {feedback.message}
        </Toast>
      ) : null}

      <Button
        className="sm:w-auto"
        fullWidth
        onClick={handleShare}
        type="button"
        variant="outline"
      >
        <span className="inline-flex items-center gap-2">
          <svg
            aria-hidden="true"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.6 10.5 6.8-4" />
            <path d="m8.6 13.5 6.8 4" />
          </svg>
          {labels.button}
        </span>
      </Button>

      <Modal
        onClose={() => setFallbackOpen(false)}
        open={fallbackOpen}
        title={labels.fallbackTitle}
      >
        <div className="mt-5 grid gap-4">
          <p className="text-sm leading-6 text-[#667085]">
            {labels.fallbackIntro}
          </p>
          <Field
            id="game-share-url"
            label={labels.fallbackLabel}
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            value={shareUrl}
          />
          <ModalActions>
            <Button onClick={() => copyLink(shareUrl, false)} type="button">
              {labels.copyButton}
            </Button>
          </ModalActions>
        </div>
      </Modal>
    </>
  );
}
