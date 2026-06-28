"use client";

import { useRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "./class-name";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: ReactNode;
  label: ReactNode;
};

type FileFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "type"
> & {
  buttonLabel: ReactNode;
  emptyLabel: ReactNode;
  error?: ReactNode;
  label: ReactNode;
  selectedFileName?: string | null;
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

export function FileField({
  buttonLabel,
  emptyLabel,
  error,
  id,
  label,
  selectedFileName,
  ...props
}: FileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = error && id ? `${id}-error` : undefined;
  const labelId = id ? `${id}-label` : undefined;
  const buttonLabelId = id ? `${id}-button-label` : undefined;
  const fileNameId = id ? `${id}-file-name` : undefined;
  const accessibleLabelIds = [labelId, buttonLabelId, fileNameId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-w-0 max-w-full space-y-2">
      <label
        className="block text-sm font-semibold text-[#101828]"
        htmlFor={id}
        id={labelId}
      >
        {label}
      </label>
      <input
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
        className="sr-only"
        id={id}
        ref={inputRef}
        tabIndex={-1}
        type="file"
        {...props}
      />
      <button
        aria-describedby={errorId}
        aria-labelledby={accessibleLabelIds || undefined}
        className={cx(
          "flex min-h-12 w-full min-w-0 max-w-full cursor-pointer items-stretch overflow-hidden rounded-xl border bg-white text-left text-base text-[#101828] transition disabled:cursor-not-allowed disabled:bg-[#eef1f5] disabled:text-[#98a2b3]",
          error
            ? "border-[#c73a3a] focus-visible:border-[#c73a3a] focus-visible:ring-3 focus-visible:ring-[#c73a3a]/15 focus-visible:outline-none"
            : "border-[#b8c0cc] hover:border-[#0737a8] focus-visible:border-[#0737a8] focus-visible:ring-3 focus-visible:ring-[#0737a8]/16 focus-visible:outline-none",
        )}
        disabled={props.disabled}
        onClick={() => {
          inputRef.current?.click();
        }}
        type="button"
      >
        <span
          className="flex shrink-0 items-center border-r border-[#b8c0cc] bg-[#eef1f5] px-3.5 font-semibold text-[#0737a8]"
          id={buttonLabelId}
        >
          {buttonLabel}
        </span>
        <span
          className="min-w-0 flex-1 overflow-hidden px-3.5 py-3 text-ellipsis whitespace-nowrap"
          id={fileNameId}
          title={selectedFileName ?? undefined}
        >
          {selectedFileName || emptyLabel}
        </span>
      </button>
      {error ? (
        <p id={errorId} className="text-[13px] font-semibold text-[#c73a3a]">
          <span className="sr-only">Error: </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
