import type { HTMLAttributes } from "react";
import { cx } from "./class-name";

type AlertVariant = "error" | "success" | "warning";

const variants: Record<AlertVariant, string> = {
  error: "border-[#c73a3a]/30 bg-[#fff1f1] text-[#a72f2f]",
  success: "border-[#138a5b]/30 bg-[#ecf8f3] text-[#0d6b46]",
  warning: "border-[#d6a900]/40 bg-[#fff8d6] text-[#6b5200]",
};

export function alertClassName({
  className,
  variant = "error",
}: {
  className?: string;
  variant?: AlertVariant;
} = {}) {
  return cx(
    "rounded-xl border px-4 py-3 text-sm font-semibold",
    variants[variant],
    className,
  );
}

export function Alert({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { variant?: AlertVariant }) {
  return <p className={alertClassName({ className, variant })} {...props} />;
}
