"use client";

import { useActionState, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import type {
  GameActionState,
  GameActionStatus,
} from "@/app/dashboard/games/[gameId]/actions";
import { AdminRemovePlayerButton } from "@/components/admin-remove-player-button";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { Toast } from "@/components/ui/toast";
import { cx } from "@/components/ui/class-name";

type WaitlistItem = {
  id: string;
  name: string;
};

type AdminWaitlistSortableListProps = {
  action: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  dragHandleLabel: string;
  items: WaitlistItem[];
  removeLabel: string;
  removeAction: (
    waitlistEntryId: string,
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  statusLabels: Partial<Record<GameActionStatus, string>>;
};

const initialState: GameActionState = {};

export function AdminWaitlistSortableList({
  action,
  dragHandleLabel,
  items,
  removeAction,
  removeLabel,
  statusLabels,
}: AdminWaitlistSortableListProps) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const orderedEntryIdsRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedItems.findIndex((item) => item.id === active.id);
    const newIndex = orderedItems.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const nextItems = arrayMove(orderedItems, oldIndex, newIndex);
    setOrderedItems(nextItems);

    if (orderedEntryIdsRef.current) {
      orderedEntryIdsRef.current.value = JSON.stringify(
        nextItems.map((item) => item.id),
      );
    }

    queueMicrotask(() => {
      formRef.current?.requestSubmit();
    });
  }

  return (
    <>
      {state.status && statusLabels[state.status] ? (
        <Toast variant="error">{statusLabels[state.status]}</Toast>
      ) : null}

      <form action={formAction} ref={formRef}>
        <input
          name="orderedEntryIds"
          ref={orderedEntryIdsRef}
          type="hidden"
          value={JSON.stringify(orderedItems.map((item) => item.id))}
          readOnly
        />
      </form>

      <DndContext
        collisionDetection={closestCenter}
        id="game-waitlist-sortable"
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <SortableContext
          items={orderedItems.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="mt-4 grid gap-3">
            {orderedItems.map((item) => (
              <SortableWaitlistItem
                dragHandleLabel={dragHandleLabel}
                item={item}
                key={item.id}
                removeAction={removeAction.bind(null, item.id)}
                removeLabel={removeLabel}
                statusLabels={statusLabels}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}

function SortableWaitlistItem({
  dragHandleLabel,
  item,
  removeAction,
  removeLabel,
  statusLabels,
}: {
  dragHandleLabel: string;
  item: WaitlistItem;
  removeAction: (
    previousState: GameActionState,
    formData: FormData,
  ) => Promise<GameActionState>;
  removeLabel: string;
  statusLabels: Partial<Record<GameActionStatus, string>>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ disabled: isDeleting, id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      aria-label={dragHandleLabel}
      aria-busy={isDeleting}
      className={cx(
        "flex min-h-14 touch-none cursor-grab items-center justify-between gap-3 border-b border-[#dde2ea] py-3 active:cursor-grabbing",
        isDeleting && "pointer-events-none cursor-not-allowed opacity-60",
        isDragging && "z-10 rounded-xl border bg-white px-3 opacity-90 shadow-[0_8px_24px_rgba(16,24,40,0.14)]",
      )}
      ref={setNodeRef}
      style={style}
    >
      <div
        className="flex min-w-0 flex-1 items-center gap-3"
        {...attributes}
        {...listeners}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <InitialsAvatar name={item.name} />
          <p className="min-w-0 text-sm font-semibold text-[#101828] break-words">
            {item.name}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="min-h-11 shrink-0 rounded-[10px] px-3 py-2 text-sm font-semibold text-[#667085]"
          title={dragHandleLabel}
        >
          ⋮⋮
        </span>
      </div>

      <AdminRemovePlayerButton
        action={removeAction}
        label={removeLabel}
        onPendingChange={setIsDeleting}
        statusLabels={statusLabels}
      />
    </li>
  );
}
