"use client";

import type { HTMLAttributes } from "react";
import { useEffect, useState } from "react";
import { alertClassName } from "./alert";
import { cx } from "./class-name";

type ToastVariant = "error" | "success" | "warning";

export function Toast({
  className,
  durationMs = 4000,
  variant = "error",
  ...props
}: HTMLAttributes<HTMLParagraphElement> & {
  durationMs?: number;
  variant?: ToastVariant;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (durationMs <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, durationMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [durationMs, props.children, variant]);

  if (!visible) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className={cx(
        alertClassName({ variant }),
        "fixed left-1/2 top-4 z-[70] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 shadow-[0_8px_24px_rgba(16,24,40,0.12)] sm:top-6",
        className,
      )}
      {...props}
    />
  );
}
