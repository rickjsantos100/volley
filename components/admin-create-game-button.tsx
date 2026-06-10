"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CreateGameActionState,
  CreateGameActionStatus,
} from "@/app/dashboard/actions";
import { Alert } from "@/components/ui/alert";
import { Button, SubmitButton } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

type AdminCreateGameButtonProps = {
  action: (
    previousState: CreateGameActionState,
    formData: FormData,
  ) => Promise<CreateGameActionState>;
  labels: {
    button: string;
    cancel: string;
    create: string;
    createError: string;
    created: string;
    endsAt: string;
    maxParticipants: string;
    notAuthorized: string;
    repeat: string;
    startsAt: string;
    title: string;
    validationError: string;
  };
};

const initialState: CreateGameActionState = {};
const errorStatuses = new Set<CreateGameActionStatus>([
  "invalid",
  "not-authorized",
  "create-error",
]);

function getStatusMessage(
  status: CreateGameActionStatus,
  labels: AdminCreateGameButtonProps["labels"],
) {
  if (status === "created") {
    return labels.created;
  }

  if (status === "invalid") {
    return labels.validationError;
  }

  if (status === "not-authorized") {
    return labels.notAuthorized;
  }

  return labels.createError;
}

export function AdminCreateGameButton({
  action,
  labels,
}: AdminCreateGameButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  async function handleCreateGame(
    previousState: CreateGameActionState,
    formData: FormData,
  ) {
    const nextState = await action(previousState, formData);

    if (nextState.status === "created") {
      router.refresh();
      setIsOpen(false);
    }

    return nextState;
  }

  const [state, formAction, pending] = useActionState(
    handleCreateGame,
    initialState,
  );
  const status = state.status;

  return (
    <>
      {status ? (
        <Alert
          aria-live="polite"
          className="fixed bottom-24 left-4 z-50 max-w-[calc(100vw-2rem)] shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.24)] sm:left-6"
          variant={errorStatuses.has(status) ? "error" : "success"}
        >
          {getStatusMessage(status, labels)}
        </Alert>
      ) : null}

      <Button
        className="bottom-4 left-4 z-50 shadow-[0_2px_10px_rgba(0,0,0,0.18)] sm:bottom-6 sm:left-6"
        fixed
        type="button"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        <span aria-hidden="true" className="text-xl leading-none">
          +
        </span>
        {labels.button}
      </Button>

      <Modal
        closeLabel={labels.cancel}
        onClose={() => {
          setIsOpen(false);
        }}
        open={isOpen}
        title={labels.title}
      >
        <form action={formAction} className="mt-6 grid gap-4">
          <input
            name="timezoneOffsetMinutes"
            type="hidden"
            value={new Date().getTimezoneOffset()}
          />

          <Field
            label={labels.startsAt}
            name="startsAt"
            required
            type="datetime-local"
          />

          <Field
            label={labels.endsAt}
            name="endsAt"
            required
            type="datetime-local"
          />

          <Field
            label={labels.maxParticipants}
            min="1"
            name="maxParticipants"
            required
            type="number"
          />

          <label className="flex items-center gap-3 text-sm font-semibold text-[#33433d]">
            <input
              name="isRepeatable"
              type="checkbox"
              className="size-4 accent-[#00754A]"
            />
            <span>{labels.repeat}</span>
          </label>

          <SubmitButton className="mt-2" disabled={pending}>
            {labels.create}
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
}
