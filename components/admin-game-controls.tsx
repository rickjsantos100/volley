"use client";

import { useActionState } from "react";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AdminGameControlsProps = {
  cancelAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  cancelConfirmMessage: string;
  cancelLabel: string;
  deleteAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  deleteConfirmMessage: string;
  deleteLabel: string;
  isCancelled: boolean;
  statusLabels: Partial<Record<GameActionStatus, string>>;
};

const initialState: GameActionState = {};
const successStatuses = new Set<GameActionStatus>(["cancelled-game"]);

function AdminActionButton({
  destructive = false,
  label,
}: {
  destructive?: boolean;
  label: string;
}) {
  return (
    <Button
      size="compact"
      variant={destructive ? "dangerOutline" : "outline"}
    >
      {label}
    </Button>
  );
}

export function AdminGameControls({
  cancelAction,
  cancelConfirmMessage,
  cancelLabel,
  deleteAction,
  deleteConfirmMessage,
  deleteLabel,
  isCancelled,
  statusLabels,
}: AdminGameControlsProps) {
  const [cancelState, cancelFormAction] = useActionState(
    cancelAction,
    initialState,
  );
  const [deleteState, deleteFormAction] = useActionState(
    deleteAction,
    initialState,
  );
  const status = deleteState.status ?? cancelState.status;

  return (
    <Card>
      {status && statusLabels[status] ? (
        <Alert variant={successStatuses.has(status) ? "success" : "error"}>
          {statusLabels[status]}
        </Alert>
      ) : null}

      <div
        className={status ? "mt-4 flex flex-wrap gap-3" : "flex flex-wrap gap-3"}
      >
        {!isCancelled ? (
          <form
            action={cancelFormAction}
            onSubmit={(event) => {
              if (!window.confirm(cancelConfirmMessage)) {
                event.preventDefault();
              }
            }}
          >
            <AdminActionButton label={cancelLabel} />
          </form>
        ) : null}

        <form
          action={deleteFormAction}
          onSubmit={(event) => {
            if (!window.confirm(deleteConfirmMessage)) {
              event.preventDefault();
            }
          }}
        >
          <AdminActionButton destructive label={deleteLabel} />
        </form>
      </div>
    </Card>
  );
}
