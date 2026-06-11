"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./class-name";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: ReactNode;
  label: ReactNode;
};

export function inputClassName(hasError?: boolean, className?: string) {
  return cx(
    "w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition disabled:cursor-not-allowed disabled:bg-[#f9f9f9]",
    hasError
      ? "border-[#c82014] focus:border-[#c82014] focus:ring-2 focus:ring-[hsl(4_82%_43%_/_18%)]"
      : "border-[rgba(0,0,0,0.16)] focus:border-[#0737a8] focus:ring-2 focus:ring-[#fff3b0]",
    className,
  );
}

export function Field({ className, error, id, label, ...props }: FieldProps) {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-[#26375f]">
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
        <p id={errorId} className="text-sm font-medium text-[#c82014]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
