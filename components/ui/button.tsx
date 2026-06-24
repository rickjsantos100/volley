"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  cx,
  pressedSurfaceClassName,
  pressedSurfaceOverlayClassName,
} from "./class-name";

type ButtonVariant =
  | "dangerOutline"
  | "ghost"
  | "icon"
  | "outline"
  | "primary";

type ButtonSize = "compact" | "default";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  fixed?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type SubmitButtonProps = ButtonProps & {
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  dangerOutline:
    "border-[#c73a3a] bg-white text-[#c73a3a] hover:bg-[#fff1f1]",
  ghost:
    "border-transparent bg-transparent text-[#101828] hover:bg-[#eef1f5]",
  icon:
    "size-11 justify-center border-[#ffd21a] bg-[#ffd21a] p-0 text-[#061b6b] hover:bg-[#f2c600]",
  outline: "border-[#0737a8] bg-white text-[#0737a8] hover:bg-[#eef3ff]",
  primary:
    "border-[#ffd21a] bg-[#ffd21a] text-[#061b6b] hover:border-[#f2c600] hover:bg-[#f2c600]",
};

export function buttonClassName({
  className,
  fixed = false,
  fullWidth = false,
  size = "default",
  variant = "primary",
}: Pick<
  ButtonProps,
  "className" | "fixed" | "fullWidth" | "size" | "variant"
> = {}) {
  return cx(
    fixed ? pressedSurfaceOverlayClassName : pressedSurfaceClassName,
    fixed && "fixed",
    "flex min-h-11 items-center justify-center gap-2 rounded-[10px] border text-sm font-bold transition-[background-color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 active:translate-y-px disabled:cursor-default disabled:opacity-50 disabled:active:translate-y-0",
    variantClasses[variant],
    variant === "icon"
      ? null
      : size === "compact"
        ? "px-4 py-2.5"
        : "px-5 py-3",
    fullWidth && "w-full",
    className,
  );
}

export function Button({
  children,
  className,
  disabled,
  fixed,
  fullWidth,
  loading = false,
  size,
  variant = "primary",
  ...props
}: ButtonProps) {
  const hasChildren =
    children !== null &&
    children !== undefined &&
    children !== false &&
    children !== "";

  return (
    <button
      className={buttonClassName({
        className,
        fixed,
        fullWidth,
        size,
        variant,
      })}
      disabled={disabled}
      {...props}
    >
      {loading ? <Spinner variant={variant} /> : null}
      {hasChildren ? <span>{children}</span> : null}
    </button>
  );
}

export function SubmitButton({
  children,
  disabled,
  variant,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      disabled={pending || disabled}
      loading={pending}
      variant={variant}
      {...props}
    >
      {children}
    </Button>
  );
}

function Spinner({ variant = "primary" }: { variant?: ButtonVariant }) {
  return (
    <span
      aria-hidden="true"
      className={
        variant === "primary" || variant === "icon"
          ? "size-4 animate-spin rounded-full border-2 border-[#061b6b]/30 border-t-[#061b6b]"
          : "size-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
      }
    />
  );
}
