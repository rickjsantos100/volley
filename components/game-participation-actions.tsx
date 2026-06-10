"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { Alert } from "@/components/ui/alert";
import { Button, SubmitButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
const successStatuses = new Set<GameActionStatus>([
  "joined-game",
  "joined-waitlist",
  "left-game",
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
    return handleAction(leaveGameAction, previousState, formData);
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
      {status ? (
        <Alert variant={successStatuses.has(status) ? "success" : "error"}>
          {statusLabels[status]}
        </Alert>
      ) : null}

      <Card>
        {isParticipant ? (
          <form
            action={submitAction}
            onSubmit={(event) => {
              if (!window.confirm(confirmLeaveMessage)) {
                event.preventDefault();
              }
            }}
          >
            <SubmitButton fullWidth variant="dangerOutline" className="sm:w-auto">
              {leaveGameLabel}
            </SubmitButton>
          </form>
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
    </>
  );
}
