"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/class-name";
import { inputClassName } from "@/components/ui/field";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { Toast } from "@/components/ui/toast";

export type AddPlayerCandidate = {
  avatarUrl: string;
  id: string;
  name: string;
  searchValue: string;
};

type AdminAddPlayerProps = {
  action: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  candidates: AddPlayerCandidate[];
  disabledReason?: string;
  labels: {
    button: string;
    empty: string;
    input: string;
    placeholder: string;
  };
  statusLabels: Partial<Record<GameActionStatus, string>>;
};

const initialState: GameActionState = {};
const resultLimit = 8;
const compactToastClassName =
  "sm:!right-6 sm:!left-auto sm:!w-auto sm:!max-w-sm sm:!translate-x-0 sm:text-left";

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

export function AdminAddPlayer({
  action,
  candidates,
  disabledReason,
  labels,
  statusLabels,
}: AdminAddPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  async function runAction(
    previousState: GameActionState,
    formData: FormData,
  ) {
    const nextState = await action(previousState, formData);

    if (
      nextState.status === "added-player" ||
      nextState.status === "added-player-email-error"
    ) {
      setIsOpen(false);
      setQuery("");
    }

    return nextState;
  }
  const [state, formAction, isPending] = useActionState(
    runAction,
    initialState,
  );
  function focusTriggerAfterClose() {
    window.requestAnimationFrame(() => {
      document.getElementById("admin-add-player-trigger")?.focus();
    });
  }
  const normalizedQuery = normalizeSearchValue(query.trim());
  const results = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return candidates
      .filter((candidate) =>
        normalizeSearchValue(candidate.searchValue).includes(normalizedQuery),
      )
      .slice(0, resultLimit);
  }, [candidates, normalizedQuery]);
  const status = state.status;
  const statusLabel = state.deliveryWarning
    ? statusLabels["delivery-warning"]
    : status
      ? statusLabels[status]
      : null;
  const isSuccess = status === "added-player";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    inputRef.current?.focus();

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        focusTriggerAfterClose();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const listboxId = "admin-add-player-results";
  const disabledDescriptionId = disabledReason
    ? "admin-add-player-disabled-reason"
    : undefined;

  if (!isOpen) {
    return (
      <div className="sm:text-right">
        <Button
          aria-describedby={disabledDescriptionId}
          disabled={Boolean(disabledReason)}
          id="admin-add-player-trigger"
          onClick={() => setIsOpen(true)}
          size="compact"
          type="button"
          variant="outline"
        >
          <span className="inline-flex items-center gap-2">
            <svg
              aria-hidden="true"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            {labels.button}
          </span>
        </Button>
        {disabledReason ? (
          <p
            className="mt-2 max-w-64 text-xs leading-5 text-[#667085]"
            id={disabledDescriptionId}
          >
            {disabledReason}
          </p>
        ) : null}
        {statusLabel ? (
          <Toast
            className={compactToastClassName}
            variant={state.deliveryWarning ? "warning" : isSuccess ? "success" : "error"}
          >
            {statusLabel}
          </Toast>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {statusLabel ? (
        <Toast
          className={compactToastClassName}
          variant={state.deliveryWarning ? "warning" : isSuccess ? "success" : "error"}
        >
          {statusLabel}
        </Toast>
      ) : null}
      <div
        className="relative w-full sm:max-w-sm"
        onBlur={(event) => {
          if (
            !event.relatedTarget ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setIsOpen(false);
            setQuery("");
          }
        }}
        ref={containerRef}
      >
        <form action={formAction}>
          <label className="sr-only" htmlFor="admin-add-player-search">
            {labels.input}
          </label>
          <div className="flex gap-2">
            <input
              aria-activedescendant={
                results[activeIndex]
                  ? `admin-add-player-option-${results[activeIndex].id}`
                  : undefined
              }
              aria-autocomplete="list"
              aria-controls={normalizedQuery ? listboxId : undefined}
              aria-expanded={Boolean(normalizedQuery)}
              autoComplete="off"
              className={inputClassName(false, "min-w-0")}
              disabled={isPending}
              id="admin-add-player-search"
              onChange={(event) => {
                setActiveIndex(0);
                setQuery(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results.length === 0) {
                  event.preventDefault();
                  return;
                }

                if (results.length === 0) {
                  return;
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((current) => (current + 1) % results.length);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex(
                    (current) =>
                      (current - 1 + results.length) % results.length,
                  );
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  const selectedResult = results[activeIndex];
                  if (selectedResult) {
                    event.currentTarget.form?.requestSubmit(
                      document.getElementById(
                        `admin-add-player-option-${selectedResult.id}`,
                      ) as HTMLButtonElement | null,
                    );
                  }
                }
              }}
              placeholder={labels.placeholder}
              ref={inputRef}
              role="combobox"
              type="search"
              value={query}
            />
            {isPending ? (
              <span
                aria-hidden="true"
                className="mt-4 size-4 shrink-0 animate-spin rounded-full border-2 border-[#0737a8]/25 border-t-[#0737a8]"
              />
            ) : null}
          </div>

          {normalizedQuery ? (
            <div
              className="absolute top-full right-0 left-0 z-20 mt-2 overflow-hidden rounded-xl border border-[#dde2ea] bg-white p-2 shadow-[0_12px_30px_rgba(16,24,40,0.16)]"
              id={listboxId}
              role="listbox"
            >
              {results.length > 0 ? (
                results.map((candidate, index) => (
                  <button
                    aria-selected={index === activeIndex}
                    className={cx(
                      "flex min-h-14 w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20",
                      index === activeIndex
                        ? "bg-[#eef3ff]"
                        : "hover:bg-[#eef1f5]",
                    )}
                    disabled={isPending}
                    id={`admin-add-player-option-${candidate.id}`}
                    key={candidate.id}
                    name="userId"
                    onMouseEnter={() => setActiveIndex(index)}
                    role="option"
                    type="submit"
                    value={candidate.id}
                  >
                    <InitialsAvatar
                      avatarUrl={candidate.avatarUrl}
                      className="size-9"
                      name={candidate.name}
                    />
                    <span className="min-w-0 text-sm font-semibold text-[#101828] break-words">
                      {candidate.name}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-4 text-sm text-[#667085]">
                  {labels.empty}
                </p>
              )}
            </div>
          ) : null}
        </form>
      </div>
    </>
  );
}
