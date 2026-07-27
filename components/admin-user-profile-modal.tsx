"use client";

import { useEffect, useRef, useState } from "react";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { Modal } from "@/components/ui/modal";

type AdminUserProfileModalProps = {
  avatarUrl: string;
  email: string | null;
  labels: {
    copied: string;
    copyEmail: string;
    copyPhone: string;
    openProfile: string;
  };
  name: string;
  canOpen?: () => boolean;
  phoneCountryCode: string;
  phoneNumber: string;
};

type CopiedField = "email" | "phone";

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
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

export function AdminUserProfileModal({
  avatarUrl,
  canOpen,
  email,
  labels,
  name,
  phoneCountryCode,
  phoneNumber,
}: AdminUserProfileModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<CopiedField | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);
  const phone = `${phoneCountryCode} ${phoneNumber}`;

  useEffect(
    () => () => {
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    },
    [],
  );

  async function handleCopy(value: string, field: CopiedField) {
    try {
      await copyText(value);
      setCopiedField(field);

      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }

      copiedTimeoutRef.current = window.setTimeout(
        () => setCopiedField(null),
        1800,
      );
    } catch {
      // The value remains visible and selectable if the browser blocks copying.
    }
  }

  return (
    <>
      <button
        aria-label={labels.openProfile}
        className="-mx-2 flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-[10px] px-2 py-1 text-left transition hover:bg-[#eef1f5] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 active:translate-y-px"
        onClick={() => {
          if (canOpen?.() === false) {
            return;
          }

          setIsOpen(true);
        }}
        type="button"
      >
        <InitialsAvatar avatarUrl={avatarUrl} name={name} />
        <span className="min-w-0 text-sm font-semibold text-[#101828] break-words">
          {name}
        </span>
      </button>

      <Modal
        onClose={() => setIsOpen(false)}
        open={isOpen}
        title={name}
      >
        <div className="mt-5 grid gap-5">
          <div className="flex items-center gap-4">
            <InitialsAvatar
              avatarUrl={avatarUrl}
              className="size-20 text-xl"
              name={name}
            />
            <p className="text-sm leading-6 text-[#667085]">{name}</p>
          </div>

          <div className="grid gap-3">
            {email ? (
              <CopyContactButton
                copied={copiedField === "email"}
                copiedLabel={labels.copied}
                label={labels.copyEmail}
                onClick={() => handleCopy(email, "email")}
                value={email}
              />
            ) : null}
            <CopyContactButton
              copied={copiedField === "phone"}
              copiedLabel={labels.copied}
              label={labels.copyPhone}
              onClick={() => handleCopy(phone, "phone")}
              value={phone}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

function CopyContactButton({
  copied,
  copiedLabel,
  label,
  onClick,
  value,
}: {
  copied: boolean;
  copiedLabel: string;
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      aria-label={`${label}: ${value}`}
      className="relative flex min-h-12 w-full items-center justify-between gap-3 rounded-[10px] border border-[#dde2ea] bg-white px-3 py-2 text-left text-sm font-semibold text-[#101828] transition hover:border-[#0737a8] hover:bg-[#eef3ff] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 active:translate-y-px"
      onClick={onClick}
      type="button"
    >
      <span className="min-w-0 break-all">{value}</span>
      <svg
        aria-hidden="true"
        className="size-5 shrink-0 text-[#475467]"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <rect height="13" rx="2" width="13" x="9" y="9" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {copied ? (
        <span
          className="absolute right-2 -top-10 rounded-lg bg-[#101828] px-3 py-2 text-xs font-bold text-white shadow-lg"
          role="status"
        >
          {copiedLabel}
        </span>
      ) : null}
    </button>
  );
}
