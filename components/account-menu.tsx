"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { logOut } from "@/app/dashboard/actions";
import { ProfileForm } from "@/components/profile-form";
import { PushNotificationControls } from "@/components/push-notification-controls";
import { Button, SubmitButton } from "@/components/ui/button";
import { cx, pressedSurfaceClassName } from "@/components/ui/class-name";
import { Modal } from "@/components/ui/modal";

type AccountMenuProps = {
  avatarPath: string;
  avatarUrl: string;
  firstName: string;
  initials: string;
  isAdmin: boolean;
  label: string;
  lastName: string;
  publicVapidKey: string;
  userId: string;
};

export function AccountMenu({
  avatarPath,
  avatarUrl,
  firstName,
  initials,
  isAdmin,
  label,
  lastName,
  publicVapidKey,
  userId,
}: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const accountT = useTranslations("AccountMenu");
  const profileT = useTranslations("ProfilePage");

  return (
    <>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={accountT("openProfile", { name: label })}
        onClick={() => setIsOpen(true)}
        className={cx(
          pressedSurfaceClassName,
          "flex size-11 items-center justify-center rounded-full border border-[#dde2ea] bg-white text-sm font-bold text-[#061b6b] shadow-sm transition hover:border-[#0737a8] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0737a8]/20 active:translate-y-px",
        )}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="size-full rounded-full object-cover"
            src={avatarUrl}
          />
        ) : (
          initials
        )}
      </button>

      <Modal
        onClose={() => setIsOpen(false)}
        open={isOpen}
        title={profileT("title")}
      >
        <div className="mt-6 space-y-4">
          <ProfileForm
            avatarPath={avatarPath}
            avatarUrl={avatarUrl}
            firstName={firstName}
            lastName={lastName}
            onSaved={() => setIsOpen(false)}
            userId={userId}
          />
          <PushNotificationControls
            isAdmin={isAdmin}
            labels={{
              denied: profileT("notificationsDenied"),
              disabled: profileT("notificationsDisabled"),
              enable: profileT("notificationsEnableButton"),
              enabled: profileT("notificationsEnabled"),
              notSupported: profileT("notificationsNotSupported"),
              saveError: profileT("notificationsSaveError"),
              saved: profileT("notificationsSaved"),
              sendError: profileT("notificationsSendError"),
              sent: profileT("notificationsSent"),
              test: profileT("notificationsTestButton"),
              title: profileT("notificationsTitle"),
            }}
            publicKey={publicVapidKey}
          />
          <Button
            fullWidth
            onClick={() => setIsLogoutConfirmOpen(true)}
            type="button"
            variant="dangerOutline"
          >
            {accountT("signOut")}
          </Button>
        </div>
      </Modal>

      <Modal
        onClose={() => setIsLogoutConfirmOpen(false)}
        open={isLogoutConfirmOpen}
        title={accountT("confirmLogoutTitle")}
      >
        <div className="mt-6 space-y-5">
          <p className="text-base leading-7 text-[#667085]">
            {accountT("confirmLogoutMessage")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              onClick={() => setIsLogoutConfirmOpen(false)}
              type="button"
              variant="outline"
            >
              {accountT("cancelLogout")}
            </Button>
            <form action={logOut}>
              <SubmitButton fullWidth variant="dangerOutline">
                {accountT("confirmLogoutButton")}
              </SubmitButton>
            </form>
          </div>
        </div>
      </Modal>
    </>
  );
}
