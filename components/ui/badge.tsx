import type { HTMLAttributes } from "react";
import { cx } from "./class-name";

type BadgeVariant = "danger" | "dark" | "soft" | "success";

const variants: Record<BadgeVariant, string> = {
  danger: "bg-[#c82014] text-white",
  dark: "bg-[#061b6b] text-white",
  soft: "bg-[#fff3b0] text-[#26375f]",
  success: "bg-[#fff3b0] text-[#0737a8]",
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
