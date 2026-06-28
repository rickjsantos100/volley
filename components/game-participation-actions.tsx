"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import {
  GameShareButton,
  type GameShareProps,
} from "@/components/game-share-button";
import { Button, buttonClassName, SubmitButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

type GameParticipationActionsProps = {
  alreadyWaitlistedLabel: string;
  calendar: {
    googleCalendarUrl: string;
    label: string;
  };
  confirmLeaveMessage: string;
  finalizePaymentProofAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  isFull: boolean;
  isParticipant: boolean;
  isWaitlisted: boolean;
  joinGameAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  joinGameLabel: string;
  joinWaitlistAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  joinWaitlistLabel: string;
  leaveGameAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  leaveGameLabel: string;
  paymentProof: {
    deletedAt: string | null;
    path: string | null;
    requestedAt: string | null;
    storagePath: string;
  };
  proofLabels: {
    add: string;
    addLater: string;
    added: string;
    file: string;
    fileHelp: string;
    invalidFile: string;
    replace: string;
    requested: string;
    submit: string;
    title: string;
  };
  share: GameShareProps;
  statusLabels: Record<GameActionStatus, string>;
};

const initialState: GameActionState = {};
const errorStatuses = new Set<GameActionStatus>([
  "join-error",
  "waitlist-error",
  "leave-error",
  "proof-upload-error",
]);
const allowedProofTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const maxProofBytes = 5 * 1024 * 1024;
const proofMimeTypesByExtension: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  webp: "image/webp",
};

function getProofMimeType(file: File) {
  if (allowedProofTypes.has(file.type)) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? proofMimeTypesByExtension[extension] ?? null : null;
}

