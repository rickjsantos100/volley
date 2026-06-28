"use client";

import { useState } from "react";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { AdminParticipantMenu } from "@/components/admin-participant-menu";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { cx } from "@/components/ui/class-name";

type AdminParticipantListItemProps = {
  actionsLabel: string;
  name: string;
  participantId: string;
  proofAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  proofDeletedAt: string | null;
  proofLabels: {
    expired: string;
    request: string;
    requested: string;
    view: string;
  };
  proofPath: string | null;
  proofRequestedAt: string | null;
  proofUploadedAt: string | null;
  removeAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  removeLabel: string;
  statusLabels: Partial<Record<GameActionStatus, string>>;
};

export function AdminParticipantListItem({
  actionsLabel,
  name,
  participantId,
  proofAction,
  proofDeletedAt,
  proofLabels,
  proofPath,
  proofRequestedAt,
  proofUploadedAt,
  removeAction,
  removeLabel,
  statusLabels,
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

      <AdminParticipantMenu
        actionsLabel={actionsLabel}
        disabled={isDeleting}
        onPendingChange={setIsDeleting}
        participantId={participantId}
        proofAction={proofAction}
        proofDeletedAt={proofDeletedAt}
        proofLabels={proofLabels}
        proofPath={proofPath}
        proofRequestedAt={proofRequestedAt}
        proofUploadedAt={proofUploadedAt}
        removeAction={removeAction}
        removeLabel={removeLabel}
        statusLabels={statusLabels}
      />
    </li>
  );
}
