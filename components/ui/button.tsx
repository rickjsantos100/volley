"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cx } from "./class-name";

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

const rippleClass =
  "isolate overflow-hidden after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.28)_28%,transparent_58%)] after:opacity-0 after:content-[''] after:scale-[0.2] after:transition-[opacity,transform] after:duration-300 active:after:scale-[2.4] active:after:opacity-100 active:after:duration-0 disabled:after:opacity-0";

const darkRippleClass =
  "after:bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.14)_0%,rgba(0,0,0,0.09)_28%,transparent_58%)]";

const variantClasses: Record<ButtonVariant, string> = {
  dangerOutline:
    "border-[#c82014] bg-white text-[#c82014] hover:bg-[hsl(4_82%_43%_/_5%)]",
  ghost:
    "border-[rgba(0,0,0,0.24)] bg-transparent text-[rgba(0,0,0,0.87)]",
  icon:
    "size-11 justify-center border-[#00754A] bg-[#00754A] p-0 text-white shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.18)]",
  outline: "border-[#00754A] bg-white text-[#00754A]",
  primary: "border-[#00754A] bg-[#00754A] text-white",
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
    fixed ? "fixed" : "relative",
    "flex items-center justify-center gap-2 rounded-full border text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100",
    rippleClass,
    variant !== "primary" && darkRippleClass,
    variantClasses[variant],
    variant === "icon"
      ? null
      : size === "compact"
        ? "px-4 py-2"
        : "px-5 py-3",
    fullWidth && "w-full",
    className,
  );
}

export function Button({
  children,
  className,
  fixed,
  fullWidth,
  loading = false,
  size,
  variant,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName({
        className,
        fixed,
        fullWidth,
        size,
        variant,
      })}
      {...props}
    >
      {loading ? <Spinner variant={variant} /> : null}
      <span>{children}</span>
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
          ? "size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          : "size-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
      }
    />
  );
}
