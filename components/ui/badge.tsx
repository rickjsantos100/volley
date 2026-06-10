import type { HTMLAttributes } from "react";
import { cx } from "./class-name";

type BadgeVariant = "danger" | "dark" | "soft" | "success";

const variants: Record<BadgeVariant, string> = {
  danger: "bg-[#c82014] text-white",
  dark: "bg-[#1E3932] text-white",
  soft: "bg-[#faf6ee] text-[#33433d]",
  success: "bg-[#d4e9e2] text-[#006241]",
};

export function Badge({
  className,
  variant = "dark",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cx(
        "w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
