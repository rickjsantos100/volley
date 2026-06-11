import type { HTMLAttributes } from "react";
import { cx } from "./class-name";

type AlertVariant = "error" | "success";

const variants: Record<AlertVariant, string> = {
  error: "bg-[hsl(4_82%_43%_/_5%)] text-[#c82014]",
  success: "bg-[#fff3b0] text-[#0737a8]",
};

export function alertClassName({
  className,
  variant = "error",
}: {
  className?: string;
  variant?: AlertVariant;
} = {}) {
  return cx(
    "rounded-xl px-4 py-3 text-sm font-medium",
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
