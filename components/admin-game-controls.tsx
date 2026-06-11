"use client";

import { useActionState, useState } from "react";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { Alert } from "@/components/ui/alert";
import { Button, SubmitButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

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
  deleteOccurrenceLabel: string;
  deleteScopeCloseLabel: string;
  deleteScopeIntro: string;
  deleteScopeTitle: string;
  deleteSeriesConfirmMessage: string;
  deleteSeriesLabel: string;
  isCancelled: boolean;
  isRecurring: boolean;
  statusLabels: Partial<Record<GameActionStatus, string>>;
};

const initialState: GameActionState = {};
const successStatuses = new Set<GameActionStatus>([
  "cancelled-game",
  "cancelled-series",
]);

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
  deleteOccurrenceLabel,
  deleteScopeCloseLabel,
  deleteScopeIntro,
  deleteScopeTitle,
  deleteSeriesConfirmMessage,
  deleteSeriesLabel,
  isCancelled,
  isRecurring,
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
  const [deleteScopeOpen, setDeleteScopeOpen] = useState(false);
  const status = deleteState.status ?? cancelState.status;

  return (
    <Card>
      {status && statusLabels[status] ? (
        <Alert variant={successStatuses.has(status) ? "success" : "error"}>
          {statusLabels[status]}
        </Alert>
      ) : null}

      <div className={status ? "mt-4 grid gap-3" : "grid gap-3"}>
        <div className="flex flex-wrap gap-3">
          {!isCancelled ? (
            <form
              action={cancelFormAction}
              onSubmit={(event) => {
                if (!window.confirm(cancelConfirmMessage)) {
                  event.preventDefault();
                }
              }}
            >
              <input name="scope" type="hidden" value="occurrence" />
              <AdminActionButton label={cancelLabel} />
            </form>
          ) : null}

          <form
            action={deleteFormAction}
            onSubmit={(event) => {
              if (isRecurring) {
                event.preventDefault();
                setDeleteScopeOpen(true);
                return;
              }

              if (!window.confirm(deleteConfirmMessage)) {
                event.preventDefault();
              }
            }}
          >
            <input name="scope" type="hidden" value="occurrence" />
            <AdminActionButton destructive label={deleteLabel} />
          </form>
        </div>
      </div>

      <Modal
        closeLabel={deleteScopeCloseLabel}
        onClose={() => {
          setDeleteScopeOpen(false);
        }}
        open={deleteScopeOpen}
        title={deleteScopeTitle}
      >
        <div className="mt-5 grid gap-4">
          <p className="text-sm leading-6 text-[#33433d]">{deleteScopeIntro}</p>

          <div className="flex flex-wrap gap-3">
            <form
              action={deleteFormAction}
              onSubmit={(event) => {
                if (!window.confirm(deleteConfirmMessage)) {
                  event.preventDefault();
                }
              }}
            >
              <input name="scope" type="hidden" value="occurrence" />
              <SubmitButton size="compact" variant="dangerOutline">
                {deleteOccurrenceLabel}
              </SubmitButton>
            </form>

            <form
              action={deleteFormAction}
              onSubmit={(event) => {
                if (!window.confirm(deleteSeriesConfirmMessage)) {
                  event.preventDefault();
                }
              }}
            >
              <input name="scope" type="hidden" value="series" />
              <SubmitButton size="compact" variant="dangerOutline">
                {deleteSeriesLabel}
              </SubmitButton>
            </form>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
