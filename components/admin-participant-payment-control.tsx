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
        "min-h-11 w-fit shrink-0 rounded-[10px] border px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 active:translate-y-px disabled:cursor-default disabled:opacity-50",
        isPaid
          ? "border-[#138a5b]/25 bg-[#ecf8f3] text-[#0d6b46] hover:bg-[#dff2e9]"
          : "border-[#dde2ea] bg-white text-[#475467] hover:border-[#0737a8] hover:bg-[#eef3ff]",
      )}
      disabled={pending || disabled}
      title="Toggle payment status"
    >
      {pending ? "..." : children}
    </button>
  );
}
