"use client";

import type {
  ButtonHTMLAttributes,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
} from "react";
import { useRef, useState } from "react";
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

type Ripple = {
  id: number;
  size: number;
  x: number;
  y: number;
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
    fixed ? "fixed" : "relative",
    "isolate flex min-h-11 overflow-hidden [-webkit-tap-highlight-color:transparent] items-center justify-center gap-2 rounded-[10px] border text-sm font-bold transition-[background-color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 active:translate-y-px disabled:cursor-default disabled:opacity-50 disabled:active:translate-y-0",
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
  onKeyDown,
  onPointerDown,
  size,
  variant = "primary",
  ...props
}: ButtonProps) {
  const nextRippleId = useRef(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const canRipple = !disabled && !loading;

  function addRipple(button: HTMLButtonElement, clientX?: number, clientY?: number) {
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x =
      clientX === undefined
        ? rect.width / 2 - size / 2
        : clientX - rect.left - size / 2;
    const y =
      clientY === undefined
        ? rect.height / 2 - size / 2
        : clientY - rect.top - size / 2;

    nextRippleId.current += 1;
    setRipples((currentRipples) => [
      ...currentRipples,
      {
        id: nextRippleId.current,
        size,
        x,
        y,
      },
    ]);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(event);

    if (
      event.defaultPrevented ||
      !canRipple ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }

    addRipple(event.currentTarget, event.clientX, event.clientY);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event);

    if (
      event.defaultPrevented ||
      !canRipple ||
      event.repeat ||
      (event.key !== "Enter" && event.key !== " ")
    ) {
      return;
    }

    addRipple(event.currentTarget);
  }

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
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cx(
          "pointer-events-none absolute inset-0 z-0",
          variant === "dangerOutline"
            ? "text-[#c73a3a]"
            : variant === "primary" || variant === "icon"
              ? "text-[#061b6b]"
              : "text-[#0737a8]",
        )}
      >
        {ripples.map((ripple) => (
          <span
            className="button-ripple absolute rounded-full bg-current"
            key={ripple.id}
            onAnimationEnd={() => {
              setRipples((currentRipples) =>
                currentRipples.filter((item) => item.id !== ripple.id),
              );
            }}
            style={{
              height: ripple.size,
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
            }}
          />
        ))}
      </span>
      {loading ? <Spinner variant={variant} /> : null}
      <span className="relative z-10">{children}</span>
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
          ? "relative z-10 size-4 animate-spin rounded-full border-2 border-[#061b6b]/30 border-t-[#061b6b]"
          : "relative z-10 size-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
      }
    />
  );
}
