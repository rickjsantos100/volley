"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./class-name";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: ReactNode;
  label: ReactNode;
};

export function inputClassName(hasError?: boolean, className?: string) {
  return cx(
    "min-h-12 w-full rounded-xl border bg-white px-3.5 py-3 text-base text-[#101828] outline-none transition placeholder:text-[#98a2b3] disabled:cursor-not-allowed disabled:bg-[#eef1f5] disabled:text-[#98a2b3]",
    hasError
      ? "border-[#c73a3a] focus:border-[#c73a3a] focus:ring-3 focus:ring-[#c73a3a]/15"
      : "border-[#b8c0cc] hover:border-[#0737a8] focus:border-[#0737a8] focus:ring-3 focus:ring-[#0737a8]/16",
    className,
  );
}

export function Field({ className, error, id, label, ...props }: FieldProps) {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-[#101828]">
        {label}
      </label>
      <input
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
        className={inputClassName(Boolean(error), className)}
        id={id}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-[13px] font-semibold text-[#c73a3a]">
          <span className="sr-only">Error: </span>{error}
        </p>
      ) : null}
    </div>
  );
}
