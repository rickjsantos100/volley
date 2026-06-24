"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import {
  GameShareButton,
  type GameShareProps,
} from "@/components/game-share-button";
import { Button, buttonClassName, SubmitButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";

type GameParticipationActionsProps = {
  alreadyWaitlistedLabel: string;
  calendar: {
    href: string;
    label: string;
  };
  confirmLeaveMessage: string;
  isFull: boolean;
  isParticipant: boolean;
  isWaitlisted: boolean;
  joinGameAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  joinGameLabel: string;
  joinWaitlistAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  joinWaitlistLabel: string;
  leaveGameAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  leaveGameLabel: string;
  share: GameShareProps;
  statusLabels: Record<GameActionStatus, string>;
};

const initialState: GameActionState = {};
const errorStatuses = new Set<GameActionStatus>([
  "join-error",
  "waitlist-error",
  "leave-error",
]);

export function GameParticipationActions({
  alreadyWaitlistedLabel,
  calendar,
  confirmLeaveMessage,
  isFull,
  isParticipant,
  isWaitlisted,
  joinGameAction,
  joinGameLabel,
  joinWaitlistAction,
  joinWaitlistLabel,
  leaveGameAction,
  leaveGameLabel,
  share,
  statusLabels,
}: GameParticipationActionsProps) {
  const router = useRouter();
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  async function handleAction(
    action: (
      previousState: GameActionState,
      formData: FormData,
    ) => Promise<GameActionState>,
    _previousState: GameActionState,
    formData: FormData,
  ) {
    const nextState = await action(initialState, formData);

    if (nextState.status) {
      router.refresh();
    }

    return nextState;
  }

  async function handleJoinGame(
    previousState: GameActionState,
    formData: FormData,
  ) {
    return handleAction(joinGameAction, previousState, formData);
  }

  async function handleJoinWaitlist(
    previousState: GameActionState,
    formData: FormData,
  ) {
    return handleAction(joinWaitlistAction, previousState, formData);
  }

  async function handleLeaveGame(
    previousState: GameActionState,
    formData: FormData,
  ) {
    const nextState = await handleAction(leaveGameAction, previousState, formData);
    setLeaveConfirmOpen(false);
    return nextState;
  }

  const [actionState, submitAction] = useActionState(
    isParticipant
      ? handleLeaveGame
      : isFull
        ? handleJoinWaitlist
        : handleJoinGame,
    initialState,
  );
  const status = actionState.status;

  return (
    <>
      {status && errorStatuses.has(status) ? (
        <Toast variant="error">{statusLabels[status]}</Toast>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row">
          {isParticipant ? (
            <Button
              fullWidth
              variant="dangerOutline"
              className="sm:w-auto"
              type="button"
              onClick={() => {
                setLeaveConfirmOpen(true);
              }}
            >
              {leaveGameLabel}
            </Button>
          ) : isWaitlisted ? (
            <Button
              disabled
              fullWidth
              type="button"
              variant="outline"
              className="border-[#dde2ea] bg-[#eef1f5] text-[#475467] sm:w-auto"
            >
              {alreadyWaitlistedLabel}
            </Button>
          ) : isFull ? (
            <form action={submitAction}>
              <SubmitButton fullWidth className="sm:w-auto">
                {joinWaitlistLabel}
              </SubmitButton>
            </form>
          ) : (
            <form action={submitAction}>
              <SubmitButton fullWidth className="sm:w-auto">
                {joinGameLabel}
              </SubmitButton>
            </form>
          )}
          <GameShareButton {...share} />
          <a
            className={buttonClassName({
              className: "sm:w-auto",
              fullWidth: true,
              variant: "outline",
            })}
            href={calendar.href}
          >
            <span className="inline-flex items-center gap-2">
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
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect height="18" rx="2" width="18" x="3" y="4" />
                <path d="M3 10h18" />
                <path d="M12 14v4" />
                <path d="M10 16h4" />
              </svg>
              {calendar.label}
            </span>
          </a>
        </div>
      </Card>

      <Modal
        onClose={() => {
          setLeaveConfirmOpen(false);
        }}
        open={leaveConfirmOpen}
        title={leaveGameLabel}
      >
        <div className="mt-5 grid gap-4">
          <p className="text-sm leading-6 text-[#667085]">
            {confirmLeaveMessage}
          </p>
          <form action={submitAction}>
            <SubmitButton fullWidth variant="dangerOutline">
              {leaveGameLabel}
            </SubmitButton>
          </form>
        </div>
      </Modal>
    </>
  );
}
