"use client";

import { useActionState } from "react";
import { updateEmailNotifications } from "@/app/profile/actions";
import { SubmitButton } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";

type EmailNotificationControlsProps = {
  enabled: boolean;
  labels: {
    disable: string;
    disabled: string;
    enable: string;
    enabled: string;
    error: string;
    saved: string;
    title: string;
  };
};

const initialState: { success?: boolean; error?: string } = {};

export function EmailNotificationControls({
  enabled,
  labels,
}: EmailNotificationControlsProps) {
  const [state, formAction, pending] = useActionState(
    updateEmailNotifications,
    initialState,
  );

  return (
    <section className="rounded-xl border border-[#dde2ea] p-4">
      {state.error ? (
        <Toast variant="error">{labels.error}</Toast>
      ) : state.success ? (
        <Toast variant="success">{labels.saved}</Toast>
      ) : null}

      <h3 className="font-matchday text-base leading-6 font-bold text-[#061b6b]">
        {labels.title}
      </h3>
      <p className="mt-1 text-sm leading-6 text-[#667085]">
        {enabled ? labels.enabled : labels.disabled}
      </p>

      <form action={formAction} className="mt-3">
        <input
          name="emailNotificationsEnabled"
          type="hidden"
          value={enabled ? "false" : "true"}
        />
        <SubmitButton
          disabled={pending}
          size="compact"
          variant={enabled ? "outline" : "primary"}
        >
          {enabled ? labels.disable : labels.enable}
        </SubmitButton>
      </form>
    </section>
  );
}