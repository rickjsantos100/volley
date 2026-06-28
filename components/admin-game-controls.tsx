"use client";

import { useActionState, useState } from "react";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { Button, SubmitButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal, ModalActions } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";

type AdminGameControlsProps = {
  cancelAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  cancelConfirmMessage: string;
  cancelLabel: string;
  uncancelAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  uncancelLabel: string;
  deleteAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  deleteConfirmMessage: string;
  deleteLabel: string;
  deleteOccurrenceLabel: string;
  deleteScopeIntro: string;
  deleteScopeTitle: string;
  deleteSeriesLabel: string;
  isCancelled: boolean;
  isRecurring: boolean;
  statusLabels: Partial<Record<GameActionStatus, string>>;
};

type PendingConfirmation = {
  action: "cancel" | "delete";
  destructive: boolean;
  label: string;
  message: string;
  scope: "occurrence" | "series";
  title: string;
};

const initialState: GameActionState = {};
const errorStatuses = new Set<GameActionStatus>([
  "cancel-error",
  "delete-error",
  "not-authorized",
]);

function AdminActionButton({
  destructive = false,
  label,
  onClick,
}: {
  destructive?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      size="compact"
      type="button"
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
  uncancelAction,
  uncancelLabel,
  deleteAction,
  deleteConfirmMessage,
  deleteLabel,
  deleteOccurrenceLabel,
  deleteScopeIntro,
  deleteScopeTitle,
  deleteSeriesLabel,
  isCancelled,
  isRecurring,
  statusLabels,
}: AdminGameControlsProps) {
  const [deleteScopeOpen, setDeleteScopeOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

  async function handleCancelAction(
    previousState: GameActionState,
    formData: FormData,
  ) {
    const nextState = await cancelAction(previousState, formData);
    setPendingConfirmation(null);
    return nextState;
  }

  async function handleDeleteAction(
    previousState: GameActionState,
    formData: FormData,
  ) {
    const nextState = await deleteAction(previousState, formData);
    setDeleteScopeOpen(false);
    setPendingConfirmation(null);
    return nextState;
  }

  const [cancelState, cancelFormAction] = useActionState(
    handleCancelAction,
    initialState,
  );
  const [uncancelState, uncancelFormAction] = useActionState(
    uncancelAction,
    initialState,
  );
  const [deleteState, deleteFormAction] = useActionState(
    handleDeleteAction,
    initialState,
  );
  const status =
    deleteState.status ?? uncancelState.status ?? cancelState.status;

  return (
    <Card>
      {status && errorStatuses.has(status) && statusLabels[status] ? (
        <Toast variant="error">{statusLabels[status]}</Toast>
      ) : null}

      <div className="grid gap-3">
        <div className="flex flex-wrap gap-3">
          {!isCancelled ? (
            <AdminActionButton
              label={cancelLabel}
              onClick={() => {
                setPendingConfirmation({
                  action: "cancel",
                  destructive: false,
                  label: cancelLabel,
                  message: cancelConfirmMessage,
                  scope: "occurrence",
                  title: cancelLabel,
                });
              }}
            />
          ) : (
            <form action={uncancelFormAction}>
              <SubmitButton size="compact" variant="outline">
                {uncancelLabel}
              </SubmitButton>
            </form>
          )}

          <AdminActionButton
            destructive
            label={deleteLabel}
            onClick={() => {
              if (isRecurring) {
                setDeleteScopeOpen(true);
                return;
              }

              setPendingConfirmation({
                action: "delete",
                destructive: true,
                label: deleteLabel,
                message: deleteConfirmMessage,
                scope: "occurrence",
                title: deleteLabel,
              });
            }}
          />
        </div>
      </div>

      <Modal
        onClose={() => {
          setDeleteScopeOpen(false);
        }}
        open={deleteScopeOpen}
        title={deleteScopeTitle}
      >
        <div className="mt-5 grid gap-4">
          <p className="text-sm leading-6 text-[#667085]">{deleteScopeIntro}</p>

          <ModalActions>
            <form action={deleteFormAction}>
              <input name="scope" type="hidden" value="occurrence" />
              <SubmitButton size="compact" variant="dangerOutline">
                {deleteOccurrenceLabel}
              </SubmitButton>
            </form>

            <form action={deleteFormAction}>
              <input name="scope" type="hidden" value="series" />
              <SubmitButton size="compact" variant="dangerOutline">
                {deleteSeriesLabel}
              </SubmitButton>
            </form>
          </ModalActions>
        </div>
      </Modal>

      <Modal
        onClose={() => {
          setPendingConfirmation(null);
        }}
        open={Boolean(pendingConfirmation)}
        title={pendingConfirmation?.title ?? ""}
      >
        {pendingConfirmation ? (
          <div className="mt-5 grid gap-4">
            <p className="text-sm leading-6 text-[#667085]">
              {pendingConfirmation.message}
            </p>
            <ModalActions>
              <form
                action={
                  pendingConfirmation.action === "cancel"
                    ? cancelFormAction
                    : deleteFormAction
                }
              >
                <input
                  name="scope"
                  type="hidden"
                  value={pendingConfirmation.scope}
                />
                <SubmitButton
                  size="compact"
                  variant={
                    pendingConfirmation.destructive
                      ? "dangerOutline"
                      : "outline"
                  }
                >
                  {pendingConfirmation.label}
                </SubmitButton>
              </form>
            </ModalActions>
          </div>
        ) : null}
      </Modal>
    </Card>
  );
}
