"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { buttonClassName } from "@/components/ui/button";
import { cx, pressedSurfaceClassName } from "@/components/ui/class-name";
import { Toast } from "@/components/ui/toast";
import { getPaymentProofRequestAvailableAt } from "@/lib/payment-proof-policy";
import { isInstalledPwaDisplayMode } from "@/lib/pwa/display-mode";

type AdminParticipantMenuProps = {
  actionsLabel: string;
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
  participantId: string;
  proofAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  proofDeletedAt: string | null;
  proofLabels: {
    expired: string;
    request: string;
    requested: string;
    view: string;
  };
  proofPath: string | null;
  proofRequestedAt: string | null;
  proofUploadedAt: string | null;
  removeAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  removeLabel: string;
  statusLabels: Partial<Record<GameActionStatus, string>>;
};

const initialState: GameActionState = {};
const menuItemClassName = cx(
  pressedSurfaceClassName,
  "flex min-h-11 w-full items-center rounded-[10px] border-0 bg-transparent px-3 py-2 text-left text-sm font-bold text-[#101828] transition hover:bg-[#eef1f5] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 disabled:cursor-default disabled:text-[#98a2b3] disabled:hover:bg-transparent",
);

export function AdminParticipantMenu({
  actionsLabel,
  disabled = false,
  onPendingChange,
  participantId,
  proofAction,
  proofDeletedAt,
  proofLabels,
  proofPath,
  proofRequestedAt,
  proofUploadedAt,
  removeAction,
  removeLabel,
  statusLabels,
}: AdminParticipantMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [requestClock, setRequestClock] = useState(0);

  async function runAction(
    action: (
      previousState: GameActionState,
      formData: FormData,
    ) => Promise<GameActionState>,
    previousState: GameActionState,
    formData: FormData,
  ) {
    onPendingChange?.(true);

    try {
      return await action(previousState, formData);
    } finally {
      onPendingChange?.(false);
      setIsOpen(false);
    }
  }

  const [proofState, proofFormAction] = useActionState(
    runAction.bind(null, proofAction),
    initialState,
  );
  const [removeState, removeFormAction] = useActionState(
    runAction.bind(null, removeAction),
    initialState,
  );
  const proofError =
    proofState.status === "proof-request-error"
      ? statusLabels["proof-request-error"]
      : null;
  const removeError =
    removeState.status === "remove-player-error"
      ? statusLabels["remove-player-error"]
      : null;
  const deliveryWarning =
    proofState.deliveryWarning || removeState.deliveryWarning
      ? statusLabels["delivery-warning"]
      : null;
  const isExpired = Boolean(proofDeletedAt && proofUploadedAt && !proofPath);
  const effectiveProofRequestedAt =
    proofState.proofRequestedAt ?? proofRequestedAt;
  const requestAvailableAt = getPaymentProofRequestAvailableAt(
    effectiveProofRequestedAt,
  );
  const isRequested = Boolean(
    requestAvailableAt && requestAvailableAt > requestClock,
  );

  useEffect(() => {
    if (!requestAvailableAt) {
      return;
    }

    const timeout = window.setTimeout(
      () => setRequestClock(Date.now()),
      Math.max(0, requestAvailableAt - Date.now()),
    );

    return () => window.clearTimeout(timeout);
  }, [requestAvailableAt]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      {proofError ? <Toast variant="error">{proofError}</Toast> : null}
      {removeError ? <Toast variant="error">{removeError}</Toast> : null}
      {deliveryWarning ? (
        <Toast variant="warning">{deliveryWarning}</Toast>
      ) : null}

      <div className="relative shrink-0" ref={containerRef}>
        <button
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label={actionsLabel}
          className={buttonClassName({
            className:
              "size-11 justify-center border-transparent bg-transparent !p-0 text-[#475467] shadow-none hover:border-[#dde2ea] hover:bg-[#eef1f5] hover:text-[#061b6b] aria-[expanded=true]:border-[#0737a8] aria-[expanded=true]:bg-[#eef3ff] aria-[expanded=true]:text-[#061b6b]",
            variant: "ghost",
          })}
          disabled={disabled}
          onClick={() => {
            setRequestClock(Date.now());
            setIsOpen((current) => !current);
          }}
          ref={triggerRef}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="size-6 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="5" fill="currentColor" r="2" />
            <circle cx="12" cy="12" fill="currentColor" r="2" />
            <circle cx="12" cy="19" fill="currentColor" r="2" />
          </svg>
        </button>

        {isOpen ? (
          <div
            className="absolute right-0 bottom-full z-20 mb-2 grid min-w-56 gap-1 rounded-xl border border-[#dde2ea] bg-white p-2 shadow-[0_12px_30px_rgba(16,24,40,0.16)]"
            role="menu"
          >
            {proofPath ? (
              <a
                className={menuItemClassName}
                href={`/api/payment-proofs/${participantId}`}
                onClick={(event) => {
                  setIsOpen(false);

                  if (isInstalledPwaDisplayMode()) {
                    event.preventDefault();
                    window.location.assign(event.currentTarget.href);
                  }
                }}
                rel="noreferrer"
                role="menuitem"
                target="_blank"
              >
                {proofLabels.view}
              </a>
            ) : isExpired ? (
              <button
                className={menuItemClassName}
                disabled
                role="menuitem"
                type="button"
              >
                {proofLabels.expired}
              </button>
            ) : isRequested ? (
              <button
                className={menuItemClassName}
                disabled
                role="menuitem"
                type="button"
              >
                {proofLabels.requested}
              </button>
            ) : (
              <form action={proofFormAction}>
                <MenuSubmitButton>{proofLabels.request}</MenuSubmitButton>
              </form>
            )}

            <div
              className="my-1 border-t border-[#dde2ea]"
              role="separator"
            />

            <form action={removeFormAction}>
              <MenuSubmitButton danger>{removeLabel}</MenuSubmitButton>
            </form>
          </div>
        ) : null}
      </div>
    </>
  );
}

function MenuSubmitButton({
  children,
  danger = false,
}: {
  children: string;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cx(
        menuItemClassName,
        danger &&
          "text-[#c73a3a] hover:bg-[#fff1f1] focus-visible:ring-[#c73a3a]/20",
      )}
      disabled={pending}
      role="menuitem"
      type="submit"
    >
      {pending ? "…" : children}
    </button>
  );
}
