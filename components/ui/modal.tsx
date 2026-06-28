"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "./class-name";

type ModalProps = {
  children: ReactNode;
  onClose: () => boolean | void;
  open: boolean;
  title: string;
};

type ModalActionsProps = {
  children: ReactNode;
  className?: string;
};

type ScrollLockState = {
  left: string;
  overflow: string;
  position: string;
  right: string;
  scrollX: number;
  scrollY: number;
  top: string;
};

let openModalCount = 0;
let scrollLockState: ScrollLockState | null = null;

export function ModalActions({
  children,
  className,
}: ModalActionsProps) {
  return (
    <div
      className={cx(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end [&>form]:w-full [&>form>button]:w-full sm:[&>form]:w-auto sm:[&>form>button]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

function lockPageScroll() {
  openModalCount += 1;

  if (openModalCount === 1) {
    const { body } = document;

    scrollLockState = {
      left: body.style.left,
      overflow: body.style.overflow,
      position: body.style.position,
      right: body.style.right,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      top: body.style.top,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollLockState.scrollY}px`;
    body.style.right = "0";
    body.style.left = "0";
    body.style.overflow = "hidden";
  }

  return () => {
    openModalCount = Math.max(0, openModalCount - 1);

    if (openModalCount > 0 || !scrollLockState) {
      return;
    }

    const { body } = document;
    const previousState = scrollLockState;
    scrollLockState = null;

    body.style.position = previousState.position;
    body.style.top = previousState.top;
    body.style.right = previousState.right;
    body.style.left = previousState.left;
    body.style.overflow = previousState.overflow;
    window.scrollTo(previousState.scrollX, previousState.scrollY);
  };
}

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
      if (window.history.state?.__volleyModalId === modalId) {
        return;
      }

      pushedHistoryRef.current = false;
      const shouldClose = closeModal();

      if (shouldClose === false) {
        window.history.pushState(modalState, "", window.location.href);
        pushedHistoryRef.current = true;
        closingFromPopstateRef.current = false;
        return;
      }

      closingFromPopstateRef.current = true;
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

  useEffect(() => {
    if (!open) {
      return;
    }

    return lockPageScroll();
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleCloseClick() {
    onClose();
  }

  return createPortal(
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-[#101828]/55 px-4 py-4 sm:items-center"
      role="presentation"
    >
      <div
        aria-modal="true"
        role="dialog"
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-[#dde2ea] bg-white p-5 shadow-[0_16px_40px_rgba(16,24,40,0.18)] sm:p-6"
      >
        <button
          aria-label="Fechar"
          className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-[10px] border-0 bg-transparent text-[#667085] transition-[background-color,color,box-shadow,transform] hover:bg-[#eef1f5] hover:text-[#101828] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 active:translate-y-px"
          onClick={handleCloseClick}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.25"
            viewBox="0 0 24 24"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
        <div className="pr-12">
          <h2 className="font-matchday text-[26px] leading-7 font-bold text-[#061b6b]">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
