"use client";

import { useState } from "react";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { AdminParticipantMenu } from "@/components/admin-participant-menu";
import { AdminUserProfileModal } from "@/components/admin-user-profile-modal";
import { Badge } from "@/components/ui/badge";
import { cx } from "@/components/ui/class-name";

type AdminParticipantListItemProps = {
  actionsLabel: string;
  avatarUrl: string;
  email: string | null;
  contactLabels: {
    copied: string;
    copyEmail: string;
    copyPhone: string;
    openProfile: string;
  };
  name: string;
  paidLabel: string;
  participantId: string;
  phoneCountryCode: string;
  phoneNumber: string;
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
  avatarUrl,
  contactLabels,
  email,
  name,
  paidLabel,
  participantId,
  phoneCountryCode,
  phoneNumber,
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
      <AdminUserProfileModal
        avatarUrl={avatarUrl}
        email={email}
        labels={contactLabels}
        name={name}
        phoneCountryCode={phoneCountryCode}
        phoneNumber={phoneNumber}
      />

      <div className="flex shrink-0 items-center gap-2">
        {proofPath ? <Badge variant="success">{paidLabel}</Badge> : null}
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
      </div>
    </li>
  );
}
