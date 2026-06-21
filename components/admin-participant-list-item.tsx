"use client";

import { useState } from "react";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { AdminParticipantPaymentControl } from "@/components/admin-participant-payment-control";
import { AdminRemovePlayerButton } from "@/components/admin-remove-player-button";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { cx } from "@/components/ui/class-name";

type AdminParticipantListItemProps = {
  name: string;
  paidLabel: string;
  paymentAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  paymentStatus: "paid" | "unpaid" | null;
  removeAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  removeLabel: string;
  statusLabels: Partial<Record<GameActionStatus, string>>;
  unpaidLabel: string;
};

export function AdminParticipantListItem({
  name,
  paidLabel,
  paymentAction,
  paymentStatus,
  removeAction,
  removeLabel,
  statusLabels,
  unpaidLabel,
}: AdminParticipantListItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <li
      aria-busy={isDeleting}
      className={cx(
        "flex min-h-14 items-center justify-between gap-3 border-b border-[#dde2ea] py-3 transition last:border-b-0",
        isDeleting && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <InitialsAvatar name={name} />
        <p className="min-w-0 text-sm font-semibold text-[#101828] break-words">{name}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <AdminParticipantPaymentControl
          action={paymentAction}
          disabled={isDeleting}
          paidLabel={paidLabel}
          paymentStatus={paymentStatus}
          statusLabels={statusLabels}
          unpaidLabel={unpaidLabel}
        />
        <AdminRemovePlayerButton
          action={removeAction}
          label={removeLabel}
          onPendingChange={setIsDeleting}
          statusLabels={statusLabels}
        />
      </div>
    </li>
  );
}
