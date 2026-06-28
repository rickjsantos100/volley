"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { Button, SubmitButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
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
  editAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  editDurationMinutes: number;
  editLabels: {
    button: string;
    date: string;
    endsAt: string;
    error: string;
    maxParticipants: string;
    notAuthorized: string;
    scopeIntro: string;
    scopeOccurrence: string;
    scopeSeries: string;
    scopeTitle: string;
    seriesSuccess: string;
    startsAt: string;
    submit: string;
    success: string;
    title: string;
    validationError: string;
  };
  editMaxParticipants: number;
  editStartsAt: string;
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
  "edit-error",
  "edit-not-authorized",
  "not-authorized",
]);

// ── Edit form helpers ──────────────────────────────────────────

function padNumber(value: number) {
  return value.toString().padStart(2, "0");
}

const timeOptions = Array.from({ length: 24 * 4 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  return `${padNumber(hours)}:${padNumber(minutes)}`;
});

function getLocalDateValue(date: Date) {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
  ].join("-");
}

function getLocalTimeValue(date: Date) {
  return [padNumber(date.getHours()), padNumber(date.getMinutes())].join(":");
}

function getInitialSchedule(startsAt: string, durationMinutes: number) {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return {
    date: getLocalDateValue(start),
    endTime: getLocalTimeValue(end),
    startTime: getLocalTimeValue(start),
  };
}

function TimeSelect({
  label,
  name,
  onChange,
  value,
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="block text-sm font-semibold text-[#101828]"
      >
        {label}
      </label>
      <select
        className={inputClassName(false)}
        id={name}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        required
        value={value}
      >
        {timeOptions.map((timeOption) => (
          <option key={timeOption} value={timeOption}>
            {timeOption}
          </option>
        ))}
      </select>
    </div>
  );
}

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
  editAction,
  editDurationMinutes,
  editLabels,
  editMaxParticipants,
  editStartsAt,
  isCancelled,
  isRecurring,
  statusLabels,
}: AdminGameControlsProps) {
  const router = useRouter();
  const [deleteScopeOpen, setDeleteScopeOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

  // Edit state
  const [editScopeOpen, setEditScopeOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editScope, setEditScope] = useState<"occurrence" | "series">(
    "occurrence",
  );
  const [editSchedule, setEditSchedule] = useState(() =>
    getInitialSchedule(editStartsAt, editDurationMinutes),
  );
  const today = getLocalDateValue(new Date());

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

  async function handleEditAction(
    previousState: GameActionState,
    formData: FormData,
  ) {
    const nextState = await editAction(previousState, formData);
    if (
      nextState.status === "edited-game" ||
      nextState.status === "edited-series"
    ) {
      router.refresh();
      setEditFormOpen(false);
    }
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
  const [editState, editFormAction, editPending] = useActionState(
    handleEditAction,
    initialState,
  );

  const status =
    deleteState.status ??
    uncancelState.status ??
    cancelState.status ??
    editState.status;

  const computedStartsAt = `${editSchedule.date}T${editSchedule.startTime}`;
  const computedEndsAt = `${editSchedule.date}T${editSchedule.endTime}`;

  return (
    <Card>
      {status && errorStatuses.has(status) && statusLabels[status] ? (
        <Toast variant="error">{statusLabels[status]}</Toast>
      ) : null}

      <div className="grid gap-3">
        <div className="flex flex-wrap gap-3">
          {!isCancelled ? (
            <>
              <Button
                onClick={() => {
                  setEditSchedule(
                    getInitialSchedule(editStartsAt, editDurationMinutes),
                  );
                  if (isRecurring) {
                    setEditScopeOpen(true);
                  } else {
                    setEditScope("occurrence");
                    setEditFormOpen(true);
                  }
                }}
                size="compact"
                type="button"
                variant="outline"
              >
                {editLabels.button}
              </Button>

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
            </>
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

      {/* Edit scope modal (recurring games) */}
      <Modal
        onClose={() => setEditScopeOpen(false)}
        open={editScopeOpen}
        title={editLabels.scopeTitle}
      >
        <div className="mt-5 grid gap-4">
          <p className="text-sm leading-6 text-[#667085]">
            {editLabels.scopeIntro}
          </p>
          <ModalActions>
            <Button
              onClick={() => {
                setEditScope("occurrence");
                setEditScopeOpen(false);
                setTimeout(() => setEditFormOpen(true), 0);
              }}
              size="compact"
              type="button"
              variant="outline"
            >
              {editLabels.scopeOccurrence}
            </Button>
            <Button
              onClick={() => {
                setEditScope("series");
                setEditScopeOpen(false);
                setTimeout(() => setEditFormOpen(true), 0);
              }}
              size="compact"
              type="button"
              variant="outline"
            >
              {editLabels.scopeSeries}
            </Button>
          </ModalActions>
        </div>
      </Modal>

      {/* Edit form modal */}
      <Modal
        onClose={() => setEditFormOpen(false)}
        open={editFormOpen}
        title={editLabels.title}
      >
        <form action={editFormAction} className="mt-6 grid gap-4">
          <input
            name="timezoneOffsetMinutes"
            type="hidden"
            value={new Date().getTimezoneOffset()}
          />
          <input name="startsAt" type="hidden" value={computedStartsAt} />
          <input name="endsAt" type="hidden" value={computedEndsAt} />
          <input name="scope" type="hidden" value={editScope} />

          <Field
            label={editLabels.date}
            min={today}
            name="gameDate"
            onChange={(event) =>
              setEditSchedule((current) => ({
                ...current,
                date: event.target.value,
              }))
            }
            required
            type="date"
            value={editSchedule.date}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TimeSelect
              label={editLabels.startsAt}
              name="startTime"
              onChange={(startTime) =>
                setEditSchedule((current) => ({ ...current, startTime }))
              }
              value={editSchedule.startTime}
            />
            <TimeSelect
              label={editLabels.endsAt}
              name="endTime"
              onChange={(endTime) =>
                setEditSchedule((current) => ({ ...current, endTime }))
              }
              value={editSchedule.endTime}
            />
          </div>

          <Field
            defaultValue={editMaxParticipants}
            label={editLabels.maxParticipants}
            min="1"
            name="maxParticipants"
            required
            type="number"
          />

          <ModalActions className="mt-2">
            <SubmitButton disabled={editPending}>
              {editLabels.submit}
            </SubmitButton>
          </ModalActions>
        </form>
      </Modal>

      {/* Delete scope modal */}
      <Modal
        onClose={() => setDeleteScopeOpen(false)}
        open={deleteScopeOpen}
        title={deleteScopeTitle}
      >
        <div className="mt-5 grid gap-4">
          <p className="text-sm leading-6 text-[#667085]">
            {deleteScopeIntro}
          </p>
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

      {/* Confirmation modal */}
      <Modal
        onClose={() => setPendingConfirmation(null)}
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