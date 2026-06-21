import type { HTMLAttributes } from "react";
import { cx } from "./class-name";

type CardVariant = "cancelled" | "default" | "featured" | "muted";

const variants: Record<CardVariant, string> = {
  cancelled: "border border-[#dde2ea] border-l-4 border-l-[#c73a3a] bg-white",
  default: "border border-[#dde2ea] bg-white",
  featured:
    "border border-[#061b6b] border-t-4 border-t-[#ffd21a] bg-[#061b6b] text-white",
  muted: "border border-[#dde2ea] bg-white",
};

export function cardClassName({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: CardVariant;
} = {}) {
  return cx(
    "rounded-xl p-5 shadow-[0_8px_24px_rgba(16,24,40,0.07)] sm:p-6",
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