export function GameParticipationActions({
  alreadyWaitlistedLabel,
  calendar,
  confirmLeaveMessage,
  finalizePaymentProofAction,
  isFull,
  isParticipant,
  isWaitlisted,
  joinGameAction,
  joinGameLabel,
  joinWaitlistAction,
  joinWaitlistLabel,
  leaveGameAction,
  leaveGameLabel,
  paymentProof,
  proofLabels,
  share,
  statusLabels,
}: GameParticipationActionsProps) {
  const router = useRouter();
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofFileError, setProofFileError] = useState<string | null>(null);
  const [localState, setLocalState] = useState<GameActionState>({});
  const [proofPending, startProofTransition] = useTransition();

  async function handleAction(
    action: (
      previousState: GameActionState,
      formData: FormData,
    ) => Promise<GameActionState>,
    _previousState: GameActionState,
    formData: FormData,
  ) {
    const nextState = await action(initialState, formData);

    if (nextState.status) {
      router.refresh();
    }

    return nextState;
  }

  async function handleJoinWaitlist(
    previousState: GameActionState,
    formData: FormData,
  ) {
    return handleAction(joinWaitlistAction, previousState, formData);
  }

  async function handleLeaveGame(
    previousState: GameActionState,
    formData: FormData,
  ) {
    const nextState = await handleAction(
      leaveGameAction,
      previousState,
      formData,
    );
    setLeaveConfirmOpen(false);
    return nextState;
  }

  const [actionState, submitAction] = useActionState(
    isParticipant ? handleLeaveGame : handleJoinWaitlist,
    initialState,
  );
  const status = localState.status ?? actionState.status;

  function closeProofModal() {
    if (proofPending) {
      return;
    }

    setProofModalOpen(false);
    setProofFile(null);
    setProofFileError(null);
  }

  function openProofModal() {
    setLocalState({});
    setProofFile(null);
    setProofFileError(null);
    setProofModalOpen(true);
  }

  function chooseProofFile(file: File | null) {
    setProofFileError(null);

    if (
      file &&
      (!getProofMimeType(file) || file.size > maxProofBytes)
    ) {
      setProofFile(null);
      setProofFileError(proofLabels.invalidFile);
      return;
    }

    setProofFile(file);
  }

  function addProofLater() {
    startProofTransition(async () => {
      const nextState = await joinGameAction(initialState, new FormData());
      setLocalState(nextState);

      if (nextState.status === "joined-game") {
        setProofModalOpen(false);
        setProofFile(null);
        router.refresh();
      }
    });
  }

  function uploadProof() {
    const proofMimeType = proofFile ? getProofMimeType(proofFile) : null;

    if (!proofFile || !proofMimeType) {
      setProofFileError(proofLabels.invalidFile);
      return;
    }

    startProofTransition(async () => {
      let joinedDuringUpload = false;

      if (!isParticipant) {
        const joinState = await joinGameAction(initialState, new FormData());

        if (joinState.status !== "joined-game") {
          setLocalState(joinState);
          return;
        }

        joinedDuringUpload = true;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(paymentProof.storagePath, proofFile, {
          cacheControl: "3600",
          contentType: proofMimeType,
          upsert: true,
        });

      if (uploadError) {
        setLocalState({ status: "proof-upload-error" });

        if (joinedDuringUpload) {
          setProofModalOpen(false);
          router.refresh();
        }

        return;
      }

      const proofData = new FormData();
      proofData.set("filename", proofFile.name);
      proofData.set("mimeType", proofMimeType);
      const nextState = await finalizePaymentProofAction(
        initialState,
        proofData,
      );
      setLocalState(nextState);

      if (nextState.status === "proof-uploaded") {
        setProofModalOpen(false);
        setProofFile(null);
      }

      router.refresh();
    });
  }

  return (
    <>
      {status && errorStatuses.has(status) ? (
        <Toast variant="error">{statusLabels[status]}</Toast>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row">
          {isParticipant ? (
            <Button
              fullWidth
              variant="dangerOutline"
              className="sm:w-auto"
              type="button"
              onClick={() => {
                setLeaveConfirmOpen(true);
              }}
            >
              {leaveGameLabel}
            </Button>
          ) : isWaitlisted ? (
            <Button
              disabled
              fullWidth
              type="button"
              variant="outline"
              className="border-[#dde2ea] bg-[#eef1f5] text-[#475467] sm:w-auto"
            >
              {alreadyWaitlistedLabel}
            </Button>
          ) : isFull ? (
            <form action={submitAction}>
              <SubmitButton fullWidth className="sm:w-auto">
                {joinWaitlistLabel}
              </SubmitButton>
            </form>
          ) : (
            <Button
              fullWidth
              className="sm:w-auto"
              onClick={openProofModal}
              type="button"
            >
              {joinGameLabel}
            </Button>
          )}
          {isParticipant && !paymentProof.deletedAt ? (
            <Button
              fullWidth
              className="sm:w-auto"
              onClick={openProofModal}
              type="button"
              variant="outline"
            >
              {paymentProof.path ? proofLabels.replace : proofLabels.add}
            </Button>
          ) : null}
          <GameShareButton {...share} />
          <a
            className={buttonClassName({
              className: "sm:w-auto",
              fullWidth: true,
              variant: "outline",
            })}
            href={calendar.googleCalendarUrl}
            rel="noreferrer"
            target="_blank"
          >
            <span className="inline-flex items-center gap-2">
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect height="18" rx="2" width="18" x="3" y="4" />
                <path d="M3 10h18" />
                <path d="M12 14v4" />
                <path d="M10 16h4" />
              </svg>
              {calendar.label}
            </span>
          </a>
        </div>
      </Card>

      <Modal
        onClose={() => {
          setLeaveConfirmOpen(false);
        }}
        open={leaveConfirmOpen}
        title={leaveGameLabel}
      >
        <div className="mt-5 grid gap-4">
          <p className="text-sm leading-6 text-[#667085]">
            {confirmLeaveMessage}
          </p>
          <form action={submitAction}>
            <SubmitButton fullWidth variant="dangerOutline">
              {leaveGameLabel}
            </SubmitButton>
          </form>
        </div>
      </Modal>

      <Modal
        onClose={closeProofModal}
        open={proofModalOpen}
        title={proofLabels.title}
      >
        <div className="mt-5 grid gap-4">
          {paymentProof.path ? (
            <p className="text-sm font-semibold text-[#138a5b]">
              {proofLabels.added}
            </p>
          ) : paymentProof.requestedAt ? (
            <p className="text-sm font-semibold text-[#8a6500]">
              {proofLabels.requested}
            </p>
          ) : null}

          <Field
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            error={proofFileError}
            id="payment-proof"
            label={proofLabels.file}
            onChange={(event) => {
              chooseProofFile(event.target.files?.[0] ?? null);
            }}
            type="file"
          />
          <p className="text-[13px] leading-5 text-[#667085]">
            {proofLabels.fileHelp}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              disabled={proofPending}
              fullWidth
              loading={proofPending}
              onClick={uploadProof}
              type="button"
            >
              {proofLabels.submit}
            </Button>
            {!isParticipant ? (
              <Button
                disabled={proofPending}
                fullWidth
                onClick={addProofLater}
                type="button"
                variant="outline"
              >
                {proofLabels.addLater}
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
}
