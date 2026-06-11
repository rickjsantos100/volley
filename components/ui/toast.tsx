import type { HTMLAttributes } from "react";
import { alertClassName } from "./alert";
import { cx } from "./class-name";

type ToastVariant = "error" | "success";

export function Toast({
  className,
  variant = "error",
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { variant?: ToastVariant }) {
  return (
    <p
      aria-live="polite"
      className={cx(
        alertClassName({ variant }),
        "fixed left-1/2 top-4 z-[70] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)] sm:top-6",
        className,
      )}
      {...props}
    />
  );
}
