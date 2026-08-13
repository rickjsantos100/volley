import type { HTMLAttributes } from "react";
import { cx } from "./class-name";

type BadgeVariant =
  | "danger"
  | "dark"
  | "playing"
  | "soft"
  | "success"
  | "warning";

const variants: Record<BadgeVariant, string> = {
  danger: "border border-[#c73a3a]/25 bg-[#fff1f1] text-[#a72f2f]",
  dark: "bg-[#061b6b] text-white",
  playing: "border border-[#b9c9f5] bg-[#e4ecff] text-[#0737a8]",
  soft: "border border-[#d8d3cb] bg-[#f3f1ed] text-[#475467]",
  success: "border border-[#138a5b]/25 bg-[#ecf8f3] text-[#0d6b46]",
  warning: "border border-[#d6ad00]/35 bg-[#fff8d6] text-[#475467]",
};

export function Badge({
  className,
  variant = "dark",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cx(
        "w-fit shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
