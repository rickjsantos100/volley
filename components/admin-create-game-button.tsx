"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CreateGameActionState,
  CreateGameActionStatus,
} from "@/app/dashboard/actions";
import { Button, SubmitButton } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
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
    date: string;
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

function getDefaultSchedule() {
  const start = new Date();
  start.setMinutes(start.getMinutes() + (30 - (start.getMinutes() % 30)), 0, 0);

  const end = new Date(start);
  end.setHours(end.getHours() + 2);

  if (end.getDate() !== start.getDate()) {
    start.setDate(start.getDate() + 1);
    start.setHours(19, 0, 0, 0);
    end.setTime(start.getTime());
    end.setHours(21, 0, 0, 0);
  }

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
      <label htmlFor={name} className="block text-sm font-semibold text-[#26375f]">
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
  const today = getLocalDateValue(new Date());
  const [schedule, setSchedule] = useState(getDefaultSchedule);
  const startsAt = `${schedule.date}T${schedule.startTime}`;
  const endsAt = `${schedule.date}T${schedule.endTime}`;

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
          setSchedule(getDefaultSchedule());
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
          <input name="startsAt" type="hidden" value={startsAt} />
          <input name="endsAt" type="hidden" value={endsAt} />

          <Field
            label={labels.date}
            min={today}
            name="gameDate"
            onChange={(event) =>
              setSchedule((currentSchedule) => ({
                ...currentSchedule,
                date: event.target.value,
              }))
            }
            required
            type="date"
            value={schedule.date}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TimeSelect
              label={labels.startsAt}
              name="startTime"
              onChange={(startTime) =>
                setSchedule((currentSchedule) => ({
                  ...currentSchedule,
                  startTime,
                }))
              }
              value={schedule.startTime}
            />

            <TimeSelect
              label={labels.endsAt}
              name="endTime"
              onChange={(endTime) =>
                setSchedule((currentSchedule) => ({
                  ...currentSchedule,
                  endTime,
                }))
              }
              value={schedule.endTime}
            />
          </div>

          <Field
            label={labels.maxParticipants}
            min="1"
            name="maxParticipants"
            required
            type="number"
          />

          <label className="flex items-center gap-3 text-sm font-semibold text-[#26375f]">
            <input
              name="isRepeatable"
              type="checkbox"
              className="size-4 accent-[#ffd21a]"
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
