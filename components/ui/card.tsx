import type { HTMLAttributes } from "react";
import { cx } from "./class-name";

type CardVariant = "cancelled" | "default" | "muted";

const variants: Record<CardVariant, string> = {
  cancelled: "border border-[rgba(0,0,0,0.14)] bg-[#fff3b0] opacity-75",
  default: "bg-white",
  muted: "border border-[rgba(0,0,0,0.14)] bg-white",
};

export function cardClassName({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: CardVariant;
} = {}) {
  return cx(
    "rounded-xl px-5 py-5 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)]",
    variants[variant],
    className,
  );
}

export function Card({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return <div className={cardClassName({ className, variant })} {...props} />;
}
