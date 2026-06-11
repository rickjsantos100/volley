"use client";

import { useActionState } from "react";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { cx } from "@/components/ui/class-name";
import { Toast } from "@/components/ui/toast";
import { useFormStatus } from "react-dom";

type AdminParticipantPaymentControlProps = {
  action: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  paidLabel: string;
  disabled?: boolean;
  paymentStatus: "paid" | "unpaid" | null;
  statusLabels: Partial<Record<GameActionStatus, string>>;
  unpaidLabel: string;
};

const initialState: GameActionState = {};

export function AdminParticipantPaymentControl({
  action,
  disabled = false,
  paidLabel,
  paymentStatus,
  statusLabels,
  unpaidLabel,
}: AdminParticipantPaymentControlProps) {
  const [state, formAction] = useActionState(action, initialState);
  const status = state.status;
  const isPaid = paymentStatus === "paid";
  const nextStatus = isPaid ? "unpaid" : "paid";
  const isError = status && status !== "payment-updated";

  return (
    <div className="grid gap-2 sm:justify-items-end">
      {isError && statusLabels[status] ? (
        <Toast variant="error">
          {statusLabels[status]}
        </Toast>
      ) : null}
      <form action={formAction}>
        <input name="paymentStatus" type="hidden" value={nextStatus} />
        <PaymentStatusButton disabled={disabled} isPaid={isPaid}>
          {isPaid ? paidLabel : unpaidLabel}
        </PaymentStatusButton>
      </form>
    </div>
  );
}

function PaymentStatusButton({
  children,
  disabled,
  isPaid,
}: {
  children: string;
  disabled: boolean;
  isPaid: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cx(
        "w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100",
        isPaid
          ? "bg-[#fff3b0] text-[#0737a8] hover:bg-[#ffe98a]"
          : "bg-[#fff8d8] text-[#26375f] hover:bg-[#fff3b0]",
      )}
      disabled={pending || disabled}
      title="Toggle payment status"
    >
      {pending ? "..." : children}
    </button>
  );
}
