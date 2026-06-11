"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CreateGameActionState,
  CreateGameActionStatus,
} from "@/app/dashboard/actions";
import { Button, SubmitButton } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";

type AdminCreateGameButtonProps = {
  action: (
    previousState: CreateGameActionState,
    formData: FormData,
  ) => Promise<CreateGameActionState>;
  labels: {
    button: string;
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
      {status && errorStatuses.has(status) ? (
        <Toast variant="error">
          {getStatusMessage(status, labels)}
        </Toast>
      ) : null}

      <Button
        className="bottom-4 left-4 z-50 shadow-[0_2px_10px_rgba(0,0,0,0.18)] sm:bottom-6 sm:left-6"
        fixed
        type="button"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        <span className="inline-flex items-center gap-3">
          <span aria-hidden="true" className="text-xl leading-none">
            +
          </span>
          {labels.button}
        </span>
      </Button>

      <Modal
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
