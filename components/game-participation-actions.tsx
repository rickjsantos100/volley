"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { Button, SubmitButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";

type GameParticipationActionsProps = {
  alreadyWaitlistedLabel: string;
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
            className="bg-[#d4e9e2] text-[#006241] sm:w-auto"
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
      </Card>

      <Modal
        onClose={() => {
          setLeaveConfirmOpen(false);
        }}
        open={leaveConfirmOpen}
        title={leaveGameLabel}
      >
        <div className="mt-5 grid gap-4">
          <p className="text-sm leading-6 text-[#33433d]">
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
