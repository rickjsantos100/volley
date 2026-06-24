"use client";

import { useState } from "react";
import { Button, buttonClassName } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type GameCalendarButtonProps = {
  fallbackDownloadLabel: string;
  fallbackGoogleLabel: string;
  fallbackIntro: string;
  fallbackTitle: string;
  googleCalendarUrl: string;
  href: string;
  label: string;
};

type CalendarShareState = "idle" | "loading";

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

function getFileName(response: Response) {
  const disposition = response.headers.get("content-disposition");
  const fileNameMatch = disposition?.match(/filename="([^"]+)"/);

  return fileNameMatch?.[1] ?? "voley-lisboa.ics";
}

export function GameCalendarButton({
  fallbackDownloadLabel,
  fallbackGoogleLabel,
  fallbackIntro,
  fallbackTitle,
  googleCalendarUrl,
  href,
  label,
}: GameCalendarButtonProps) {
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [state, setState] = useState<CalendarShareState>("idle");

  async function handleCalendarShare() {
    setState("loading");

    try {
      const response = await fetch(href);

      if (!response.ok) {
        throw new Error("calendarFetchFailed");
      }

      const blob = await response.blob();
      const file = new File([blob], getFileName(response), {
        type: "text/calendar",
      });
      const shareData = { files: [file] };

      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare(shareData)
      ) {
        await navigator.share(shareData);
        return;
      }

      setFallbackOpen(true);
    } catch (error) {
      if (!isAbortError(error)) {
        setFallbackOpen(true);
      }
    } finally {
      setState("idle");
    }
  }

  return (
    <>
      <Button
        className="sm:w-auto"
        disabled={state === "loading"}
        fullWidth
        loading={state === "loading"}
        onClick={handleCalendarShare}
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
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect height="18" rx="2" width="18" x="3" y="4" />
            <path d="M3 10h18" />
            <path d="M12 14v4" />
            <path d="M10 16h4" />
          </svg>
          {label}
        </span>
      </Button>

      <Modal
        onClose={() => setFallbackOpen(false)}
        open={fallbackOpen}
        title={fallbackTitle}
      >
        <div className="mt-5 grid gap-4">
          <p className="text-sm leading-6 text-[#667085]">
            {fallbackIntro}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              className={buttonClassName({ fullWidth: true })}
              href={googleCalendarUrl}
              rel="noreferrer"
              target="_blank"
            >
              {fallbackGoogleLabel}
            </a>
            <a
              className={buttonClassName({
                fullWidth: true,
                variant: "outline",
              })}
              href={href}
            >
              {fallbackDownloadLabel}
            </a>
          </div>
        </div>
      </Modal>
    </>
  );
}
