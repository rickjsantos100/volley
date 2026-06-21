"use client";

import { useActionState, useState } from "react";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { cx } from "@/components/ui/class-name";
import { Toast } from "@/components/ui/toast";
import { useFormStatus } from "react-dom";

type AdminRemovePlayerButtonProps = {
  action: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  label: string;
  onPendingChange?: (pending: boolean) => void;
  statusLabels: Partial<Record<GameActionStatus, string>>;
};

const initialState: GameActionState = {};

export function AdminRemovePlayerButton({
  action,
  label,
  onPendingChange,
  statusLabels,
}: AdminRemovePlayerButtonProps) {
  const [isPending, setIsPending] = useState(false);
  async function handleAction(
    previousState: GameActionState,
    formData: FormData,
  ) {
    setIsPending(true);
    onPendingChange?.(true);

    const nextState = await action(previousState, formData);

    setIsPending(false);
    onPendingChange?.(false);
    return nextState;
  }

  const [state, formAction] = useActionState(handleAction, initialState);
  const status = state.status;

  return (
    <>
      {status && statusLabels[status] ? (
        <Toast variant="error">{statusLabels[status]}</Toast>
      ) : null}
      <form action={formAction} className="shrink-0">
        <TrashSubmitButton isPending={isPending} label={label} />
      </form>
    </>
  );
}

function TrashSubmitButton({
  isPending,
  label,
}: {
  isPending: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();
  const isLoading = pending || isPending;

  return (
    <button
      aria-label={label}
      className={cx(
        "flex size-11 items-center justify-center rounded-[10px] border border-[#c73a3a] bg-white text-[#c73a3a] transition hover:bg-[#fff1f1] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#c73a3a]/20 active:translate-y-px disabled:cursor-default disabled:opacity-50",
      )}
      disabled={isLoading}
      type="submit"
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
        />
      ) : (
        <svg
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      )}
    </button>
  );
}
