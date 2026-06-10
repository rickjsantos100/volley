"use client";

import type { ReactNode } from "react";
import { Button } from "./button";

type ModalProps = {
  children: ReactNode;
  closeLabel: string;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Modal({
  children,
  closeLabel,
  onClose,
  open,
  title,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-4 py-4 sm:items-center"
      role="presentation"
    >
      <div
        aria-modal="true"
        role="dialog"
        className="w-full max-w-md rounded-xl bg-white px-5 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.24)]"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-[-0.01em] text-[#006241]">
            {title}
          </h2>
          <Button onClick={onClose} size="compact" type="button" variant="ghost">
            {closeLabel}
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
