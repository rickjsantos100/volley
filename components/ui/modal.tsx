"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Modal({
  children,
  onClose,
  open,
  title,
}: ModalProps) {
  const modalId = useId();
  const closeModal = useEffectEvent(onClose);
  const pushedHistoryRef = useRef(false);
  const closingFromPopstateRef = useRef(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const historyState = window.history.state as Record<string, unknown> | null;
    const modalState = {
      ...(historyState ?? {}),
      __volleyModalId: modalId,
    };

    window.history.pushState(modalState, "", window.location.href);
    pushedHistoryRef.current = true;
    closingFromPopstateRef.current = false;

    function handlePopstate() {
      pushedHistoryRef.current = false;
      closingFromPopstateRef.current = true;
      closeModal();
    }

    window.addEventListener("popstate", handlePopstate);

    return () => {
      window.removeEventListener("popstate", handlePopstate);

      if (
        pushedHistoryRef.current &&
        !closingFromPopstateRef.current &&
        window.history.state?.__volleyModalId === modalId
      ) {
        pushedHistoryRef.current = false;
        window.history.back();
      }
    };
  }, [modalId, open]);

  if (!open) {
    return null;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-4 py-4 sm:items-center"
      role="presentation"
    >
      <div
        aria-modal="true"
        role="dialog"
        className="w-full max-w-md rounded-xl bg-white px-5 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.24)]"
      >
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.01em] text-[#006241]">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>
  );
}
