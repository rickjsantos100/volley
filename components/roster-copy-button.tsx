"use client";

import { useState } from "react";
import { buttonClassName } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";

type RosterCopyButtonProps = {
  labels: {
    button: string;
    copied: string;
    error: string;
    participants: string;
    waitlist: string;
  };
  participants: string[];
  waitlist: string[];
};

type Feedback = {
  id: number;
  message: string;
  variant: "error" | "success";
};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back for browsers that expose the API but block its use.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.className = "fixed -left-full top-0 opacity-0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();

  if (!copied) {
    throw new Error("Clipboard unavailable");
  }
}

function formatSection(title: string, names: string[]) {
  return [`*${title}*`, ...names.map((name, index) => `${index + 1}. ${name}`)].join(
    "\n",
  );
}

export function RosterCopyButton({
  labels,
  participants,
  waitlist,
}: RosterCopyButtonProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const sections: string[] = [];

  if (participants.length > 0) {
    sections.push(formatSection(labels.participants, participants));
  }

  if (waitlist.length > 0) {
    sections.push(formatSection(labels.waitlist, waitlist));
  }

  async function handleCopy() {
    try {
      await copyText(sections.join("\n\n"));
      setFeedback({
        id: Date.now(),
        message: labels.copied,
        variant: "success",
      });
    } catch {
      setFeedback({
        id: Date.now(),
        message: labels.error,
        variant: "error",
      });
    }
  }

  return (
    <>
      {feedback ? (
        <Toast key={feedback.id} variant={feedback.variant}>
          {feedback.message}
        </Toast>
      ) : null}

      <button
        aria-label={labels.button}
        className={buttonClassName({
          className:
            "size-11 shrink-0 border-transparent bg-transparent !p-0 text-[#0737a8] shadow-none hover:border-[#dde2ea] hover:bg-[#eef1f5]",
          variant: "ghost",
        })}
        disabled={participants.length === 0 && waitlist.length === 0}
        onClick={handleCopy}
        title={labels.button}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <rect height="14" rx="2" width="14" x="8" y="8" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
      </button>
    </>
  );
}
